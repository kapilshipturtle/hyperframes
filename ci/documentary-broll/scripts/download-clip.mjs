#!/usr/bin/env node
// download-clip.mjs — download a chosen stock asset (video OR photo) and
// prepare it for the beat window. One asset per call, deterministic naming by
// beat id so re-runs are idempotent (skips re-download/re-process if the
// output already exists — token- and bandwidth-lean on retries).
//
// Usage:
//   node download-clip.mjs --candidate ./.broll/beat-04.json --beat-id 04 \
//     --duration 6.2 --project ./videos/my-doc
//
// Video candidate → <project>/.media/broll/beat-04.mp4 (trimmed/looped, muted, H.264, matches beat duration)
// Photo candidate → <project>/.media/broll/beat-04.jpg (downloaded, letterboxed to 1920x1080)
// Prints: one line — the relative path + media type, or an error.

import { existsSync, mkdirSync, readFileSync, statSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

// Optional, opt-in color-consistency pass (SKILL.md's "color grading?"
// run-shape question — off unless asked). Stock footage from different
// providers/shoots rarely matches in exposure/white-balance; a LIGHT,
// restrained correction here (not a heavy creative LUT — see the playbook's
// "LUT overdose" warning) evens that out so a cut between two different
// sources doesn't read as visibly mismatched. Direction is picked ONCE per
// video by the orchestrator reading the whole script's overall tone (never
// per-beat — a shifting tint between beats reads as inconsistent, not
// professional; see references/color-grade.md), then applied identically to
// every clip via this one flag.
//
// Each preset is a restrained ffmpeg eq/colorbalance fragment — contrast and
// saturation nudges stay small (never the aggressive swing a LUT applies at
// full strength), matching the "~60% LUT strength" moderation principle.
export const GRADE_PRESETS = {
  warm: "eq=contrast=1.04:saturation=1.06,colorbalance=rm=0.04:gm=0.01:bm=-0.04",
  cool: "eq=contrast=1.04:saturation=0.98,colorbalance=rm=-0.04:gm=0.0:bm=0.05",
  desaturated: "eq=contrast=1.06:saturation=0.82:brightness=-0.01",
  neutral: "eq=contrast=1.03:saturation=1.0",
  // craft-upgrade K3: two new presets, same restrained "~60% LUT strength"
  // moderation as the original four — small nudges, never a heavy creative
  // swing.
  //
  // verdant — a lean toward green/growth, distinct from `warm` (amber/gold,
  // a human-interest lean, not a landscape one) and `cool` (blue, clinical/
  // analytical). Real documentary convention for nature/ecological/
  // environmental subject matter — a wetland, forest, or agricultural film's
  // footage already skews green; this leans into that rather than fighting
  // it with a neutral or warm grade that would read as correcting the
  // footage's own genuine color, not stylizing it.
  verdant: "eq=contrast=1.03:saturation=1.05,colorbalance=gm=0.05:gs=0.03:bs=-0.02",
  // bleached — stark, high-key, pulled toward white, DISTINCT from
  // `desaturated` (which pulls back saturation AND darkens slightly, for a
  // somber/weighty register). `bleached` pulls saturation back too but lifts
  // brightness/contrast instead of dropping them — the real documentary
  // convention for exposé/investigative/clinical-institutional content
  // (courtroom footage, official records, a "cold hard facts" register) —
  // reads as stark and exposed, not somber and dim.
  bleached: "eq=contrast=1.1:saturation=0.7:brightness=0.03",
  // craft-upgrade P4c: real curve-based grading via ffmpeg's actual curves
  // filter (verified against real ffmpeg — a curves fragment applies
  // cleanly), not another eq/colorbalance-only fragment — a classic filmic
  // S-curve (mild lifted blacks, gentle highlight rolloff) reads as a real
  // "shot on film" tonal response, a genuinely different mechanism than the
  // other 6 presets' brightness/contrast/saturation-only approach. Kept to
  // ONE curve-based preset (not several) — this skill's own established
  // discipline is a curated, restrained option set, and a curves-heavy
  // menu risks the same "too many choices" problem the overlay archetype
  // system deliberately designs against elsewhere.
  filmic: "curves=master='0/0.03 0.25/0.22 0.5/0.5 0.75/0.8 1/0.97'",
};

// craft-upgrade P6a/P6g: optional, SEPARATE optical-effect presets — a
// genuinely different category from GRADE_PRESETS above (a grade shifts
// color/tone consistently across the whole frame; an effect is a distinct
// optical phenomenon — RGB channel misalignment, a film-stock treatment —
// not a color direction). Chained in the SAME linear -vf pipeline as
// --grade/--lut (verified against real ffmpeg — an rgbashift fragment
// chains cleanly after scale/crop/grade with no issues).
//
// SCOPE NOTE, checked before building: glow/bloom (P6d) and halation (P6f)
// are real ffmpeg-buildable phenomena, but ONLY via a split/blur/screen-
// blend GRAPH (-filter_complex), not a plain linear filter chain — verified
// this is a real architectural boundary, the same one that ruled out
// blending a --lut at partial strength (see lutFilterFragment's own
// comment). This file's entire existing pipeline is deliberately a single
// linear -vf chain; adding -filter_complex support would be a real
// structural change to a mature, working encode path for two effects, not
// a small additive flag — deliberately NOT built this pass. Chromatic
// aberration (rgbashift) and the archival treatment (grain+vignette-
// adjacent techniques already proven elsewhere in this skill, no split/
// blend needed) ARE real plain-filter-chain effects, so those are built.
export const EFFECT_PRESETS = {
  // Slow-motion (retention-explainer profiles, measured 1-3 % of shots on the
  // analysed channels): half speed via setpts + constant 30 fps (frames are
  // duplicated — no optical-flow interpolation, which is 50x slower and not
  // what these channels use either). The beat still trims to its exact
  // duration afterwards, so a 4 s beat shows the clip's first 2 s slowed.
  "slow-motion": "setpts=2.0*PTS,fps=30",
  // Speed ramp: normal speed for the first ~40 %, then eases into half speed
  // (a single setpts expression; the moment the ramp starts is the emphasis).
  "speed-ramp": "setpts='if(lt(T,1.5),PTS,PTS+(T-1.5)/TB)',fps=30",
  // Chromatic aberration — real RGB channel misalignment via rgbashift,
  // verified against real ffmpeg. Deliberately SUBTLE (single-digit pixel
  // shift) — a heavy-handed version reads as a rendering bug, not a lens
  // characteristic; this is a rare, deliberate accent (same tier as
  // --vignette), never a default.
  "chromatic-aberration": "rgbashift=rh=2:bh=-2",
  // Archival — a real, distinct treatment for footage meant to read as old/
  // degraded/found-footage: desaturation + a slight warm/sepia cast + mild
  // contrast crush (the flattened-blacks look of aged film stock), built
  // from the same eq/colorbalance mechanism GRADE_PRESETS already uses, not
  // a new capability — kept as a separate effect (not folded into
  // GRADE_PRESETS) because it's a genuine STOCK-TREATMENT choice, not a
  // color-consistency-across-clips choice, and mixing the two concepts in
  // one preset list would blur that real distinction.
  archival: "eq=contrast=0.88:saturation=0.55:brightness=-0.02,colorbalance=rm=0.06:gm=0.02:bm=-0.08",
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} exited ${r.status}: ${r.stderr?.slice(-800) ?? ""}`);
  }
  return r.stdout;
}

// Real, cheap file-validity check — a genuine, confirmed bug fix: a file
// that survived a mid-write kill (an OOM, a laptop crash, any process that
// dies mid-ffmpeg-encode) has real bytes and a nonzero size, but the
// container's own moov atom (MP4) or end-of-image marker (JPEG/PNG) never
// got finalized, making it unplayable/undecodable. The previous check here
// was `size > 0`, which a corrupted file like this genuinely passes. This
// is the exact failure class that silently poisoned a real run: 27/38
// downloaded clips were corrupted by an OOM crash, then WRONGLY treated as
// "already processed, skip" by the old size-only check on the next
// attempt, requiring a full manual detour (a chain of false leads through
// probe-motion.mjs before the real cause was found) to diagnose.
//
// Method: `-sseof -1` seeks to 1 second before EOF, forcing ffmpeg to
// genuinely need the file's own index/end-marker to complete the seek, then
// decodes exactly 1 frame — real, reproducible testing confirmed this
// rejects both a moov-atom-less MP4 (a real kill -9 mid-encode reproduction:
// "moov atom not found", exit 1) and a truncated JPEG (exit 1), while
// passing both genuinely complete files (exit 0) — and does so at
// header-probe speed (~0.03s), NOT full-file-decode speed (~5x slower),
// since seeking near the end still short-circuits before decoding the
// whole file. Works identically for both media types with one command, so
// both processVideo and processPhoto call the same check.
function isValidMediaFile(path) {
  if (!existsSync(path) || statSync(path).size === 0) return false;
  const r = spawnSync("ffmpeg", ["-v", "error", "-sseof", "-1", "-i", path, "-frames:v", "1", "-f", "null", "-"], { encoding: "utf8" });
  return r.status === 0;
}

// 3 attempts, short backoff — CI runners doing many concurrent/sequential
// downloads against a stock-provider CDN see real, transient connection
// failures under load (confirmed: a real CI run had "fetch failed" — Node's
// native fetch's own generic wrapper around a lower-level connection error —
// on 7/151 beats, all pexels.com, no pattern pointing at a single bad URL).
// Retrying handles the transient case; the real underlying cause (err.cause)
// is now surfaced in the thrown error either way, instead of the previous
// bare "fetch failed" which gave zero diagnostic signal.
async function download(url, destPath, attempts = 3) {
  let lastErr;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed: ${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const fs = await import("node:fs/promises");
      await fs.writeFile(destPath, buf);
      return;
    } catch (e) {
      // Node's native fetch throws a generic "TypeError: fetch failed" for
      // any underlying connection failure (DNS, TLS, reset, timeout) — the
      // real reason lives in e.cause, which the original version of this
      // function never read, so every real cause showed up identically as
      // the useless bare string "fetch failed" in logs.
      const cause = e?.cause ? ` (cause: ${e.cause.code ?? e.cause.message ?? e.cause})` : "";
      lastErr = new Error(`${e.message}${cause}`);
      if (i < attempts) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

// craft-upgrade P4a: real .cube LUT support via ffmpeg's real lut3d filter
// (verified against an actual minimal 2x2x2 .cube file — loads and applies
// cleanly). Chained in the SAME linear -vf pipeline as the existing
// GRADE_PRESETS fragment (not a split/blend graph — that would need
// -filter_complex, a bigger structural change to this file's existing
// single -vf pipeline for real added risk with no clear benefit over just
// applying the LUT at its own native strength, which is how most real NLE
// "apply this LUT" workflows already work). A supplied LUT is genuinely the
// user's own creative choice (their own graded look, not one of this
// skill's own restrained presets) — it is NOT capped/moderated the way
// GRADE_PRESETS deliberately are, because a LUT is an intentional external
// asset, not a default this skill is picking for the user.
function lutFilterFragment(lutPath) {
  if (!lutPath) return "";
  if (!existsSync(lutPath)) {
    throw new Error(`--lut file not found: ${lutPath}`);
  }
  if (extname(lutPath).toLowerCase() !== ".cube") {
    throw new Error(`--lut "${lutPath}" doesn't look like a .cube file (lut3d needs a real .cube LUT, not an arbitrary image/preset file)`);
  }
  // ffmpeg's lut3d filter parses its own file= argument with ':' as a
  // sub-option separator, so a raw path containing ':' would break parsing
  // — escape it the same way ffmpeg's own docs specify.
  return `,lut3d=file='${lutPath.replace(/:/g, "\\:")}'`;
}

