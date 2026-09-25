#!/usr/bin/env node
// dissolve-join.mjs -- join clips with a CROSS-DISSOLVE instead of a hard cut, in chunks.
//
// WHY A DISSOLVE AND NOT A CUT (measured on this project's own footage):
//   hard-cut concat : one frame-to-frame luminance spike of 28.28 at each join, which is
//                     7.2x the surrounding motion, and `select=gt(scene,0.25)` detects one
//                     cut per join. On a sleep video that spike is the thing most likely
//                     to pull a dozing viewer back awake.
//   1.5s dissolve   : 0 cuts detected, 0 black frames, luma moves smoothly between the two
//                     images (44.7 -> 40.2) and never leaves the film's register.
// The reference channel measures ZERO detectable cuts across 2.5 hours, so a dissolve is
// also the genre-correct choice, not just the gentler one.
//
// WHY NOT DIP-TO-BLACK (which is what per-clip `fade=in/out` + plain concat gives you):
// a fade-out on an already-dark clip drives luma from ~11 down to ~2.5 and back up again --
// a full brightness excursion in a film whose whole visual register sits at luma ~18.
// A cross-dissolve is monotonic between the two levels. Genre guidance for exactly this
// content says to avoid "bright flashes, fast zooms, or sudden color shifts".
//
// WHY CHUNKED, AND WHY THE CARRY-FORWARD:
//   * A single xfade chain over 467 inputs needs ~89 GB of RAM (measured: ~21.7 MB per
//     input at 640x360, scaling to ~195 MB at 1080p). Chunking is MANDATORY, not an
//     optimisation.
//   * NAIVE chunking silently loses one dissolve per chunk seam. The fix is to carry the
//     previous chunk's LAST clip forward as the next chunk's FIRST input, and trim each
//     non-final chunk's tail by D so that clip's final D seconds is not emitted twice.
//
// THE OFFSET ACCUMULATOR is the other classic bug. `offset` is not where clip i starts in
// the inputs -- it is where the fade begins on the OUTPUT timeline built so far, which is
// shorter than the input sum by D per join already applied:
//     off = d[0] - D ;  then per clip:  off += d[i] - D
// Omit the `- D` and the error accumulates across every join.
//
// Requires an ffmpeg with `xfade` (>= 4.3). ffmpeg 4.2 does NOT have it -- pass --ffmpeg
// pointing at a static build. The final join of the chunks is a lossless stream-copy.
//
// Usage:
//   node dissolve-join.mjs --clips-dir .work/dfclips --out .work/base.mp4
//     [--dissolve 1.5] [--chunk 20] [--ffmpeg ./ffmpeg7] [--fps 30] [--crf 20] [--dry-run]
import { readdirSync, existsSync, writeFileSync, mkdirSync, rmSync, statSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";

const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const die = (m) => { console.error(`dissolve-join: ${m}`); process.exit(1); };

const dir = f("clips-dir") || die("--clips-dir required");
const out = f("out") || die("--out required");
const D = parseFloat(f("dissolve", "1.5"));
const CHUNK = parseInt(f("chunk", "20"), 10);
const FPS = parseInt(f("fps", "30"), 10);
const CRF = f("crf", "20");
const FF = f("ffmpeg", "ffmpeg");

// xfade presence is a hard requirement and its absence is silent-ish, so check up front.
try {
  const filters = execFileSync(FF, ["-hide_banner", "-filters"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (!/\bxfade\b/.test(filters)) die(`${FF} has no xfade filter (needs >= 4.3). Pass --ffmpeg <static build>.`);
} catch (e) { die(`cannot run ${FF}: ${e.message}`); }

// EXCLUDE part-files: a `.part.mp4` is by definition an incomplete encode, and because the
// final join is `-c copy` there is no re-encode to fail loudly on a truncated input.
const clips = readdirSync(dir).filter((x) => x.endsWith(".mp4") && !x.endsWith(".part.mp4")).sort();
if (clips.length < 2) die(`need >= 2 clips in ${dir}, found ${clips.length}`);
// Assert numeric order matches lexical order, or the film desyncs silently.
{
  const nums = clips.map((c) => parseInt(c, 10));
  if (nums.every(Number.isFinite)) {
    const byNum = [...clips].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    if (byNum.join() !== clips.join()) die("clip filenames do not sort numerically -- refusing to join in the wrong order");
  }
}

// ---- MEMORY GUARD -------------------------------------------------------------------
// MEASURED on this box: one 20-clip 1080p xfade chunk peaked at **5.50 GB** -- roughly
// 275 MB per 1080p input, not the ~195 MB extrapolated from a 640x360 benchmark. With 5.5 GB
// resident the system had already pushed 6.1 GB into swap, which is the exact condition
// that has frozen this laptop before. xfade must buffer every input in the chain, so peak
// RAM scales with CHUNK, and a too-large CHUNK does not fail -- it swaps.
// CHUNK=12 -> ~3.3 GB, which leaves real headroom. Refuse to start if the projection does
// not fit what is actually available.
const PER_INPUT_MB = parseFloat(f("per-input-mb", "275"));
const availGB = (() => {
  try {
    const m = readFileSync("/proc/meminfo", "utf8").match(/^MemAvailable:\s+(\d+) kB/m);
    if (m) return parseInt(m[1], 10) / 1e6;
  } catch { /* non-linux */ }
  return 99;
})();
const projGB = (CHUNK * PER_INPUT_MB) / 1024;
// Reserve raised 2.0 -> 4.0 GB. At CHUNK=20 the projection (5.4 GB) technically "fit"
// inside 6 GB available with a 2 GB reserve, yet the real run drove 6.1 GB into swap --
// because MemAvailable counts reclaimable cache that xfade's buffers then evict. A 4 GB
// reserve is what actually keeps the desktop off swap on this machine.
const reserveGB = parseFloat(f("reserve-gb", "4.0"));
// Also refuse outright if the system is ALREADY swapping hard: adding 3+ GB of buffers on
// top of that is how the laptop freezes rather than merely slows.
try {
  const mi = readFileSync("/proc/meminfo", "utf8");
  const st = parseInt((mi.match(/^SwapTotal:\s+(\d+) kB/m) || [0, 0])[1], 10) / 1e6;
  const sf = parseInt((mi.match(/^SwapFree:\s+(\d+) kB/m) || [0, 0])[1], 10) / 1e6;
  const used = st - sf;
  if (used > 4.0) console.error(`  WARNING: ${used.toFixed(1)} GB already in swap -- consider closing apps first`);
} catch { /* ignore */ }
if (projGB + reserveGB > availGB) {
  const fits = Math.max(2, Math.floor(((availGB - reserveGB) * 1024) / PER_INPUT_MB));
  die(`CHUNK=${CHUNK} projects ~${projGB.toFixed(1)} GB of xfade buffers but only ` +
      `${availGB.toFixed(1)} GB is available (reserving ${reserveGB} GB).\n` +
      `  Use --chunk ${fits} or free memory. Going ahead would swap, not fail.`);
}
console.error(`  memory: CHUNK=${CHUNK} -> ~${projGB.toFixed(1)} GB projected, ${availGB.toFixed(1)} GB available`);

const qz = (t) => Math.round(t * FPS) / FPS;   // land every offset on the frame grid
const dur = (p) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
const durs = clips.map((c) => dur(join(dir, c)));
const short = clips.filter((c, i) => durs[i] <= D + 0.05);
if (short.length) die(`${short.length} clip(s) are shorter than the ${D}s dissolve (first: ${short[0]}). xfade produces broken output on those.`);


// ---- the OUTPUT TIMELINE is the only sane way to reason about this -----------------
// On the output, clip i occupies [s_i, s_i + d_i) where
//     s_0 = 0 ;  s_i = s_{i-1} + d_{i-1} - D
// (each join eats D seconds). Total runtime = s_last + d_last.
//
// A chunk covering clips [a..b] renders the timeline segment [s_a, s_b + d_b). With
// carry-forward, chunk g must emit only [s_a, s_b) -- stopping exactly where the next
// chunk's FIRST clip begins on the output timeline -- and chunk g+1 then emits from s_b.
// No overlap, no gap, and the keeps sum to the total exactly.
//
// I got this wrong twice before landing it, and the drift gate caught both:
//   "trim the tail by D"      -> +24.87s over 6 clips (chunk bounds also overlapped)
//   "stop before last fade"   -> +3.00s = exactly D per seam (still double-counted)
// The timeline formulation below verified diff 0.000s.
const starts = [0];
for (let i = 1; i < clips.length; i++) starts.push(qz(starts[i - 1] + durs[i - 1] - D));
const totalTimeline = qz(starts[clips.length - 1] + durs[clips.length - 1]);
const predicted = totalTimeline;
console.error(`dissolve-join: ${clips.length} clips | D=${D}s | chunk=${CHUNK} | ${FF}`);
console.error(`  input total ${(durs.reduce((a, b) => a + b, 0) / 60).toFixed(2)} min -> output ${(predicted / 60).toFixed(2)} min`);
console.error(`  (each join overlaps by ${D}s, so the film is ${((clips.length - 1) * D / 60).toFixed(1)} min shorter than the inputs -- clips were rendered +${D}s each to absorb exactly this)`);

const groups = [];
for (let a = 0; ;) {
  const b = Math.min(a + CHUNK - 1, clips.length - 1);
  groups.push({ a, b, last: b === clips.length - 1 });
  if (b === clips.length - 1) break;
  a = b;                                       // next chunk STARTS with clip b
}
console.error(`  ${groups.length} chunk(s)`);
if (has("dry-run")) {
  console.log(JSON.stringify({ ok: true, dryRun: true, clips: clips.length, chunks: groups.length,
    predictedMinutes: +(predicted / 60).toFixed(2) }, null, 1));
  process.exit(0);
}

const work = join(dirname(resolve(out)), ".dissolve");
mkdirSync(work, { recursive: true });
const parts = [];
const t0 = Date.now();

groups.forEach((g, gi) => {
  const part = join(work, `d${String(gi).padStart(4, "0")}.mp4`);
  parts.push(part);
  const members = clips.slice(g.a, g.b + 1);
  const mdurs = durs.slice(g.a, g.b + 1);
  // THE SEAM FIX. A non-final chunk must emit THROUGH THE END of the dissolve into its
  // last clip -- [s_a, s_b + D) -- because that dissolve can only be produced by the chunk
  // that holds BOTH clips. The next chunk then skips its own first D seconds, since that
  // interval was already emitted.
  // Getting this wrong is silent: an earlier version stopped at s_b, so the carried clip
  // simply BEGAN in the next chunk with no dissolve into it, and `select=gt(scene,0.25)`
  // found a hard cut at exactly that seam (verified: a cut at 32.00s where s_b = 31.97s)
  // while the duration was still perfectly correct. Duration alone does not prove the
  // dissolves are present -- count the detected cuts too.
  const lo = gi === 0 ? starts[g.a] : qz(starts[g.a] + D);
  const hi = g.last ? qz(starts[g.b] + durs[g.b]) : qz(starts[g.b] + D);
  const keep = qz(hi - lo);
  const skip = gi === 0 ? 0 : D;
  if (existsSync(part)) {
    try { if (Math.abs(dur(part) - qz(keep)) < 0.2) { console.error(`  chunk ${gi + 1}/${groups.length} reused`); return; } } catch {}
    rmSync(part, { force: true });
  }
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  for (const m of members) args.push("-i", join(dir, m));
  let fc = "", prev = "[0:v]", off = qz(mdurs[0] - D);
  for (let k = 1; k < members.length; k++) {
    const lbl = k === members.length - 1 ? "[vv]" : `[x${k}]`;
    fc += `${prev}[${k}:v]xfade=transition=fade:duration=${D}:offset=${off.toFixed(6)}${lbl};`;
    prev = lbl;
    off = qz(off + mdurs[k] - D);
  }
  // re-assert CFR after xfade: a timestamp gap here silently drops frames, and the
  // reported duration then lies about it (verify by FRAME COUNT, not duration).
  // trim the already-emitted head, then re-assert CFR
  fc += skip > 0
    ? `${prev}trim=start=${skip.toFixed(6)},setpts=PTS-STARTPTS,fps=${FPS},format=yuv420p[v]`
    : `${prev}fps=${FPS},format=yuv420p[v]`;
  args.push("-filter_complex", fc, "-map", "[v]", "-t", qz(keep).toFixed(6),
    // identical GOP settings on every chunk so the final concat is a true stream-copy
    "-c:v", "libx264", "-preset", "veryfast", "-crf", CRF, "-pix_fmt", "yuv420p",
    "-g", String(FPS), "-keyint_min", String(FPS), "-sc_threshold", "0", part);
  execFileSync("nice", ["-n", "19", FF, ...args], { stdio: ["ignore", "ignore", "inherit"] });
  console.error(`  chunk ${gi + 1}/${groups.length}  ${members.length} clips -> ${qz(keep).toFixed(2)}s`);
});

// ---- lossless concat of the chunks --------------------------------------------------
const list = join(work, "list.txt");
writeFileSync(list, parts.map((p) => `file '${p}'`).join("\n"));
execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
  "-i", list, "-c", "copy", out], { stdio: ["ignore", "ignore", "inherit"] });

const actual = dur(out);
// Verify by FRAME COUNT as well: a gappy-timestamp stream reports a duration it does not
// contain, so duration alone is not proof.
let frames = null;
try {
  frames = parseInt(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-select_streams", "v:0",
    "-show_entries", "stream=nb_read_frames", "-of", "csv=p=0", out], { encoding: "utf8", timeout: 900000 }).trim(), 10);
} catch { /* counting frames on a 2h file can be slow; duration check still applies */ }
rmSync(work, { recursive: true, force: true });

const driftS = actual - predicted;
const okDur = Math.abs(driftS) <= 2.0;
console.log("\n" + JSON.stringify({
  ok: okDur, out, clips: clips.length, chunks: groups.length, dissolve: D,
  predicted_min: +(predicted / 60).toFixed(2), actual_min: +(actual / 60).toFixed(2),
  drift_seconds: +driftS.toFixed(2),
  frames, expected_frames: frames === null ? null : Math.round(predicted * FPS),
  wall_minutes: +((Date.now() - t0) / 60000).toFixed(1),
}, null, 1));
if (!okDur) console.error(`dissolve-join: DRIFT ${driftS.toFixed(2)}s exceeds 2s -- do not ship, the narration will desync`);
process.exit(okDur ? 0 : 1);
