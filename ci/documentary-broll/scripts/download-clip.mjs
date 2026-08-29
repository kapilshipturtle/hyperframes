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

import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
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
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} exited ${r.status}: ${r.stderr?.slice(-800) ?? ""}`);
  }
  return r.stdout;
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

async function processVideo({ chosen, beatId, targetDuration, brollDir, grade }) {
  const gradeFilter = grade && GRADE_PRESETS[grade] ? `,${GRADE_PRESETS[grade]}` : "";
  const rawPath = join(brollDir, `beat-${beatId}-raw.mp4`);
  const outPath = join(brollDir, `beat-${beatId}.mp4`);
  const outRel = `.media/broll/beat-${beatId}.mp4`;

  if (existsSync(outPath) && statSync(outPath).size > 0) {
    console.log(`✓ download-clip: beat-${beatId} [video] already processed → ${outRel} (skip)`);
    return;
  }

  if (!existsSync(rawPath) || statSync(rawPath).size === 0) {
    await download(chosen.downloadUrl, rawPath);
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
    // Clip is shorter than the beat — loop it rather than silently freeze-framing.
    const loops = Math.ceil(targetDuration / sourceDuration);
    run("ffmpeg", [
      "-y", "-v", "error",
      "-stream_loop", String(loops - 1),
      "-i", rawPath,
      "-t", String(targetDuration.toFixed(3)),
      "-an", // strip source audio — narration/BGM own the audio track
      "-vf", `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080${gradeFilter}`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
      "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      outPath,
    ]);
    console.log(`✓ download-clip: beat-${beatId} [video] looped ${loops}x (source ${sourceDuration.toFixed(1)}s < target ${targetDuration}s)${grade ? ` [grade:${grade}]` : ""} → ${outRel}`);
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
    outPath,
  ]);

  console.log(`✓ download-clip: beat-${beatId} [video] trimmed [${offset.toFixed(1)}s, +${targetDuration}s]${grade ? ` [grade:${grade}]` : ""} → ${outRel}`);
}

async function processPhoto({ chosen, beatId, brollDir, grade }) {
  const gradeFilter = grade && GRADE_PRESETS[grade] ? `,${GRADE_PRESETS[grade]}` : "";
  const ext = (extname(new URL(chosen.downloadUrl).pathname) || ".jpg").toLowerCase();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
  const rawPath = join(brollDir, `beat-${beatId}-raw${safeExt}`);
  const outPath = join(brollDir, `beat-${beatId}.jpg`);
  const outRel = `.media/broll/beat-${beatId}.jpg`;

  if (existsSync(outPath) && statSync(outPath).size > 0) {
    console.log(`✓ download-clip: beat-${beatId} [photo] already processed → ${outRel} (skip)`);
    return;
  }

  if (!existsSync(rawPath) || statSync(rawPath).size === 0) {
    await download(chosen.downloadUrl, rawPath);
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

  if (!candidatePath || !beatId) {
    console.error("Usage: download-clip.mjs --candidate <path> --beat-id <id> --duration N --project <dir> [--grade warm|cool|desaturated|neutral] [--log <path>]");
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

  const brollDir = join(projectDir, ".media", "broll");
  mkdirSync(brollDir, { recursive: true });

  if (chosen.mediaType === "photo") {
    await processPhoto({ chosen, beatId, brollDir, grade });
  } else {
    await processVideo({ chosen, beatId, targetDuration, brollDir, grade });
  }

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
