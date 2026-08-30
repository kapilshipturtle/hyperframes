#!/usr/bin/env node
// replay-media-choices.mjs — deterministically REBUILD .media/broll/ from
// the per-beat candidate caches Step 3 already wrote, without re-running
// the search+ranking pass. Exists specifically for CI/cloud rendering (see
// SKILL.md's "Rendering in the cloud, free" section): local/agent runs
// commit `.hyperframes/broll/beat-<id>.json` (one small file per beat,
// written by fetch-clips.mjs — see that script's header) but NEVER
// `.media/broll/` itself (the raw downloaded footage — hundreds of MB to
// low GB PER VIDEO, unbounded growth, wrong thing to put in git).
//
// Source of truth: `.hyperframes/broll/beat-<id>.json`'s own `chosen` field
// — NOT `.hyperframes/media-choices.json`. media-choices.json only records
// the ~10-20% of beats where the orchestrator overrode fetch-clips.mjs's
// top-ranked candidate (it's a human-readable "why" annotation layer for
// those overrides, written by the orchestrator, not a replay source); most
// beats' `chosen` lives ONLY in that beat's own cached candidate file,
// already reflecting whatever the final pick was (override or not) — a real
// project's data confirmed this: media-choices.json covered 16 of 151
// beats, while every one of the 151 had its own beat-<id>.json with a
// correct, already-resolved `chosen`. Trying to replay from
// media-choices.json alone silently drops the other ~90% of beats.
//
// Two-tier resolution per beat, cheapest-first:
//   1. Try the CACHED chosen.downloadUrl directly (fast — no API call).
//      Provider CDN links are often long-lived (confirmed against a real
//      months-old Pexels link during this script's development), but are
//      not GUARANTEED stable indefinitely.
//   2. If that fails (404/expired/blocked), fall back to a fresh by-ID
//      lookup via the provider's OWN by-id endpoint (not a re-search, so no
//      risk of a different asset winning if the provider's search ranking
//      changed since the original run) — Pexels, Pixabay, and Openverse all
//      support this, confirmed against each real API.
//
// Usage:
//   node replay-media-choices.mjs --project <dir> [--log <path>]
//
// Reads:  <project>/.hyperframes/broll/beat-*.json, <project>/.hyperframes/beats.json
// Calls:  download-clip.mjs once per beat, same as Step 4 would live.
// Needs:  PEXELS_API_KEY and/or PIXABAY_API_KEY env vars ONLY as a fallback
//         for a beat whose cached downloadUrl no longer resolves (same env
//         contract as fetch-clips.mjs — only sources actually hit this path
//         need a key set). Openverse needs no key either way.
// Exit 0 = every beat resolved + downloaded. Exit 1 = any beat failed (a
// deleted/private source asset, a missing fallback API key, or an
// unsupported source for the fallback path) — printed per-beat, not
// swallowed, since a partial broll folder with silently-missing beats would
// fail much later and less clearly at assemble-index.mjs instead.

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { logIfRequested } from "./lib/run-log.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Fallback-only: fresh by-ID lookup when a cached downloadUrl no longer
// resolves. Mirrors fetch-clips.mjs's own field-mapping per provider so
// download-clip.mjs sees the same shape it would from a live Step 4 run.
async function resolvePexels(id, mediaType) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("cached downloadUrl failed and PEXELS_API_KEY not set — needed to re-resolve a pexels-sourced beat");
  const numericId = id.replace(/^pexels-[vp]/, "");
  if (mediaType === "photo") {
    const p = await fetchJson(`https://api.pexels.com/v1/photos/${numericId}`, { headers: { Authorization: key } });
    return p.src?.large2x ?? p.src?.original ?? p.src?.large;
  }
  const v = await fetchJson(`https://api.pexels.com/videos/videos/${numericId}`, { headers: { Authorization: key } });
  const files = (v.video_files ?? []).slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const hd = files.find((f) => (f.width ?? 0) >= 1280) ?? files[0];
  return hd?.link;
}

