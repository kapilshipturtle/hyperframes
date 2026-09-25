#!/usr/bin/env node
// atmosphere-pass.mjs -- OPTIONAL particle/atmosphere overlay over the finished film.
//
// OFF BY DEFAULT AND OFF UNLESS ASKED. No effect is ever applied implicitly: with no
// --effect flag this script is never invoked by make-video.mjs at all, and invoked
// directly with `--effect none` it exits 0 having copied nothing. A film rendered without
// the flag is byte-identical to one from before this script existed.
//
// Five effects, each MEASURED on real frames from this skill's own footage (see
// memory reference_sleep_atmosphere_effects). They are applied ONCE over the whole film,
// never per clip: a per-clip overlay restarts the particles at every cut, which the user
// saw as the effect "applying separately on each scene". Same reasoning as the old fog
// pass, and the same chunking so a 2h film is not one unresumable ffmpeg command.
//
// Usage:
//   node atmosphere-pass.mjs --in base.mp4 --out atmos.mp4 --effect smoke
//     [--intensity 1.0] [--jobs auto] [--chunk-seconds 300] [--ffmpeg <path>]
//
// Effects: none | smoke | snow | snow-smoke | dust | embers
import { existsSync, mkdirSync, writeFileSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { makeBalancer, busyCores } from "./autobalance.mjs";

const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`atmosphere-pass: ${m}`); process.exit(1); };
const log = (m) => console.error(`atmosphere-pass: ${m}`);

const inFile = resolve(f("in") || die("--in required"));
const outFile = resolve(f("out") || die("--out required"));
const effect = String(f("effect", "none")).toLowerCase();
const intensity = Math.max(0.2, Math.min(2.0, parseFloat(f("intensity", "1.0")) || 1.0));

