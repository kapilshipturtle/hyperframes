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

// SCENE-CLASS ambience recipes (craft-upgrade pass, S1) — each is a
// DISTINCT procedural ffmpeg noise recipe, not a real field recording (no
// licensed/sourced audio asset dependency, matching this file's existing
// "no external API call, no stock-asset dependency" design exactly). The
// research's specific recommendation was real recorded nature ambience;
// this is the honest, buildable version available without a licensed SFX
// library — each recipe is chosen to sit in a genuinely different part of
// the spectrum/character space so scene changes are audibly, not just
// theoretically, distinct: `neutral` keeps the original brown-noise recipe
// unchanged (so every EXISTING call to genAmbienceBed with no sceneClass
// argument is byte-for-byte unaffected — see main()'s default below).
const AMBIENCE_RECIPES = {
  // The original recipe, unchanged — the safe default for any beat with no
  // stronger scene identity, or when no sceneClass semantic pass has run.
  neutral: {
    filterIn: "anoisesrc=color=brown:amplitude=0.06",
    af: "lowpass=f=600,highpass=f=40",
  },
  // Water/wetland: a brighter, higher-passed noise bed suggesting a
  // constant soft trickle/flow rather than a room's dull rumble — real
  // water ambience carries far more high-frequency content than room tone.
  water: {
    filterIn: "anoisesrc=color=pink:amplitude=0.05",
    af: "highpass=f=300,lowpass=f=3200",
  },
  // Wind/open air: brown noise with a slow amplitude tremolo (a wind gust
  // swells and recedes, it doesn't hold one constant level) — the one
  // recipe here using a MODULATED filter rather than a flat band-pass, to
  // read as moving air rather than a static drone.
  "wind-open": {
    filterIn: "anoisesrc=color=brown:amplitude=0.07",
    af: "lowpass=f=900,highpass=f=60,tremolo=f=0.12:d=0.35",
  },
  // Forest/wetland-day: a mid-band pink-noise bed, brighter than neutral
  // but narrower than water — suggests a general outdoor "alive" texture
  // (insects/leaves) without implying any specific identifiable sound this
  // procedural approach can't actually produce (no attempt at literal bird
  // calls — that would need real sourced audio, honestly out of scope here).
  forest: {
    filterIn: "anoisesrc=color=pink:amplitude=0.045",
    af: "highpass=f=500,lowpass=f=4500",
  },
  // Night/wetland-night: lower and narrower than the daytime forest bed —
  // a hushed, close, low-activity register for a nocturnal or somber beat.
  "wetland-night": {
    filterIn: "anoisesrc=color=brown:amplitude=0.045",
    af: "lowpass=f=450,highpass=f=50",
  },
  // Urban/machinery: white noise (the brightest/harshest of the three
  // ffmpeg noise colors) narrow-banded to a mid-range hum — the closest
  // this procedural approach can honestly get to "distant traffic/engine
  // drone" without a real recording.
  "urban-machinery": {
    filterIn: "anoisesrc=color=white:amplitude=0.03",
    af: "highpass=f=150,lowpass=f=1800",
  },
  // Interior/neutral-room: a tighter, quieter band than `neutral` — a
  // small enclosed room reads as LESS spectrally busy than an open
  // exterior bed, not more.
  interior: {
    filterIn: "anoisesrc=color=brown:amplitude=0.04",
    af: "lowpass=f=350,highpass=f=80",
  },
};

export const AMBIENCE_SCENE_CLASSES = Object.keys(AMBIENCE_RECIPES);

function genAmbienceBed(outPath, durationSeconds, sceneClass = "neutral") {
  const recipe = AMBIENCE_RECIPES[sceneClass];
  if (!recipe) {
    throw new Error(`gen-cinematic-assets: unknown ambience sceneClass "${sceneClass}" — use one of ${AMBIENCE_SCENE_CLASSES.join(", ")}`);
  }
  // Rendered at a moderate internal amplitude; the caller sets final
  // playback volume when mounting it (recommend -25 to -30dB / ~0.03-0.06
  // linear under narration, per references/audio-mix.md's reasoning bands)
  // — this is a "glue" bed, not a musical element, for every recipe here.
  run("ffmpeg", [
    "-y", "-v", "error",
    "-f", "lavfi", "-i", `${recipe.filterIn}:duration=${durationSeconds}`,
    "-af", `${recipe.af},afade=t=in:st=0:d=1.5,afade=t=out:st=` + Math.max(0, durationSeconds - 1.5) + ":d=1.5",
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
  // --scene-classes a,b,c: opt-in (craft-upgrade S1) — when passed, ALSO
  // generates one per-class ambience bed (used for the beat-by-beat
  // crossfading Step 5/6 wires — see inject-cinematic-layers.mjs's
  // --scene-ambience-dir). Omitting this flag entirely reproduces the
  // ORIGINAL single-bed behavior byte-for-byte (same recipe, same output
  // path, same log line) — this is intentionally additive, not a
  // behavior change to the existing default call in render.yml.
  const sceneClassesArg = flag(argv, "scene-classes", null);
  const sceneClasses = sceneClassesArg ? sceneClassesArg.split(",").map((s) => s.trim()).filter(Boolean) : [];

  if (!duration || duration <= 0) {
    console.error("Usage: gen-cinematic-assets.mjs --out-dir <path> --duration <seconds> [--force] [--scene-classes water,forest,...]");
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

  if (sceneClasses.length) {
    const badClass = sceneClasses.find((c) => !AMBIENCE_RECIPES[c]);
    if (badClass) {
      console.error(`✗ gen-cinematic-assets: unknown --scene-classes entry "${badClass}" — use one of ${AMBIENCE_SCENE_CLASSES.join(", ")}`);
      process.exit(1);
    }
    // Full-duration beds per class (not short loops) so a crossfade at any
    // point in the film has real, non-repeating material on both sides —
    // matches ambience-bed.mp3's own full-duration approach, not the grain
    // loop's short-loop approach (grain's per-pixel randomness makes a
    // short loop visually indistinguishable from full-length at low
    // opacity; a looped few-second AUDIO bed would audibly repeat and be
    // far more noticeable than looping grain ever is).
    const sceneDir = join(outDir, "scene-ambience");
    mkdirSync(sceneDir, { recursive: true });
    for (const cls of sceneClasses) {
      const p = join(sceneDir, `${cls}.mp3`);
      if (existsSync(p) && !force) {
        console.log(`✓ gen-cinematic-assets: scene-ambience/${cls}.mp3 already exists (skip) → ${p}`);
      } else {
        genAmbienceBed(p, duration, cls);
        console.log(`✓ gen-cinematic-assets: generated scene-ambience/${cls}.mp3 (${duration.toFixed(1)}s, "${cls}" recipe) → ${p}`);
      }
    }
  }
}

main();
