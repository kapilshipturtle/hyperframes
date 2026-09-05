#!/usr/bin/env node
// apply-bed-to-render.mjs — closes the chunked-render gap: render-chunked.yml
// renders each chunk WITHOUT the whole-film music bed / ambience bed (a
// per-chunk bed would restart at every chunk seam), so after
// concat-chunked-renders.mjs this mixes the already-levelled, already-ducked
// bed (plan-bgm.mjs output) and/or the ambience bed UNDER the concatenated
// film's own audio, once, with the video stream copied untouched. Runs before
// normalize-mix.mjs. Idempotent by output path (never rewrites its input).
//
// Usage: node apply-bed-to-render.mjs --in final.mp4 --out final-with-bed.mp4 \
//          [--bgm assets/bgm/bed.mp3] [--ambience .hyperframes/cinematic-assets/ambience-bed.mp3 --ambience-volume 0.05] [--log <path>]
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { logIfRequested } from "./lib/run-log.mjs";
const flag = (argv, name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def; };
const argv = process.argv.slice(2);
const inPath = flag(argv, "in", null), outPath = flag(argv, "out", null);
const bgm = flag(argv, "bgm", null), amb = flag(argv, "ambience", null), ambVol = Number(flag(argv, "ambience-volume", "0.05"));
if (!inPath || !outPath || !existsSync(inPath)) { console.error("Usage: apply-bed-to-render.mjs --in <mp4> --out <mp4> [--bgm <mp3>] [--ambience <mp3> --ambience-volume 0.05]"); process.exit(1); }
const beds = [bgm && existsSync(bgm) ? { p: bgm, v: 1.0 } : null, amb && existsSync(amb) ? { p: amb, v: ambVol } : null].filter(Boolean);
if (!beds.length) { console.log("✓ apply-bed-to-render: no bed files given/found — nothing to mix (copying input)"); spawnSync("cp", [inPath, outPath]); process.exit(0); }
const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", inPath], { encoding: "utf8" }).stdout) || 0;
const inputs = ["-i", inPath]; let fc = ""; const labels = ["[0:a]"];
beds.forEach((b, k) => { inputs.push("-stream_loop", "-1", "-i", b.p); fc += `[${k + 1}:a]atrim=0:${dur.toFixed(2)},volume=${b.v}[b${k}];`; labels.push(`[b${k}]`); });
// ffmpeg 4.2 has no amix normalize= option and scales every input by 1/n — multiply back so the film's own audio keeps its level
fc += `${labels.join("")}amix=inputs=${labels.length}:duration=first,volume=${labels.length}[a]`;
const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", fc, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outPath], { encoding: "utf8" });
if (r.status !== 0) { console.error(`✗ apply-bed-to-render: ffmpeg failed: ${r.stderr.slice(-600)}`); process.exit(1); }
console.log(`✓ apply-bed-to-render: mixed ${beds.map((b) => b.p).join(" + ")} under ${inPath} (${dur.toFixed(1)}s, video stream copied) → ${outPath}`);
logIfRequested(argv, "chunked concat — apply-bed-to-render", `beds mixed under concatenated render`, { in: inPath, out: outPath, beds: beds.map((b) => `${b.p} @ ${b.v}`).join(", ") });