// --------------------------------------------------------------------------------------
// TRAP 1 (measured): `scroll` DOES NOT EXIST in ffmpeg 4.2, which is this box's system
// ffmpeg. Every effect here needs it, so the ffmpeg7 static build is REQUIRED. Detect it
// rather than assume, and say so plainly instead of dying inside a filter graph.
// --------------------------------------------------------------------------------------
const FF = f("ffmpeg", `${process.env.HOME}/.hyperframes-tools/ffmpeg7`);
const FFMPEG = existsSync(FF) ? FF : "ffmpeg";
const hasScroll = (() => {
  try {
    return /(^|\s)scroll(\s|$)/m.test(execFileSync(FFMPEG, ["-hide_banner", "-filters"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  } catch { return false; }
})();

// --------------------------------------------------------------------------------------
// EFFECT TABLE. Every number here was measured, not guessed.
//
// `grids` are the low-res noise sources for particle effects. Two hard-won rules:
//   TRAP 2: ffmpeg's `noise` filter on a BLACK source caps at 57, NOT 255 (p99.5 = 57).
//     Any threshold above 57 yields ZERO particles -- silently, exit 0, normal-looking
//     file. This is exactly what shipped an almost-empty ember film. Thresholds live in
//     54..56 and nowhere else.
//   TRAP 3: the grid must match the plate's aspect (3840x1080 = 3.555:1) or the upscale
//     stretches X about twice as much as Y and round dots become DASHES.
//
// `sigma` is the glow/softness blur per layer. Small dots need gblur, never boxblur:
//   TRAP 4: boxblur collapses a 1px dot's peak from 255 to 17.
//
// `speed` is [vertical, horizontal] scroll per frame, one pair per layer = parallax.
//   TRAP 5 (verified with a unique marker on a real plate, 930 -> 1908 px): NEGATIVE
//     horizontal scrolls LEFT-TO-RIGHT. Three other methods reported this backwards;
//     mirrored plates defeat correlation entirely. Do not "fix" these signs by intuition.
//   Positive vertical = content rises (embers), negative = falls (snow, dust).
// --------------------------------------------------------------------------------------
const EFFECTS = {
  // Drifting haze. Fractal octaves AVERAGED then steepened -- a smoke mask is continuous
  // tone, so it is built and tuned completely differently from dots.
  //   TRAP 6: averaging octaves compresses the histogram to 13..46 (p50 23), so the
  //     threshold sits at 24 with gain 18. Intuitive values (18, 30) are outside the
  //     usable range entirely -- 95% fog or nothing.
  //   TRAP 7: VISIBILITY IS CONTRAST, NOT COVERAGE. Raising coverage 80->98% made a flat
  //     wash. Coverage holds near 78% and the CURVE steepens.
  smoke: {
    kind: "tone", colour: "0x9AA4B6", label: "Drifting smoke/haze",
    grids: [[240, 68, 21], [480, 135, 57], [960, 270, 93]],
    sigma: [34, 18, 9], speed: [[0, -0.00024], [0, -0.00037], [0, -0.00053]],
    // `thresh` is NOT a constant: it is a PERCENTILE of the averaged octaves, resolved at
    // bake time. The locked recipe's 24.0 was correct for plates whose average measured
    // p50 23, but the same filter chain on a different ffmpeg build produced p50 26, which
    // put the threshold BELOW the median -- so nearly every pixel passed and coverage
    // measured 91% against the approved 28%. Taking the percentile makes the look
    // reproducible instead of depending on the build's noise happening to match.
    threshPct: 68, gain: 18, maskBlur: 26,
    measured: "luma 49.7, coverage 77.9%, peak lift 82",
  },
  // Slow falling flakes at three depths.
  snow: {
    kind: "dot", colour: "0xE8EEF5", label: "Slow falling snow",
    // SPARSE: snow was approved at 0.96% total coverage, a fifth of the embers' 5.10%.
    // One threshold cannot get there -- see `sparse` below -- so snow ANDs two noise
    // fields. thr2 52 measured 0.356%/layer, x3 layers = ~1.07%, on target.
    sparse: 52,
    grids: [[1920, 540, 11], [1920, 540, 41], [1920, 540, 73]],
    sigma: [1.6, 2.2, 3.0], speed: [[-0.00045, -0.00009], [-0.00070, -0.00014], [-0.00100, -0.00020]],
    measured: "coverage 0.96% -- soft flakes at three depths",
  },
  // Snow over haze: both masks, composited in one graph so it stays a single pass.
  "snow-smoke": {
    kind: "combo", label: "Snow over drifting haze", of: ["snow", "smoke"],
    measured: "the two approved looks together, one pass",
  },
  // Fine warm motes, the calmest of the five.
  dust: {
    kind: "dot", colour: "0xD8C9A8", label: "Warm dust motes",
    // Sparser still than snow -- 0.72% approved. thr2 54 measured 0.249%/layer.
    sparse: 54,
    grids: [[1920, 540, 17], [1920, 540, 53], [1920, 540, 97]],
    sigma: [1.6, 2.2, 2.8], speed: [[-0.00022, -0.00013], [-0.00034, -0.00020], [-0.00048, -0.00029]],
    measured: "coverage 0.72%, peak 110 -- the calmest of the five",
  },
  // Rising embers. Amber is OPAQUE, so unlike smoke these stay visible on bright daylit
  // exteriors -- the one effect that dodges the fixed-plate-brightness limitation.
  embers: {
    kind: "dot", colour: "0xFF9A3C", label: "Rising fire embers",
    grids: [[320, 90, 31], [256, 72, 77], [208, 59, 123]],
    sigma: [1.4, 2.0, 2.7], speed: [[0.00055, -0.00011], [0.00085, -0.00017], [0.00125, -0.00024]],
    measured: "coverage 7-10%, peak 148; visible on bright exteriors too",
  },
};

if (effect === "none" || effect === "off" || effect === "") {
  // The explicit no-op. Copy so callers can always read --out, but change nothing.
  if (resolve(inFile) !== resolve(outFile)) copyFileSync(inFile, outFile);
  log("effect=none -- nothing applied (this is the default)");
  process.exit(0);
}
if (!EFFECTS[effect]) die(`unknown --effect ${effect}. One of: none, ${Object.keys(EFFECTS).join(", ")}`);
if (!hasScroll) die(`this ffmpeg has no 'scroll' filter, which every effect needs.\n` +
  `  ffmpeg 4.2 does not ship it. Install/point at the static build:\n` +
  `  node atmosphere-pass.mjs --ffmpeg ~/.hyperframes-tools/ffmpeg7 ...`);

const probe = (p, k = "format=duration") => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", k, "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
const total = probe(inFile);
if (!(total > 0)) die(`could not read a duration from ${inFile}`);

const W = 1920, H = 1080;
const PLATE_W = 3840;                      // half of the 7680 mirrored plate
const work = join(dirname(outFile), ".atmos");
mkdirSync(work, { recursive: true });

// --------------------------------------------------------------------------------------
// Plate baking. Plates are STILLS, baked once (<100 KB each) and reused by every chunk,
// so the per-frame cost is only the scroll+composite, never the noise generation.
//
// Each plate is mirrored and hstacked: [a][hflip(a)] side by side. That makes the
// horizontal wrap SEAMLESS (measured wrap seam 0.00) because the right edge of the plate
// is the mirror of its left edge.
// --------------------------------------------------------------------------------------
function bakeDots(spec, tag) {
  return spec.grids.map(([gw, gh, seed], i) => {
    const out = join(work, `${tag}-dot-${i}.png`);
    if (existsSync(out)) return out;
    // THRESHOLD 56 IS THE APPROVED DENSITY, not a midpoint of the legal range. The usable
    // range is only 54..56 (TRAP 2) but it is extremely steep: 54 produced ~3,100 dots and
    // measured 20% coverage -- a swarm -- where 56 produced ~770 and measured the 7-10%
    // that was approved. Verify any change by LOOKING at a frame, not by the dot count.
    const base = 56;
    // Intensity is the density dial, and it can only move DOWN from the approved look:
    // 56 -> 55 roughly doubles the dots, which is already past what reads as embers.
    const adj = Math.max(55, Math.min(56, Math.round(base - (intensity - 1) * 1)));
    // TWO SELECTORS, because one threshold cannot reach the sparse end.
    //   embers (no `sparse`): a single threshold at 56 -- the densest legal value still
    //     passes ~1.5% of cells, which after the glow blur measures ~5% coverage. That IS
    //     the approved ember look.
    //   snow / dust (`sparse` set): AND two independent noise fields, so a cell must clear
    //     BOTH. P(both) is the product, which drops coverage into the 0.2-0.4%/layer the
    //     approved flakes actually measure. MEASURED: shrinking the grid instead does NOT
    //     work -- 20 dots and 365 dots both land near 6% coverage, because a small grid
    //     upscales each dot into a correspondingly bigger blob. Dot SIZE drives coverage,
    //     not dot count, so the grid stays large and the SELECTION gets rarer.
    const tail = `format=gray,scale=${PLATE_W}:${H}:flags=bilinear,gblur=sigma=${spec.sigma[i]},` +
                 `split[a][b];[b]hflip[m];[a][m]hstack=inputs=2,format=gray`;
    const args = ["-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `color=black:s=${gw}x${gh}:d=1`];
    if (spec.sparse) {
      args.push("-filter_complex",
        `noise=alls=100:allf=t+u:all_seed=${seed},format=gray,lutyuv=y='if(gt(val,${adj}),255,0)'[s1];` +
        `color=black:s=${gw}x${gh}:d=1,noise=alls=100:allf=t+u:all_seed=${seed + 66},format=gray,` +
        `lutyuv=y='if(gt(val,${spec.sparse}),255,0)'[s2];` +
        `[s1][s2]blend=all_mode=darken,${tail}`);
    } else {
      args.push("-vf", `noise=alls=100:allf=t+u:all_seed=${seed},format=gray,` +
                       `lutyuv=y='if(gt(val,${adj}),255,0)',${tail}`);
    }
    args.push("-frames:v", "1", "-y", out);
    const r = spawnSync(FFMPEG, args, { encoding: "utf8" });
    if (r.status !== 0) die(`baking ${tag} dot plate ${i} failed:\n${r.stderr}`);
    return out;
  });
}

function bakeTone(spec, tag) {
  return spec.grids.map(([gw, gh, seed], i) => {
    const out = join(work, `${tag}-oct-${i}.png`);
    if (existsSync(out)) return out;
    const r = spawnSync(FFMPEG, ["-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", `color=black:s=${gw}x${gh}:d=1`,
      "-vf", `noise=alls=100:all_seed=${seed},format=gray,` +
             `scale=${PLATE_W}:${H}:flags=bilinear,gblur=sigma=${spec.sigma[i]},` +
             `split[a][b];[b]hflip[m];[a][m]hstack=inputs=2,format=gray`,
      "-frames:v", "1", "-y", out], { encoding: "utf8" });
    if (r.status !== 0) die(`baking ${tag} octave ${i} failed:\n${r.stderr}`);
    return out;
  });
}

// Resolve the effect (or combo) into a plate list + a full filter graph.
// The graph itself is built PER CHUNK by chunkArgs(), because each chunk needs its own
// scroll phase offset. Here we only bake the plates and fix their input order -- the order
// this array ends up in IS the ffmpeg input order chunkArgs relies on.
const names = EFFECTS[effect].kind === "combo" ? EFFECTS[effect].of : [effect];
const plates = [];
names.forEach((n) => {
  const spec = EFFECTS[n];
  plates.push(...(spec.kind === "tone" ? bakeTone(spec, n) : bakeDots(spec, n)));
});

// Resolve any percentile-based threshold against the plates we actually baked. Measuring
// beats trusting a constant: the averaged-octave histogram is narrow (measured 13..46), so
// being 3 levels out moves coverage from 28% to 91%.
for (const n of names) {
  const spec = EFFECTS[n];
  if (spec.kind !== "tone" || spec.threshPct == null) continue;
  const octs = spec.grids.map((_, i) => join(work, `${n}-oct-${i}.png`));
  const bufs = octs.map((o) => execFileSync(FFMPEG, ["-v", "error", "-i", o, "-f", "rawvideo", "-pix_fmt", "gray", "-"],
    { encoding: "buffer", maxBuffer: 1 << 28 }));
  const len = Math.min(...bufs.map((b) => b.length));
  // Sample rather than sort 8M pixels three times over.
  const vals = [];
  for (let i = 0; i < len; i += 97) {
    let acc = 0; for (const b of bufs) acc += b[i];
    vals.push(acc / bufs.length);
  }
  vals.sort((a, b) => a - b);
  spec.thresh = +vals[Math.floor(vals.length * (spec.threshPct / 100))].toFixed(2);
  log(`${n}: averaged octaves p${spec.threshPct} = ${spec.thresh} (threshold resolved from the baked plates)`);
}

log(`${effect} -- ${names.map((n) => EFFECTS[n].label).join(" + ")}`);
log(`measured: ${names.map((n) => EFFECTS[n].measured).join(" | ")}`);
log(`${plates.length} plates baked, intensity ${intensity}, ${total.toFixed(1)}s of film`);

// --------------------------------------------------------------------------------------
// CHUNKED so a long film is resumable, exactly like the fog pass was.
//
// Continuity across chunks: `scroll` restarts its phase at each chunk's first frame, so a
// chunk boundary would jump the particles. The plate is horizontally seamless, so the fix
// is to give each chunk the phase it should already have -- there is no scroll "start
// offset" parameter, so instead each chunk seeks the PLATE forward by the number of frames
// already elapsed. A still plate has no time axis to seek, so the phase is carried by
// pre-rolling the scroll: we pass the elapsed frame count as an added constant offset via
// the crop x position, which the mirrored plate makes safe to wrap.
// --------------------------------------------------------------------------------------
// CHUNKING IS OPT-IN AND OFF BY DEFAULT (0 = one pass over the whole film).
//
// WHY, measured. Chunking needs each chunk to resume the particle scroll where the last
// one stopped. scroll's own hpos/vpos pre-roll gets close but NOT exact: against a
// one-shot render of the same film, frames before the seam matched bit-for-bit (0.000)
// while frames after it diverged by ~7.8, and the seam itself measured 5.83x the
// mid-chunk motion where an unchunked pass measures 1.77x. That is well under the 18.76x
// that reads as a visible jump, but it is not free, and the three layers have
// incommensurate wrap periods (e.g. embers 60.6s / 39.2s / 26.7s) so NO chunk length
// makes them all align.
//
// So: seam correctness on SHORT films, resumability on long ones.
//
// THE DEFAULT IS NOW LENGTH-AWARE, after a real failure (2026-09-21). "One pass" was
// chosen having only ever tested it on a 60-SECOND clip. On a 103.8-minute film it means
// a single ~3-hour unresumable ffmpeg run, and that is exactly what happened: the pass
// ran 2h 47m, wrote an 18 MB fragment, exited non-zero, and took make-video down with
// it -- so the mux and the gate never ran either. Nothing was salvageable from 2h 47m of
// CPU because there was no checkpoint to resume from.
//
// Every other long stage in this pipeline resumes. This was the only one that could not,
// and it was also the longest. A seam measuring 5.83x mid-chunk motion (vs 1.77x
// unchunked, and 18.76x for a visibly broken one) is a far cheaper price than losing the
// whole pass, so above the threshold we chunk and keep the progress.
//
// Films at or under AUTO_CHUNK_ABOVE_S stay single-pass and are byte-identical to before.
// `--chunk-seconds N` still forces a size; `--chunk-seconds -1` forces one pass.
// Resolved to a FINITE number: `Infinity` here silently becomes NaN in `0 * chunkSecs`
// and ffmpeg then rejects `-ss NaN` with a bare "Error parsing global options".
const AUTO_CHUNK_ABOVE_S = parseFloat(f("auto-chunk-above", "600"));   // 10 minutes
const chunkSecs = (() => {
  const raw = f("chunk-seconds", "");
  const v = parseFloat(raw);
  if (raw !== "" && Number.isFinite(v) && v < 0) return Math.max(1, Math.ceil(total));  // forced single pass
  if (raw !== "" && Number.isFinite(v) && v > 0) return Math.max(30, v);                // explicit size
  // No flag: one pass for short films, 5-minute resumable chunks for long ones.
  if (total <= AUTO_CHUNK_ABOVE_S) return Math.max(1, Math.ceil(total));
  log(`film is ${(total / 60).toFixed(1)} min -- chunking at 300s so an interruption ` +
      `costs one chunk, not the whole pass (pass --chunk-seconds -1 for a single pass)`);
  return 300;
})();
const jobsArg = f("jobs", "auto");
const AUTO = jobsArg === "auto";
const balancer = AUTO ? makeBalancer({
  maxJobs: parseInt(f("max-jobs", "4"), 10),
  reserveGB: parseFloat(f("reserve-gb", "3.0")),
  reserveCores: parseFloat(f("reserve-cores", "2.0")),
}) : null;
let jobs = AUTO ? 1 : Math.max(1, Math.min(parseInt(jobsArg, 10) || 1, 6));

const nChunks = Math.max(1, Math.ceil(total / chunkSecs));
const chunkPath = (i) => join(work, `chunk-${String(i).padStart(4, "0")}.mp4`);

function chunkArgs(i) {
  const start = i * chunkSecs;
  const dur = Math.min(chunkSecs, total - start);
  // PHASE CONTINUITY ACROSS CHUNKS. `scroll` restarts at position 0 on each chunk's first
  // frame, so without this every chunk boundary snaps the particles back -- MEASURED as an
  // 84.0 per-frame spike, 54x the mid-chunk motion (fog-pass treats 18.76x as a visible
  // jump, 1.57x as invisible).
  //
  // The fix is scroll's OWN `hpos`/`vpos` initial-position options, normalised 0..1, NOT a
  // crop offset: crop runs AFTER scroll, so shifting the window moves an already-scrolling
  // plate instead of setting where it starts.
  const fps = 30;
  const elapsed = Math.round(start * fps);
  // scroll advances by `speed` per FRAME as a fraction of the image, and wraps at 1.0.
  const wrap01 = (x) => ((x % 1) + 1) % 1;
  const g = [];
  let lbl = "0:v";
  let idx = 1;
  names.forEach((n, k) => {
    const spec = EFFECTS[n];
    const tag = n.replace(/[^a-z]/g, "");
    spec.speed.forEach(([v, h], li) => {
      const sv = (v * intensity), sh = (h * intensity);
      // Where this layer would already have scrolled to by the chunk's first frame.
      // SIGN IS NEGATIVE, measured against a one-shot render: hpos/vpos name the position
      // the window is read FROM, which moves opposite to the scroll direction. Using
      // +elapsed*speed measured 14.50 mean abs diff from the ground truth, -elapsed*speed
      // measured 1.13. Do not "correct" this sign by intuition -- verify against a
      // --chunk-seconds 999 one-shot of the same film.
      const hp = wrap01(-sh * elapsed), vp = wrap01(-sv * elapsed);
      g.push(`[${idx}]scroll=vertical=${sv.toFixed(8)}:horizontal=${sh.toFixed(8)}` +
             `:hpos=${hp.toFixed(8)}:vpos=${vp.toFixed(8)},` +
             `crop=${W}:${H}:0:0,format=gray[${tag}${li}]`);
      idx++;
    });
    if (spec.kind === "dot") {
      g.push(`[${tag}0][${tag}1]blend=all_mode=lighten[${tag}ab]`);
      g.push(`[${tag}ab][${tag}2]blend=all_mode=lighten,format=gray[${tag}mask]`);
    } else {
      g.push(`[${tag}0][${tag}1]blend=all_mode=average[${tag}ab]`);
      const gain = (spec.gain * intensity).toFixed(2);
      g.push(`[${tag}ab][${tag}2]blend=all_mode=average,format=gray,` +
        `lutyuv=y='clip((val-${spec.thresh})*${gain},0,255)',gblur=sigma=${spec.maskBlur}[${tag}mask]`);
    }
    g.push(`color=c=${spec.colour}:s=${W}x${H}:r=30[${tag}c]`);
    g.push(`[${tag}c][${tag}mask]alphamerge,format=yuva420p[${tag}l]`);
    const out = k === names.length - 1 ? "vout" : `stage${k}`;
    g.push(`[${lbl}][${tag}l]overlay=0:0:format=auto[${out}]`);
    lbl = out;
  });
  g.push(`[vout]format=yuv420p[v]`);

  const a = ["-hide_banner", "-loglevel", "error",
    "-ss", String(start), "-t", String(dur), "-i", inFile];
  // TRAP 9: `-shortest` does NOT bound a graph ending in blend -- a looped PNG input ran
  // to 2.03 GB at 14 MB/s. `-t` goes on EVERY looped input AND on the output.
  for (const p of plates) a.push("-loop", "1", "-t", String(dur), "-i", p);
  a.push("-filter_complex", g.join(";"), "-map", "[v]", "-an",
    "-t", String(dur),
    // keyint=30 so a later smart-join can stream-copy chunk interiors (measured: the
    // default keyint=250 forces a re-encode of 86.6% of the film).
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-x264-params", "keyint=30:min-keyint=30:scenecut=0",
    "-pix_fmt", "yuv420p", "-y", chunkPath(i));
  return a;
}

// Render chunks with the shared balancer, newest-first resumability: an existing
// non-empty chunk is kept, so a rerun continues rather than restarting.
// Defined before use: a half-written chunk from an interrupted run probes as 0 and is
// re-rendered rather than trusted.
const probeSafe = (p) => { try { return probe(p); } catch { return 0; } };
const pending = [];
// A chunk is kept only if it is FULL LENGTH, the same rule okChunk() applies to a freshly
// rendered one. "Non-empty" was not enough: MEASURED 2026-09-25, a shutdown at 01:01:14
// sent SIGTERM mid-encode, ffmpeg FINALISED the file cleanly, and chunk-0014 was a valid
// 150.8s video instead of 300s. The resume trusted it, the joined film came out 149s short,
// and only the final duration check caught it -- after ~40 min of work.
for (let i = 0; i < nChunks; i++) {
  const want = Math.min(chunkSecs, total - i * chunkSecs);
  if (existsSync(chunkPath(i)) && probeSafe(chunkPath(i)) >= want - 1.0) continue;
  if (existsSync(chunkPath(i))) log(`chunk ${i} is short (${probeSafe(chunkPath(i)).toFixed(1)}s of ${want.toFixed(1)}s) -- re-rendering`);
  pending.push(i);
}

if (pending.length === 0) log(`all ${nChunks} chunks already present -- joining`);
else log(`${pending.length}/${nChunks} chunks to render`);

// MATCHES fog-pass.mjs's proven worker loop. Three things it must get right:
//   * async `spawn`, not spawnSync -- spawnSync inside Promise.all runs SERIALLY, so the
//     balancer would be decorative.
//   * `nice -n 19`, so a 2h pass never makes the desktop unusable.
//   * scaling down means NOT LAUNCHING a replacement, never killing an encode in flight
//     (its part-file would be discarded and redone).
if (AUTO) busyCores();   // prime the /proc/stat delta
const okChunk = (i, want) => { try { return probeSafe(chunkPath(i)) >= want - 1.0; } catch { return false; } };
const t0 = Date.now();
let cursor = 0, active = 0, finished = nChunks - pending.length, failed = null;
await new Promise((res) => {
  const pump = () => {
    if (cursor >= pending.length && active === 0) return res();
    if (AUTO) jobs = balancer.decide(active);
    while (active < jobs && cursor < pending.length) {
      const i = pending[cursor++]; active++;
      const dur = Math.min(chunkSecs, total - i * chunkSecs);
      const p = spawn("nice", ["-n", "19", FFMPEG, ...chunkArgs(i)], { stdio: ["ignore", "ignore", "pipe"] });
      let err = ""; p.stderr.on("data", (d) => (err += d));
      p.on("close", (code) => {
        active--; finished++;
        if (code !== 0 || !okChunk(i, dur)) {
          failed = failed || `chunk ${i} failed: ${(err.trim().split("\n").pop() || code).toString().slice(0, 300)}`;
          console.error(`  chunk ${i} FAILED`);
        } else console.error(`  ${finished}/${nChunks} chunks`);
        pump();
      });
    }
  };
  pump();
});
if (failed) die(failed + "\n  (re-run to resume -- finished chunks are kept)");

// Join the chunks (stream copy -- they are all the same codec/params by construction),
// then carry the ORIGINAL audio across untouched.
const list = join(work, "chunks.txt");
writeFileSync(list, Array.from({ length: nChunks }, (_, i) => `file '${chunkPath(i)}'`).join("\n") + "\n");
const hasAudio = (() => {
  try { return execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=codec_type", "-of", "csv=p=0", inFile], { encoding: "utf8" }).trim().length > 0; }
  catch { return false; }
})();
const jargs = ["-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list];
if (hasAudio) jargs.push("-i", inFile, "-map", "0:v", "-map", "1:a", "-c:a", "copy");
else jargs.push("-map", "0:v");
jargs.push("-c:v", "copy", "-movflags", "+faststart", "-y", outFile);
const j = spawnSync(FFMPEG, jargs, { encoding: "utf8" });
if (j.status !== 0) die(`joining chunks failed:\n${j.stderr}`);

const outDur = probe(outFile);
// The pass must not change the film's length. A drift beyond a second means a chunk was
// short and the join silently swallowed it.
if (Math.abs(outDur - total) > 1.0) die(`duration drifted: in ${total.toFixed(2)}s, out ${outDur.toFixed(2)}s`);
log(`done -- ${outFile} (${outDur.toFixed(1)}s, audio ${hasAudio ? "carried" : "none in source"})`);
console.log(JSON.stringify({ ok: true, effect, intensity, out: outFile, seconds: +outDur.toFixed(2), chunks: nChunks }, null, 1));