async function resolvePixabay(id, mediaType) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) throw new Error("cached downloadUrl failed and PIXABAY_API_KEY not set — needed to re-resolve a pixabay-sourced beat");
  const numericId = id.replace(/^pixabay-[vp]/, "");
  if (mediaType === "photo") {
    const data = await fetchJson(`https://pixabay.com/api/?key=${key}&id=${numericId}`);
    const p = data.hits?.[0];
    if (!p) throw new Error(`pixabay photo id ${numericId} not found (deleted/private?)`);
    return p.largeImageURL ?? p.webformatURL;
  }
  const data = await fetchJson(`https://pixabay.com/api/videos/?key=${key}&id=${numericId}`);
  const v = data.hits?.[0];
  if (!v) throw new Error(`pixabay video id ${numericId} not found (deleted/private?)`);
  const best = v.videos?.large ?? v.videos?.medium ?? v.videos?.small;
  return best?.url;
}

async function resolveOpenverse(id, mediaType) {
  if (mediaType !== "photo") throw new Error(`openverse is photo-only in fetch-clips.mjs, got mediaType "${mediaType}" — unexpected`);
  const uuid = id.replace(/^openverse-/, "");
  const p = await fetchJson(`https://api.openverse.org/v1/images/${uuid}/`);
  if (!p.url) throw new Error(`openverse id ${uuid} not found or has no resolvable url (deleted/private?)`);
  return p.url;
}

async function reResolve(source, id, mediaType) {
  if (source === "pexels") return resolvePexels(id, mediaType);
  if (source === "pixabay") return resolvePixabay(id, mediaType);
  if (source === "openverse") return resolveOpenverse(id, mediaType);
  throw new Error(`no by-ID fallback support for source "${source}" yet (only pexels/pixabay/openverse wired) — see this script's header`);
}

// A cheap HEAD (falling back to a short-range GET, since some CDNs reject
// HEAD) to check a cached downloadUrl still resolves, without downloading
// the whole asset just to test it.
async function urlStillWorks(url) {
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (head.ok) return true;
    if (head.status === 405) {
      // method not allowed — some CDNs only accept GET; do a tiny ranged GET instead
      const get = await fetch(url, { headers: { Range: "bytes=0-0" } });
      return get.ok;
    }
    return false;
  } catch {
    return false;
  }
}

// Real, cached-URL-first / by-ID-fallback resolution + download, shared by
// both a beat's primary asset AND its optional cutaway asset (see the
// cutaway-replay fix above) — extracted so both paths get identical
// staleness handling rather than two near-duplicate implementations.
async function downloadOneAsset({ asset, beatId, duration, projectDir, tmpDir }) {
  let downloadUrl = asset.downloadUrl;
  let usedFallback = false;
  const cachedStillWorks = downloadUrl ? await urlStillWorks(downloadUrl) : false;
  if (!cachedStillWorks) {
    downloadUrl = await reResolve(asset.source, asset.id, asset.mediaType);
    usedFallback = true;
  }
  if (!downloadUrl) throw new Error("no resolvable downloadUrl (asset may be deleted/private)");

  const candidatePath = join(tmpDir, `beat-${beatId}.json`);
  writeFileSync(candidatePath, JSON.stringify({
    chosen: {
      source: asset.source,
      id: asset.id,
      mediaType: asset.mediaType,
      downloadUrl,
    },
  }));

  const r = spawnSync("node", [
    join(here, "download-clip.mjs"),
    "--candidate", candidatePath,
    "--beat-id", beatId,
    "--duration", String(duration),
    "--project", projectDir,
  ], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`download-clip.mjs exited ${r.status}: ${(r.stderr || r.stdout || "").slice(-500)}`);
  console.log(r.stdout.trim());
  return { usedFallback };
}

