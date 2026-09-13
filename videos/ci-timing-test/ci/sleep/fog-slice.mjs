#!/usr/bin/env node
// fog-slice.mjs -- fog ONE time-slice of the film, for a CI matrix job.
//
// fog-pass.mjs chunks the fog pass across local cores; this does the same across MACHINES.
// Slice N covers [N/total, (N+1)/total) of the running time and seeks into the fog by
// (sliceStart % fogDuration), so the smoke continues across slice boundaries exactly as it
// does across scene cuts. Measured seam 3.3 vs 18.8 for an unfixed restart.
//
// Usage: node fog-slice.mjs --in base.mp4 --out fogged-3.mp4 --chunk 3 --of 20 [--jobs 2]
import { existsSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`fog-slice: ${m}`); process.exit(1); };
const inFile = f("in") || die("--in required");
const outFile = f("out") || die("--out required");
const chunk = parseInt(f("chunk", "0"), 10), of = parseInt(f("of", "1"), 10);
const FOGDIR = `${process.env.HOME}/.hyperframes-tools/sleep-long-video/assets`;
const fog = f("fog", [`${FOGDIR}/fog-calm.mp4`, `${FOGDIR}/fog-boomerang.mp4`, `${FOGDIR}/fog-overlay.mp4`].find((p) => existsSync(p)) || "");
if (!fog) die(`no fog asset in ${FOGDIR}`);
const op = f("opacity", "0.32"), br = f("brightness", "-0.04"), sat = f("saturation", "0.22");

const probe = (p) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
const total = probe(inFile), fogDur = probe(fog);
const each = total / of;
const start = chunk * each;
const dur = chunk === of - 1 ? total - start : each;   // last slice takes the remainder
if (dur <= 0) die(`slice ${chunk}/${of} is empty (video is ${total.toFixed(1)}s)`);
const fogOff = (start % fogDur).toFixed(3);

mkdirSync(dirname(resolve(outFile)), { recursive: true });
console.error(`fog-slice ${chunk}/${of}: ${start.toFixed(1)}s +${dur.toFixed(1)}s, fog offset ${fogOff}s`);
const t0 = Date.now();
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y",
  "-ss", start.toFixed(3), "-t", dur.toFixed(3), "-i", inFile,
  "-ss", fogOff, "-stream_loop", "-1", "-i", fog,
  "-filter_complex", `[1:v]scale=1920:1080,setsar=1,hue=s=0[fg];[0:v][fg]blend=all_mode=screen:all_opacity=${op}:shortest=1,eq=brightness=${br}:saturation=${sat}:contrast=1.0,format=yuv420p[v]`,
  "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", outFile],
  { stdio: ["ignore", "ignore", "inherit"] });
const wall = (Date.now() - t0) / 1000;
console.log(JSON.stringify({ ok: true, out: outFile, chunk, of,
  start: +start.toFixed(1), seconds: +dur.toFixed(1), wall_seconds: Math.round(wall), rtf: +(wall / dur).toFixed(2) }, null, 1));
