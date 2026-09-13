#!/usr/bin/env node
// render-all.mjs -- crash-proof, resumable, load-balanced clip renderer.
//
// DESIGN RULES (each exists because of a real failure mode):
//  * RESUMABLE: a finished clip is never re-rendered. State lives in the OUTPUT FILES
//    themselves plus a manifest, so a killed process, a rebooted laptop or a cancelled CI
//    job loses at most one clip. Re-running the same command continues where it stopped.
//  * VALIDATED, NOT JUST PRESENT: an interrupted ffmpeg leaves a truncated .mp4 behind.
//    Every existing clip is ffprobe'd for real duration; anything short or unreadable is
//    deleted and re-rendered. "File exists" is NOT proof of completion.
//  * ATOMIC: each clip renders to <id>.part.mp4 and is renamed only after it validates,
//    so a crash can never leave a half-file that a later run trusts.
//  * LOAD BALANCED: work is split by SECONDS OF VIDEO, not by clip count -- a chunk of
//    three 110s scenes is 3x a chunk of three 35s ones. Greedy longest-first bin packing.
//  * RETRIES: ffmpeg is retried (default 2x) before a clip is declared failed; one bad
//    clip never kills the run. Failures are reported at the end with their ids.
//  * MEMORY/CPU SAFE: concurrency defaults to (cores-1, max 3). Each ffmpeg is nice'd.
//    Never fan out unbounded -- parallel encodes have frozen this laptop before.
//
// Usage:
//   node render-all.mjs --scenes scenes.json --images .media/scenes --out-dir clips \
//     --fog fog.png [--grain g.png] [--jobs N] [--chunk i --of n] [--retries 2] [--dry-run]
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { join, dirname } from "node:path";
import { cpus, freemem } from "node:os";

const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const die = (m) => { console.error(`render-all: ${m}`); process.exit(1); };

const scenesPath = f("scenes") || die("--scenes required");
const images = f("images") || die("--images required");
const outDir = f("out-dir") || die("--out-dir required");
const fog = f("fog", "");
const DEFAULT_FOG = `${process.env.HOME}/.hyperframes-tools/sleep-long-video/assets/fog-overlay.mp4`;
const fogLoop = has("no-fog") ? "" : f("fog-loop", existsSync(DEFAULT_FOG) ? DEFAULT_FOG : "");
if (!has("no-fog") && !fog && !fogLoop) die("no fog overlay: install one at ~/.hyperframes-tools/sleep-long-video/assets/fog-overlay.mp4 or pass --fog-loop");
const grain = f("grain", "");
const retries = parseInt(f("retries", "2"), 10);
const chunk = parseInt(f("chunk", "0"), 10), of = parseInt(f("of", "1"), 10);
const jobs = Math.max(1, Math.min(parseInt(f("jobs", String(Math.min(3, Math.max(1, cpus().length - 1)))), 10), 8));
const dry = has("dry-run");

const all = JSON.parse(readFileSync(scenesPath, "utf8"));
if (!Array.isArray(all) || !all.length) die("scenes file is empty");
mkdirSync(outDir, { recursive: true });
const manifest = join(outDir, "_manifest.json");

// ---- load balancing: split by seconds, not by count -------------------------------
function balance(scenes, n) {
  const bins = Array.from({ length: n }, () => ({ secs: 0, items: [] }));
  [...scenes].sort((a, b) => b.duration - a.duration).forEach((s) => {
    const b = bins.reduce((m, x) => (x.secs < m.secs ? x : m), bins[0]);
    b.items.push(s); b.secs += s.duration;
  });
  return bins;
}
const mine = of > 1 ? balance(all, of)[chunk].items.sort((a, b) => a.id.localeCompare(b.id)) : all;

