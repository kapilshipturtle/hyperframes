#!/usr/bin/env node
// gen-cinematic-assets.mjs — generates the two Tier-1 "cinematic" assets this
// skill now ships as always-on defaults, PROCEDURALLY via ffmpeg — no
// external API call, no stock-asset dependency, no network fetch. Both
// outputs are deterministic given the same inputs (ffmpeg's `geq=random(1)`
// grain source is per-pixel-random WITHIN one render, but the render itself
// is a fixed, cached file once generated — the seek-safe/no-Math.random rule
// applies to browser-side GSAP/JS, not to a pre-baked video/audio asset the
// renderer just plays back like any other clip).
//
// Why these two specifically, and why always-on: real research into what
// separates AI-generated documentary video from professional documentary
// editing repeatedly flagged the SAME two gaps — (1) dead silence between
// narration lines instead of a continuous low-level ambience bed gluing the
// mix, and (2) flat, "raw stock clip" footage with no grain/texture layer
// unifying the whole video visually. Both are cheap, deterministic, and
// clearly net-positive — no reason to gate either behind a run-shape
// question the way a creative color-grade direction is.
//
// Usage:
//   node gen-cinematic-assets.mjs --out-dir .hyperframes/cinematic-assets \
//     --duration <total video seconds> [--force]
//
// Outputs (idempotent — skips regeneration if both already exist and
// --force wasn't passed, since these are identical every run and there's no
// reason to regenerate them beat-to-beat or run-to-run):
//   <out-dir>/ambience-bed.mp3   — a soft, filtered brown-noise loop at the
//                                   requested duration, meant to sit at
//                                   -25..-30dB under the whole mix (the
//                                   caller sets that volume when mounting it
//                                   as a BGM-lane track, this script only
//                                   generates the source file itself).
//   <out-dir>/grain-overlay.mp4  — a muted, SHORT (3s) monochrome film-grain
//                                   loop at 1920x1080, meant to be composited
//                                   as a full-bleed top layer at low opacity
//                                   with mix-blend-mode: overlay across the
//                                   WHOLE master timeline, natively looped
//                                   via <video loop> (never baked at full
//                                   video length — a full-length unique-noise
//                                   render is enormous; see genGrainOverlay's
//                                   own comment) — see SKILL.md Step 6.

import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};
const hasFlag = (argv, name) => argv.includes(`--${name}`);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`${cmd} exited ${r.status}: ${(r.stderr || "").slice(-800)}`);
  }
  return r.stdout;
}

function genAmbienceBed(outPath, durationSeconds) {
  // Brown noise (deeper/softer than white/pink) low-passed to a dull,
  // room-tone-like rumble, well below any narration/music frequency content
  // that matters — this is a "glue" bed, not a musical element. Rendered at
  // a moderate internal amplitude; the caller sets final playback volume
  // when mounting it (recommend -25 to -30dB / ~0.03-0.06 linear under
  // narration, per references/audio-mix.md's reasoning bands).
  run("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", `anoisesrc=color=brown:amplitude=0.06:duration=${durationSeconds}`,
    "-af", "lowpass=f=600,highpass=f=40,afade=t=in:st=0:d=1.5,afade=t=out:st=" + Math.max(0, durationSeconds - 1.5) + ":d=1.5",
    "-c:a", "libmp3lame", "-q:a", "3",
    outPath,
  ]);
}

// Grain is high-entropy per-pixel noise — baking the FULL video duration at
// real resolution produced a 146MB file for just 10s in initial testing
// (would be several GB for a real 4-8 minute video). Fixed by generating a
// SHORT loop once (a few seconds of unique noise) and letting the renderer
// loop it natively via <video loop> — same technique any tiling texture
// uses, and it's how film-grain plates are distributed in real post-
// production tooling (a short grain plate looped, never a full-length
// unique-noise render). A short loop is visually indistinguishable from a
// full-length one for a texture this fine-grained and fast-changing.
const GRAIN_LOOP_SECONDS = 3;

function genGrainOverlay(outPath) {
  // Lower internal resolution (960x540, nearest-neighbor upscaled to
  // 1920x1080) keeps both file size and encode time down — grain reads the
  // same at low-opacity overlay regardless of the exact per-pixel resolution
  // it was authored at. crf 28 (much higher/lossier than a normal footage
  // encode) is intentional: this is a texture layer meant to sit at very low
  // opacity, compression artifacts in the noise itself are invisible at
  // that opacity and the size savings are substantial.
  run("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", `color=c=black:s=640x360:d=${GRAIN_LOOP_SECONDS}:r=24`,
    "-vf", "geq=random(1)*255:128:128,hue=s=0,scale=1920:1080:flags=neighbor",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
    "-pix_fmt", "yuv420p", "-an",
    outPath,
  ]);
}

function main() {
  const argv = process.argv.slice(2);
  const outDir = resolve(flag(argv, "out-dir", ".hyperframes/cinematic-assets"));
  const duration = Number(flag(argv, "duration", null));
  const force = hasFlag(argv, "force");

  if (!duration || duration <= 0) {
    console.error("Usage: gen-cinematic-assets.mjs --out-dir <path> --duration <seconds> [--force]");
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  const ambiencePath = join(outDir, "ambience-bed.mp3");
  const grainPath = join(outDir, "grain-overlay.mp4");

  if (existsSync(ambiencePath) && !force) {
    console.log(`✓ gen-cinematic-assets: ambience-bed.mp3 already exists (skip; pass --force to regenerate) → ${ambiencePath}`);
  } else {
    genAmbienceBed(ambiencePath, duration);
    console.log(`✓ gen-cinematic-assets: generated ambience-bed.mp3 (${duration.toFixed(1)}s) → ${ambiencePath}`);
  }

  if (existsSync(grainPath) && !force) {
    console.log(`✓ gen-cinematic-assets: grain-overlay.mp4 already exists (skip; pass --force to regenerate) → ${grainPath}`);
  } else {
    genGrainOverlay(grainPath);
    console.log(`✓ gen-cinematic-assets: generated grain-overlay.mp4 (${GRAIN_LOOP_SECONDS}s loop, caller sets <video loop> for full-timeline coverage) → ${grainPath}`);
  }
}

main();
