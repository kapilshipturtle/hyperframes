#!/usr/bin/env node
// normalize-mix.mjs — two-pass EBU R128 loudness normalization on the final
// rendered MP4's audio, via ffmpeg's `loudnorm` filter. Runs AFTER render
// (Step 6), on the whole mixed-down audio (voice + SFX + BGM already
// combined) — this is the one place a single absolute target actually
// applies, since by then everything is one stream.
//
// This is an OPT-IN finishing pass (SKILL.md's "polish the mix?" run-shape
// question) — never silently applied. The orchestrator decides WHETHER to
// run it; the LUFS target itself is NOT a creative/emotional choice (it's
// what stops the destination platform from turning the whole video down or
// up against everyone else's normalized content), so it stays fixed at the
// real platform standard rather than "AI picks a mood-appropriate number."
// Default target matches YouTube's own normalization point (-14 LUFS
// integrated, -1 dBTP ceiling) since that's this skill's primary
// destination; override with --target-lufs / --true-peak for a different
// platform (see references/audio-mix.md for other platforms' numbers).
//
// Usage:
//   node normalize-mix.mjs --in renders/video.mp4 --out renders/video.mp4
//     [--target-lufs -14] [--true-peak -1] [--lra 11]
//
// (writing --out to the same path as --in is fine — this script renders to
// a temp file first, then swaps it in, so a failed run never corrupts the
// existing render.)

import { spawnSync } from "node:child_process";
import { existsSync, renameSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

function ffmpegMeasure(inPath, I, LRA, TP) {
  const args = [
    "-hide_banner",
    "-i", inPath,
    "-af", `loudnorm=I=${I}:LRA=${LRA}:TP=${TP}:print_format=json`,
    "-f", "null",
    "-",
  ];
  const res = spawnSync("ffmpeg", args, { encoding: "utf8" });
  // loudnorm's JSON stats print to stderr, not stdout.
  const out = res.stderr || "";
  const start = out.lastIndexOf("{");
  const end = out.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`normalize-mix: could not parse loudnorm measurement pass:\n${out.slice(-800)}`);
  }
  return JSON.parse(out.slice(start, end + 1));
}

function main() {
  const argv = process.argv.slice(2);
  const inPath = resolve(flag(argv, "in", null) || "");
  const outPath = resolve(flag(argv, "out", inPath));
  const I = Number(flag(argv, "target-lufs", "-14"));
  const TP = Number(flag(argv, "true-peak", "-1"));
  const LRA = Number(flag(argv, "lra", "11"));

  if (!inPath || !existsSync(inPath)) {
    console.error("Usage: normalize-mix.mjs --in <path.mp4> [--out <path.mp4>] [--target-lufs -14] [--true-peak -1] [--lra 11]");
    process.exit(1);
  }

  console.log(`→ normalize-mix: measuring ${inPath}...`);
  const measured = ffmpegMeasure(inPath, I, LRA, TP);
  console.log(`  measured: I=${measured.input_i} LRA=${measured.input_lra} TP=${measured.input_tp} thresh=${measured.input_thresh}`);

  const tmpOut = `${outPath}.normalize-tmp.mp4`;
  const filter =
    `loudnorm=I=${I}:LRA=${LRA}:TP=${TP}:linear=true` +
    `:measured_I=${measured.input_i}:measured_LRA=${measured.input_lra}` +
    `:measured_TP=${measured.input_tp}:measured_thresh=${measured.input_thresh}` +
    `:offset=${measured.target_offset}`;

  const args = [
    "-hide_banner", "-y",
    "-i", inPath,
    "-af", filter,
    "-c:v", "copy", // video stream is untouched — only the audio filter graph re-encodes
    "-c:a", "aac", "-b:a", "192k",
    tmpOut,
  ];
  const res = spawnSync("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (res.status !== 0) {
    if (existsSync(tmpOut)) unlinkSync(tmpOut);
    console.error(`✗ normalize-mix: ffmpeg apply pass failed:\n${(res.stderr || "").slice(-1500)}`);
    process.exit(1);
  }

  renameSync(tmpOut, outPath);
  console.log(`✓ normalize-mix: ${outPath} → target ${I} LUFS / ${TP} dBTP (was ${measured.input_i} LUFS)`);

  logIfRequested(argv, "Step 6 — normalize-mix", `Loudness normalized`, {
    "measured before": `${measured.input_i} LUFS / ${measured.input_tp} dBTP`,
    "target": `${I} LUFS / ${TP} dBTP`,
    out: outPath,
  });
}

main();