// ---- validation: an existing file must be REAL and long enough ---------------------
function clipOk(p, want) {
  if (!existsSync(p)) return false;
  try {
    if (statSync(p).size < 10000) return false;
    const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
    return Number.isFinite(d) && d >= want - 1.0;   // truncated file = not ok
  } catch { return false; }
}

const todo = [], reused = [];
for (const s of mine) {
  const out = join(outDir, `${s.id}.mp4`);
  const part = join(outDir, `${s.id}.part.mp4`);
  if (existsSync(part)) rmSync(part, { force: true });          // crash leftover
  if (clipOk(out, s.duration)) { reused.push(s.id); continue; }
  if (existsSync(out)) { rmSync(out, { force: true }); }        // truncated -> redo
  if (!existsSync(join(images, `${s.id}.png`))) die(`missing image for scene ${s.id}: ${join(images, `${s.id}.png`)}`);
  todo.push(s);
}
const totalSecs = todo.reduce((a, s) => a + s.duration, 0);
console.error(`render-all: chunk ${chunk}/${of} | ${mine.length} scenes | ${reused.length} already done | ${todo.length} to render (${(totalSecs / 60).toFixed(1)} min of video) | jobs=${jobs}`);
if (dry) { console.log(JSON.stringify({ ok: true, dryRun: true, toRender: todo.length, reused: reused.length, minutes: +(totalSecs / 60).toFixed(1) }, null, 1)); process.exit(0); }
if (freemem() / 1e9 < 1.0) die(`only ${(freemem() / 1e9).toFixed(1)} GB free RAM -- close something before rendering`);

const clipScript = join(dirname(new URL(import.meta.url).pathname), "render-clip.mjs");
const results = []; let cursor = 0, active = 0, done = reused.length;

function runOne(s, attempt = 1) {
  return new Promise((resolve) => {
    const part = join(outDir, `${s.id}.part.mp4`);
    const args = [clipScript, "--image", join(images, `${s.id}.png`), "--out", part,
      "--duration", String(s.duration), "--index", String(s.moveIndex ?? 0)];
    if (fogLoop) args.push("--fog-loop", fogLoop);
    else { args.push("--fog", fog); if (grain) args.push("--grain", grain); }
    const p = spawn("nice", ["-n", "19", "node", ...args], { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0 && clipOk(part, s.duration)) {
        renameSync(part, join(outDir, `${s.id}.mp4`));          // atomic publish
        done++;
        if (done % 10 === 0 || done === mine.length) console.error(`  ${done}/${mine.length} clips`);
        results.push({ id: s.id, ok: true }); return resolve();
      }
      rmSync(part, { force: true });
      if (attempt <= retries) { console.error(`  ${s.id} attempt ${attempt} failed, retrying`); return resolve(runOne(s, attempt + 1)); }
      console.error(`  ${s.id} FAILED after ${retries + 1} attempts: ${err.trim().split("\n").pop() || `exit ${code}`}`);
      results.push({ id: s.id, ok: false, error: (err.trim().split("\n").pop() || `exit ${code}`).slice(0, 200) });
      resolve();
    });
  });
}

await new Promise((resolveAll) => {
  const pump = () => {
    if (cursor >= todo.length && active === 0) return resolveAll();
    while (active < jobs && cursor < todo.length) {
      const s = todo[cursor++]; active++;
      runOne(s).then(() => { active--; writeFileSync(manifest, JSON.stringify({ updated: new Date().toISOString(), chunk, of, done, total: mine.length, results }, null, 1)); pump(); });
    }
  };
  pump();
});

const failed = results.filter((r) => !r.ok);
writeFileSync(manifest, JSON.stringify({ updated: new Date().toISOString(), chunk, of, done, total: mine.length, results }, null, 1));
console.log(JSON.stringify({ ok: failed.length === 0, chunk, of, scenes: mine.length, reused: reused.length, rendered: results.filter((r) => r.ok).length, failed: failed.map((x) => x.id) }, null, 1));
process.exit(failed.length ? 1 : 0);