async function main() {
  const argv = process.argv.slice(2);
  const projectDir = resolve(flag(argv, "project", "."));

  const brollCacheDir = join(projectDir, ".hyperframes", "broll");
  const beatsPath = join(projectDir, ".hyperframes", "beats.json");
  if (!existsSync(brollCacheDir)) {
    console.error(`✗ replay-media-choices: not found: ${brollCacheDir} (nothing to replay — was this project run through documentary-broll's Step 3 locally?)`);
    process.exit(1);
  }
  if (!existsSync(beatsPath)) {
    console.error(`✗ replay-media-choices: not found: ${beatsPath}`);
    process.exit(1);
  }

  const beats = JSON.parse(readFileSync(beatsPath, "utf8")).beats;
  const durationByBeat = new Map(beats.map((b) => [b.id, b.durationSeconds]));

  const cacheFiles = readdirSync(brollCacheDir).filter((f) => /^beat-.+\.json$/.test(f));
  if (cacheFiles.length === 0) {
    console.error(`✗ replay-media-choices: ${brollCacheDir} has no beat-*.json files`);
    process.exit(1);
  }

  const tmpDir = join(projectDir, ".hyperframes", ".replay-candidates");
  mkdirSync(tmpDir, { recursive: true });

  let failed = 0;
  let done = 0;
  let usedFallback = 0;

  for (const file of cacheFiles) {
    const beatId = file.replace(/^beat-/, "").replace(/\.json$/, "");
    const duration = durationByBeat.get(beatId);
    if (duration == null) {
      console.error(`✗ replay-media-choices: beat ${beatId} has a cached candidate file but no matching entry in beats.json — skipping`);
      failed++;
      continue;
    }

    const cache = JSON.parse(readFileSync(join(brollCacheDir, file), "utf8"));
    const chosen = cache.chosen;
    if (!chosen) {
      // A beat marked invented-scene in scene-choices.json never had a real
      // asset chosen — its candidate file legitimately has chosen: null.
      // Not an error; Step 5 builds that frame from visualIdea instead, and
      // this replay script has nothing to do for it.
      continue;
    }

    try {
      const result = await downloadOneAsset({ asset: chosen, beatId, duration, projectDir, tmpDir });
      if (result.usedFallback) usedFallback++;
      done++;
    } catch (e) {
      console.error(`✗ replay-media-choices: beat ${beatId} (${chosen.source}/${chosen.id}) failed: ${e.message}`);
      failed++;
      continue; // don't attempt the cutaway below if the PRIMARY asset itself failed — a missing primary is the harder failure to surface first
    }

    // craft-upgrade fix (real, confirmed gap): a beat's OPTIONAL cutaway
    // asset (Step 5's --cutaway-asset, per SKILL.md's E1/E11 guidance) had
    // NO replay path at all before this — it only ever existed as a locally
    // downloaded file with no cached record anywhere CI could rebuild it
    // from, so a committed frame referencing it (e.g. beat-10-cutaway.mp4)
    // silently broke on a real GitHub Actions render with a real
    // `missing_local_asset` lint failure. Fixed by recording the cutaway
    // choice as a `cutaway` field on the SAME beat-<id>.json cache file
    // (see SKILL.md Step 3/5) and replaying it here exactly like the
    // primary asset, just with a `<id>-cutaway` beat-id suffix so
    // download-clip.mjs (which only ever interpolates beatId into a
    // filename, no validation restricting it to a bare number — confirmed
    // by reading its own source) writes to beat-<id>-cutaway.mp4, matching
    // the filename build-frame.mjs's own --cutaway-asset flag already
    // expects.
    if (cache.cutaway) {
      try {
        const result = await downloadOneAsset({ asset: cache.cutaway, beatId: `${beatId}-cutaway`, duration, projectDir, tmpDir });
        if (result.usedFallback) usedFallback++;
      } catch (e) {
        console.error(`✗ replay-media-choices: beat ${beatId}'s cutaway (${cache.cutaway.source}/${cache.cutaway.id}) failed: ${e.message} — the beat's PRIMARY asset still downloaded fine; only the cutaway is missing.`);
        failed++;
      }
    }
  }

  rmSync(tmpDir, { recursive: true, force: true });

  const total = done + failed;
  console.log(`${failed === 0 ? "✓" : "✗"} replay-media-choices: ${done}/${total} beat(s) resolved${usedFallback ? ` (${usedFallback} via by-ID fallback, cached URL expired)` : ""}${failed ? `, ${failed} FAILED` : ""}`);
  logIfRequested(argv, "Cloud render — replay-media-choices", `${done}/${total} beat(s) resolved${failed ? `, ${failed} failed` : ""}`, {
    project: projectDir,
    "used fallback": usedFallback,
  });

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`✗ replay-media-choices: ${e.message}`);
  process.exit(1);
});