async function processVideo({ chosen, beatId, targetDuration, brollDir, grade, freeze, lut, effect }) {
  const gradeFilter = (grade && GRADE_PRESETS[grade] ? `,${GRADE_PRESETS[grade]}` : "") + lutFilterFragment(lut) + (effect && EFFECT_PRESETS[effect] ? `,${EFFECT_PRESETS[effect]}` : "");
  const rawPath = join(brollDir, `beat-${beatId}-raw.mp4`);
  const outPath = join(brollDir, `beat-${beatId}.mp4`);
  const outRel = `.media/broll/beat-${beatId}.mp4`;

  if (isValidMediaFile(outPath)) {
    console.log(`✓ download-clip: beat-${beatId} [video] already processed → ${outRel} (skip)`);
    return;
  }
  // A file that exists but fails the real validity check (a moov-atom-less
  // corrupt output from a prior interrupted encode) must NOT be trusted as
  // partial/resumable progress — delete it so the encode below starts clean,
  // rather than risk ffmpeg's own behavior on an already-broken output path.
  if (existsSync(outPath)) rmSync(outPath);

  // Stale-raw guard (a real re-run bug): a leftover beat-NN-raw.mp4 from a
  // DIFFERENT candidate was silently reused when the chosen clip changed. The
  // raw's source URL is recorded in a sidecar; a mismatch deletes the raw (and
  // any processed output) so the new choice is actually downloaded.
  const urlSidecar = `${rawPath}.url`;
  if (existsSync(rawPath) && existsSync(urlSidecar) && readFileSync(urlSidecar, "utf8").trim() !== String(chosen.downloadUrl)) {
    console.log(`  ↻ download-clip: beat-${beatId} raw belongs to a different candidate — re-downloading`);
    rmSync(rawPath); if (existsSync(outPath)) rmSync(outPath);
  }
  if (!existsSync(rawPath) || statSync(rawPath).size === 0) {
    await download(chosen.downloadUrl, rawPath);
    writeFileSync(urlSidecar, String(chosen.downloadUrl));
  }

  // THE actual root cause behind 3 failed "fix the render step" attempts in
  // CI (VIDEO_SOURCE_UNRENDERABLE at --workers auto, VIDEO_EXTRACTION_FAILED
  // at --workers 3/2 with --docker, VIDEO_EXTRACTION_FAILED again at
  // --workers 1 with no --docker) turned out to be HERE, not in render's own
  // concurrency flags — every one of those attempts was chasing a symptom.
  // Neither ffmpeg call below originally set -g/-keyint_min, so libx264's
  // default GOP sizing (often several seconds between keyframes with
  // -preset veryfast on short/simple stock clips) produced exactly what
  // hyperframes render's OWN compiler warning describes on ~half this
  // project's 105 video sources: "sparse keyframes... causes seek failures
  // and frame freezing" — with the exact fix command spelled out in that
  // warning. Frame-accurate seeking during extraction has to decode forward
  // from the nearest PRIOR keyframe; a sparse GOP makes that decode step
  // slow enough to trip ffmpeg's own extraction timeout, independent of how
  // many workers are running or whether it's inside a container — which is
  // exactly why lowering --workers and adding --docker never fixed it.
  // -g 30 -keyint_min 30 -sc_threshold 0 forces a keyframe every 30 frames
  // (1s at 30fps) with no scene-cut-triggered deviation, so every seek
  // target is at most ~1s from its nearest keyframe.

  // Probe actual source duration — trust ffprobe over the API's reported value.
  const probeOut = run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    rawPath,
  ]);
  const sourceDuration = parseFloat(probeOut.trim());
  if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
    throw new Error(`could not probe duration of ${rawPath}`);
  }

  if (sourceDuration < targetDuration - 0.15) {
    // Clip is shorter than the beat — LOOP by default (re-plays the source
    // from the start, so any real motion in it keeps moving, just repeats).
    // craft-upgrade P3a: `freeze` is a real, opt-in ALTERNATIVE — hold the
    // clip's own LAST decoded frame for the remaining time instead of
    // looping, via ffmpeg's real tpad=stop_mode=clone filter (verified via
    // an actual frame-difference measurement: two frames 1.7s apart inside
    // the padded region differ by YAVG=0.001, essentially zero — a real,
    // confirmed freeze, not a guess at tpad's behavior). This is the
    // documentary "hold on the moment" convention — reserve it for a beat
    // whose short clip's LAST frame is itself a meaningful image to dwell
    // on (a landscape settling, a final expression) — a clip whose motion
    // is still clearly mid-action at its own end will freeze on an
    // arbitrary, sometimes awkward mid-motion frame, so this is a per-beat
    // editorial call, not a blanket default.
    const padFilter = freeze ? `,tpad=stop_mode=clone:stop_duration=${(targetDuration - sourceDuration).toFixed(3)}` : "";
    const loops = freeze ? 1 : Math.ceil(targetDuration / sourceDuration);
    run("ffmpeg", [
      "-y", "-v", "error",
      ...(freeze ? [] : ["-stream_loop", String(loops - 1)]),
      "-i", rawPath,
      "-t", String(targetDuration.toFixed(3)),
      "-an", // strip source audio — narration/BGM own the audio track
      "-vf", `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080${padFilter}${gradeFilter}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
      "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      // Force SDR/BT.709 color tags on every re-encode. Some Pexels source
      // clips carry BT.2020/HLG color metadata in their container; ffmpeg
      // passes that through by default even though -pix_fmt yuv420p already
      // makes the actual samples 8-bit SDR. hyperframes render trusts the
      // container tag at probe time, not the pixel data, so one stray-tagged
      // clip flips nativeHdrVideoCount>0 for the WHOLE composition and forces
      // every frame onto the ~2.4s/frame HDR layered-composite capture path
      // (confirmed via a real CI run: nativeHdrVideoCount:1, effectiveHdr:hlg,
      // projected ~18h total — this, not the grain overlay, was the actual
      // bottleneck all along). Stamping bt709 here makes the tags match the
      // real 8-bit content so probing correctly reports SDR.
      "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
      outPath,
    ]);
    console.log(`✓ download-clip: beat-${beatId} [video] ${freeze ? `frozen on last frame (source ${sourceDuration.toFixed(1)}s < target ${targetDuration}s)` : `looped ${loops}x (source ${sourceDuration.toFixed(1)}s < target ${targetDuration}s)`}${grade ? ` [grade:${grade}]` : ""} → ${outRel}`);
    return;
  }

  // Normal case: trim from a random-ish safe offset (avoid the very first/last
  // second, which is often a fade or logo bumper on stock clips) so the used
  // slice reads as mid-action rather than a soft open. Deterministic: derived
  // from the beat id and duration, never Math.random (repeatable renders).
  const maxOffset = Math.max(0, sourceDuration - targetDuration - 0.3);
  const seed = beatId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const offset = maxOffset > 0.5 ? (seed % Math.floor(maxOffset * 10)) / 10 : 0;

  run("ffmpeg", [
    "-y", "-v", "error",
    "-ss", offset.toFixed(2),
    "-i", rawPath,
    "-t", targetDuration.toFixed(3),
    "-an",
    "-vf", `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080${gradeFilter}`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
    "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    // Force SDR/BT.709 color tags — see the matching comment on the loop
    // branch above for why this exists (a stray HDR container tag on one
    // source clip forces hyperframes render's whole-composition HDR path).
    "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
    outPath,
  ]);

  console.log(`✓ download-clip: beat-${beatId} [video] trimmed [${offset.toFixed(1)}s, +${targetDuration}s]${grade ? ` [grade:${grade}]` : ""} → ${outRel}`);
}

async function processPhoto({ chosen, beatId, brollDir, grade, lut, effect }) {
  const gradeFilter = (grade && GRADE_PRESETS[grade] ? `,${GRADE_PRESETS[grade]}` : "") + lutFilterFragment(lut) + (effect && EFFECT_PRESETS[effect] ? `,${EFFECT_PRESETS[effect]}` : "");
  const ext = (extname(new URL(chosen.downloadUrl).pathname) || ".jpg").toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
  const rawPath = join(brollDir, `beat-${beatId}-raw${safeExt}`);
  const outPath = join(brollDir, `beat-${beatId}.jpg`);
  const outRel = `.media/broll/beat-${beatId}.jpg`;

  if (isValidMediaFile(outPath)) {
    console.log(`✓ download-clip: beat-${beatId} [photo] already processed → ${outRel} (skip)`);
    return;
  }
  if (existsSync(outPath)) rmSync(outPath);

  // Stale-raw guard (a real re-run bug): a leftover beat-NN-raw.mp4 from a
  // DIFFERENT candidate was silently reused when the chosen clip changed. The
  // raw's source URL is recorded in a sidecar; a mismatch deletes the raw (and
  // any processed output) so the new choice is actually downloaded.
  const urlSidecar = `${rawPath}.url`;
  if (existsSync(rawPath) && existsSync(urlSidecar) && readFileSync(urlSidecar, "utf8").trim() !== String(chosen.downloadUrl)) {
    console.log(`  ↻ download-clip: beat-${beatId} raw belongs to a different candidate — re-downloading`);
    rmSync(rawPath); if (existsSync(outPath)) rmSync(outPath);
  }
  if (!existsSync(rawPath) || statSync(rawPath).size === 0) {
    await download(chosen.downloadUrl, rawPath);
    writeFileSync(urlSidecar, String(chosen.downloadUrl));
  }

  // Letterbox-crop to the canvas so every frame — video or photo — fills
  // 1920x1080 identically; the Ken Burns wrapper in build-frame.mjs assumes
  // a full-bleed source with no bars.
  run("ffmpeg", [
    "-y", "-v", "error",
    "-i", rawPath,
    "-vf", `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080${gradeFilter}`,
    "-frames:v", "1",
    outPath,
  ]);

  console.log(`✓ download-clip: beat-${beatId} [photo] processed${grade ? ` [grade:${grade}]` : ""} → ${outRel}`);
}

async function main() {
  const argv = process.argv.slice(2);
  const candidatePath = flag(argv, "candidate", null);
  const beatId = flag(argv, "beat-id", null);
  const targetDuration = Number(flag(argv, "duration", "5"));
  const projectDir = resolve(flag(argv, "project", "."));
  // Optional, opt-in per-video color-consistency preset (see GRADE_PRESETS
  // above) — the orchestrator picks ONE direction for the whole video and
  // passes it on every beat's download-clip.mjs call; omit for no grading.
  const grade = flag(argv, "grade", null);
  // craft-upgrade P3a: opt-in freeze-on-last-frame for short clips, instead
  // of the default loop — see processVideo's own comment for the real
  // tpad-based mechanism and when this is/isn't a good fit. Only meaningful
  // for a video whose source clip is shorter than the beat; a no-op
  // (silently ignored, not an error) for a photo or a video that's already
  // long enough.
  const freeze = argv.includes("--freeze");
  // craft-upgrade P4a: optional real .cube LUT, applied on top of --grade
  // (or on its own with no --grade) — see lutFilterFragment's own comment.
  const lut = flag(argv, "lut", null);
  // craft-upgrade P6a/P6g: optional real optical-effect preset — see
  // EFFECT_PRESETS' own comment for why this is a SEPARATE flag from
  // --grade (a different category of visual choice).
  const effect = flag(argv, "effect", null);

  if (!candidatePath || !beatId) {
    console.error("Usage: download-clip.mjs --candidate <path> --beat-id <id> --duration N --project <dir> [--grade warm|cool|desaturated|neutral|verdant|bleached|filmic] [--lut <path.cube>] [--effect chromatic-aberration|archival|slow-motion|speed-ramp] [--freeze] [--log <path>]");
    process.exit(1);
  }

  const payload = JSON.parse(readFileSync(candidatePath, "utf8"));
  const chosen = payload.chosen;
  if (!chosen) {
    console.error(`✗ download-clip: candidate file has no chosen asset for beat ${beatId}`);
    process.exit(2);
  }

  if (grade && !GRADE_PRESETS[grade]) {
    console.error(`✗ download-clip: unknown --grade "${grade}" (expected one of: ${Object.keys(GRADE_PRESETS).join(", ")})`);
    process.exit(1);
  }
  if (lut) {
    try {
      lutFilterFragment(lut); // fail fast on a bad --lut before any real work happens, same discipline as the --grade check above
    } catch (e) {
      console.error(`✗ download-clip: ${e.message}`);
      process.exit(1);
    }
  }
  if (effect && !EFFECT_PRESETS[effect]) {
    console.error(`✗ download-clip: unknown --effect "${effect}" (expected one of: ${Object.keys(EFFECT_PRESETS).join(", ")})`);
    process.exit(1);
  }

  const brollDir = join(projectDir, ".media", "broll");
  mkdirSync(brollDir, { recursive: true });

  if (chosen.mediaType === "photo") {
    await processPhoto({ chosen, beatId, brollDir, grade, lut, effect });
  } else {
    await processVideo({ chosen, beatId, targetDuration, brollDir, grade, freeze, lut, effect });
  }

  // Real fix for a genuine, confirmed gap: CREDITS.json was documented as
  // "the orchestrator appends after each successful download" (prose, no
  // script owns it) — a real run found it never actually gets written this
  // way (nobody's job to do it, so it silently doesn't exist), forcing a
  // manual reconstruction after the fact. Writing it HERE, inside the
  // script that already has every field on hand, removes the gap
  // entirely — no separate step to forget. Writes a per-beat file
  // (credit-<id>.json), NOT a shared, appended-to CREDITS.json directly —
  // this skill's own real concurrency guidance (SKILL.md Step 4) runs
  // several of these calls in parallel batches, and multiple processes
  // read-modify-writing the SAME shared JSON file is a genuine race/
  // corruption risk; each call owning its own uniquely-named file
  // sidesteps that entirely. A separate, cheap consolidation step (see
  // SKILL.md) merges these into the real CREDITS.json once every beat is
  // done — same "write your own file, merge later" pattern already
  // established elsewhere in this pipeline (invented-scene frames, per-
  // beat candidate JSONs).
  const creditPath = join(brollDir, `credit-${beatId}.json`);
  writeFileSync(creditPath, JSON.stringify({
    beatId,
    source: chosen.source,
    mediaType: chosen.mediaType,
    clipId: chosen.id,
    url: chosen.url ?? null,
    license: chosen.license ?? null,
    attributionRequired: chosen.attributionRequired ?? false,
    creditLine: chosen.creditLine ?? null,
  }, null, 2));

  logIfRequested(argv, "Step 4 — download-clip", `beat ${beatId}: downloaded/processed`, {
    mediaType: chosen.mediaType,
    source: `${chosen.source}/${chosen.id}`,
    grade: grade ?? "none",
    "output": chosen.mediaType === "photo" ? `.media/broll/beat-${beatId}.jpg` : `.media/broll/beat-${beatId}.mp4`,
  });
}

main().catch((e) => {
  console.error(`✗ download-clip: ${e.message}`);
  process.exit(1);
});
