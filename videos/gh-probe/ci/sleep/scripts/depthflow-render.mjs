#!/usr/bin/env node
// depthflow-render.mjs -- render every scene as a DEPTH-PARALLAX clip via DepthFlow,
// with a varied camera move per scene, the colour grade baked in, and each clip extended
// so a cross-dissolve can overlap it without shortening the film.
//
// This replaces render-all.mjs + render-clip.mjs (ffmpeg zoompan) for the DepthFlow route.
// It is a thin wrapper: all the real work is in the Python batch runner it writes, because
// DepthFlow v1.0 has NO CLI animation system and NO batch mode -- you must subclass
// DepthScene in-process (v1.0.0 changelog: "Remove batch processing support", "Remove
// animation system, now in example scripts and documentation"). Every tutorial showing
// `depthflow input -i x.png orbital main -o out.mp4` describes <=0.9 and does not run.
//
// WHY A SINGLE PYTHON PROCESS (measured):
//   import depthflow + GL ctx + shader compile  ~0.7 s   per PROCESS
//   DepthAnythingV2 cold (model load + infer)   10.49 s   per IMAGE
//   same, warm via cache or reused ndarray       0.02 s   -> 456x
// So: one process, and the depth map is estimated ONCE per image and passed back in as an
// ndarray for every render of that image. Spawning per clip would cost ~1.4 h of pure
// model loading across 467 images.
//
// WHY THE CACHE LIMIT IS RAISED: DEPTHMAP_CACHE_SIZE_MB defaults to 32, and a 1080p
// float32 depth map is 8.3 MB -- so the cache holds FOUR images and thrashes on every
// subsequent one. Measured on this box: 15.3 MB used across 9 files, already 48% full.
// 467 images need ~3.9 GB.
//
// Usage:
//   node depthflow-render.mjs --scenes .hyperframes/scenes.json --images .media/scenes \
//     --out-dir .work/dfclips [--dissolve 1.5] [--width 1920] [--height 1080] [--fps 30]
//     [--venv ~/.hyperframes-tools/depthflow-venv] [--dry-run]
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, rmSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { homedir } from "node:os";

const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const die = (m) => { console.error(`depthflow-render: ${m}`); process.exit(1); };

const scenesPath = f("scenes") || die("--scenes required");
const imagesDir = f("images") || die("--images required");
const outDir = f("out-dir") || die("--out-dir required");
const venv = f("venv", join(homedir(), ".hyperframes-tools/depthflow-venv"));
const py = join(venv, "bin/python");
if (!existsSync(py)) die(`no depthflow venv python at ${py}`);
// DISSOLVE: each clip is rendered this much LONGER than its timeline span, so that when
// consecutive clips overlap by D the film does NOT shrink. Without this, 467 clips at
// D=1.5 lose (467-1)*1.5 = 699 s = 11.7 minutes and the narration desyncs completely.
const D = parseFloat(f("dissolve", "1.5"));
const W = parseInt(f("width", "1920"), 10), H = parseInt(f("height", "1080"), 10);
const FPS = parseInt(f("fps", "30"), 10);
const cacheMB = f("cache-mb", "6000");
// MOTION OVERRIDES (added 2026-09-19). Defaults are the locked, measured values, so a run
// that passes nothing is byte-identical to before. They exist so a front-end can offer a
// motion control without editing this file; see the measured ladder next to RAMP/HH/OFF.
// Out-of-range values are clamped, not rejected: a silent clamp is safer than a crash
// halfway through a 467-clip render, and the log prints what was actually used.
// NOTE the names are --motion-height / --motion-offset, NOT --height / --offset:
// --height is ALREADY the output frame height (1080) a few lines above, and reusing it
// would silently set the parallax scalar to 1080.
const clamp = (v, lo, hi, name) => {
  const n = parseFloat(v);
  if (!isFinite(n)) die(`--${name} must be a number`);
  const c = Math.min(hi, Math.max(lo, n));
  if (c !== n) console.error(`depthflow-render: --${name} ${n} clamped to ${c} (range ${lo}-${hi})`);
  return c;
};
const RAMP = clamp(f("motion-ramp", "0.30"), 0.20, 0.45, "motion-ramp");
const HH = clamp(f("motion-height", "0.33"), 0.20, 0.45, "motion-height");
const OFF = clamp(f("motion-offset", "0.44"), 0.25, 0.60, "motion-offset");

// ---- the baked-in colour grade -----------------------------------------------------
// This is the ONLY grade in the pipeline (the separate fog/grade pass is retired), so
// whatever is set here is what the film looks like.
//
// The sleep numbers (sat 40 / bri 60) were fitted to the dark style's measured gate. They
// are MULTIPLIERS: they cut saturation to 40% and brightness to 60%. Applied to the
// historical documentary style they would crush the muted earth palette the style is
// built on -- the ochres, dusty reds and firelight would all read as grey-black, and the
// painterly colour that distinguishes it would simply not survive to the screen.
//
// So the historical style grades at 100/100: the image is delivered as the illustrator
// painted it. It is NOT "no grade by accident" -- it is the deliberate choice that this
// style's colour is decided at generation time, in the prompt, rather than being pushed
// around afterwards. Override with --sat / --bri if a particular film needs it.
const STYLE = f("style", "historical");
if (!["historical", "sleep"].includes(STYLE)) die(`--style must be historical or sleep, got "${STYLE}"`);
const GRADE = { sleep: { sat: 40.0, bri: 60.0 }, historical: { sat: 100.0, bri: 100.0 } }[STYLE];
const SAT = clamp(f("sat", String(GRADE.sat)), 0, 200, "sat");
const BRI = clamp(f("bri", String(GRADE.bri)), 10, 200, "bri");

const scenes = JSON.parse(readFileSync(scenesPath, "utf8"));
if (!Array.isArray(scenes) || !scenes.length) die("scenes file is empty");
mkdirSync(outDir, { recursive: true });

// ---- hold span, same rule render-all.mjs uses --------------------------------------
// A scene is held until the NEXT scene starts; `duration` covers only the spoken part and
// the timeline carries deliberate silent gaps between scenes.
const byStart = [...scenes].sort((a, b) => a.start - b.start);
for (let i = 0; i < byStart.length; i++) {
  const next = byStart[i + 1];
  const span = next ? +(next.start - byStart[i].start).toFixed(3) : byStart[i].duration;
  byStart[i].span = Math.max(span, byStart[i].duration);
}

// ---- MOVE ASSIGNMENT: hash + spacing + budget, never `i % n` ------------------------
// `i % n` over a move pool reads as "the same style over and over" on a long film. A hash
// of the scene id spreads the choice unpredictably; a spacing rule stops a move recurring
// within MIN_GAP scenes; and the budget keeps the higher-amplitude moves a minority.
// Mirror pairs are balanced so the film does not net-drift in one direction.
// 15 moves. Shares sum to 1.00 and are the TARGET frequency of each move across the film;
// `gap` is the minimum number of scenes before the same move may recur, so variety is a
// hash+spacing+budget decision rather than a rotation (an `i % n` rotation reads as "the same
// style over and over"). Rebalanced 2026-09-18 to make room for the four new moves; the
// translation-heavy moves gave up a little share rather than any one of them dominating.
const MOVES = [
  { name: "push_in",       share: 0.13, gap: 3 },
  { name: "pull_out",      share: 0.08, gap: 4 },
  { name: "drift_left",    share: 0.10, gap: 4 },
  { name: "drift_right",   share: 0.10, gap: 4 },
  { name: "rise",          share: 0.07, gap: 5 },
  { name: "fall",          share: 0.07, gap: 5 },
  { name: "diagonal",      share: 0.07, gap: 5 },
  { name: "orbit",         share: 0.05, gap: 7 },   // highest artifact risk -> minority
  { name: "depth_shift",   share: 0.05, gap: 7 },
  { name: "breathe",       share: 0.06, gap: 5 },
  { name: "float",         share: 0.04, gap: 8 },
  { name: "rack_focus",    share: 0.07, gap: 5 },   // no displacement: movement, zero speed
  { name: "steady_sweep",  share: 0.05, gap: 6 },   // no displacement
  { name: "counter_drift", share: 0.04, gap: 7 },   // shear -> most perceived motion per speed
  { name: "dolly",         share: 0.02, gap: 9 },   // stretches most -> smallest share
];
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const used = Object.fromEntries(MOVES.map((m) => [m.name, 0]));
const lastAt = Object.fromEntries(MOVES.map((m) => [m.name, -99]));
let prev = null;
byStart.forEach((s, i) => {
  const eligible = MOVES.filter((m) => m.name !== prev && i - lastAt[m.name] >= m.gap);
  const pool = eligible.length ? eligible : MOVES.filter((m) => m.name !== prev);
  // pick the move furthest BELOW its budget, tie-broken by the id hash so it is not a cycle
  let best = pool[0], bestDebt = -Infinity;
  for (const m of pool) {
    const want = m.share * (i + 1);
    const debt = want - used[m.name] + ((hash(s.id + m.name) % 1000) / 100000);
    if (debt > bestDebt) { bestDebt = debt; best = m; }
  }
  s.move = best.name;
  used[best.name]++; lastAt[best.name] = i; prev = best.name;
});

const plan = byStart.map((s) => ({
  id: s.id,
  image: join(imagesDir, `${s.id}.png`),
  out: join(outDir, `${s.id}.mp4`),
  // render span + D so the dissolve overlap is absorbed
  time: +(s.span + D).toFixed(3),
  move: s.move,
}));
const missing = plan.filter((p) => !existsSync(p.image));
if (missing.length) die(`${missing.length} image(s) missing, first: ${missing[0].image}`);

// resume: a clip that already exists and is long enough is kept
const okClip = (p, want) => {
  if (!existsSync(p)) return false;
  try {
    if (statSync(p).size < 10000) return false;
    const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
    return Number.isFinite(d) && d >= want - 0.5;
  } catch { return false; }
};
const todo = plan.filter((p) => !okClip(p.out, p.time));
const counts = {}; for (const p of plan) counts[p.move] = (counts[p.move] || 0) + 1;
console.error(`depthflow-render: ${plan.length} scenes | ${plan.length - todo.length} already done | ${todo.length} to render`);
console.error(`  motion: ramp ${RAMP} height ${HH} offset ${OFF}
  each clip = span + ${D}s (dissolve overlap) | ${W}x${H}@${FPS} | cache ${cacheMB}MB`);
console.error(`  moves: ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(" ")}`);
const adj = byStart.filter((s, i) => i && s.move === byStart[i - 1].move).length;
console.error(`  adjacent move repeats: ${adj} (must be 0)`);
if (has("dry-run")) { console.log(JSON.stringify({ ok: true, dryRun: true, scenes: plan.length, toRender: todo.length, moves: counts, adjacentRepeats: adj }, null, 1)); process.exit(0); }
if (!todo.length) { console.log(JSON.stringify({ ok: true, scenes: plan.length, rendered: 0, reused: plan.length }, null, 1)); process.exit(0); }

// ---- the Python batch runner --------------------------------------------------------
const runner = join(outDir, "_runner.py");
writeFileSync(runner, `
import os, sys, math, json, time, traceback
os.environ.setdefault("DEPTHMAP_CACHE_SIZE_MB", "${cacheMB}")
os.environ.setdefault("EGL", "1")
import imageio.v3 as iio
from attrs import define
from depthflow.scene import DepthScene, DepthState
from depthflow.estimators.anything import DepthAnythingV2

# TRAPEZOIDAL velocity: short eased ramps at each end, CONSTANT velocity through the middle.
# This replaced smootherstep on 2026-09-18 and it is the whole reason this film can carry more
# movement without running faster. Smootherstep's velocity peaks at 1.875x its own mean, so a
# 16s hold spends its first and last quarter nearly frozen and then hurries through the middle;
# the trapezoid peaks at only 1.429x. MEASURED on real scene images (p95 of per-frame change is
# the honest peak; the raw max is codec noise on one frame):
#   smootherstep h0.30/o0.38, 16s drift : mean 0.067  p95 0.188   <- the shipped film
#   trapezoid    h0.30/o0.38, 16s drift : mean 0.062  p95 0.092   peak HALVED, same amplitude
#   trapezoid    h0.33/o0.44, 16s drift : mean 0.094  p95 0.200   <- chosen: +40% movement,
#                                                                    peak within 6% of before
#   trapezoid    h0.36/o0.50, 16s drift : mean 0.119  p95 0.231   peak +23%, too fast
# Confirmed at two more lengths on a second image (the skill's two-length rule):
#   20s diagonal: p95 0.139 -> 0.143 (+3%)   10s push_in: p95 0.242 -> 0.211 (-13%)
# So perceived speed is unchanged or lower at every length while movement rises throughout.
# RAMP is the fraction of the clip spent accelerating at each end. 0.30 keeps the ramps long
# enough to stay gentle; it must stay >= ~0.20 or the starts/stops become visible.
RAMP = ${RAMP}

def _ramp_int(u):
    # integral of smoothstep u^2*(3-2u) from 0..u -- the eased ramp's distance
    return u**3 - (u**4)/2.0

def ease(t):
    # Velocity is continuous at both junctions (measured 1.4104 -> 1.4286, no step) and the
    # curve lands exactly on 0.0 and 1.0, so a clip still never starts or stops with a jerk.
    r = RAMP
    v0 = 1.0/(1.0 - r)          # plateau velocity, chosen so total travel is exactly 1
    if t < r:       return v0*r*_ramp_int(t/r)
    if t > 1.0 - r: return 1.0 - v0*r*_ramp_int((1.0 - t)/r)
    return v0*(r*0.5 + (t - r))

# MEASURED on this corpus (dark, low-detail AI art), 15s @1080p, target 1.4-1.7 change:
#   height 0.30 / offset 0.38 -> 1.41   ON TARGET   <- chosen
#   height 0.32 / offset 0.42 -> 1.65   ON TARGET
#   height 0.45 / offset 0.60 -> 3.22   too hot
# The researcher's own figures (1.06-1.63) came from a SYNTHETIC test image and measured
# 0.75-1.26 here -- this corpus shows less pixel change for the same camera motion, so the
# amplitudes had to be recalibrated against the real images.
# Raised 0.30/0.38 -> 0.33/0.44 (+15%) together with the trapezoid above. The trapezoid
# freed 31% of peak-velocity headroom; only half of it is spent here, deliberately, because
# the brief was "a little more movement", not "as much as fits".
# Stretch artifacts stay negligible: inpaint diagnostic 0.265% -> 0.294% (tolerable is 2.09%).
# Median luma is UNCHANGED (14.99 -> 14.99, 14.06 -> 14.06), so the grade needs no re-fit.
HH, OFF = ${HH}, ${OFF}
# Artifact guards, measured: isometric 0.62 cut stretched pixels from 2.09% to 0.03% (~70x).
# zoom 1.03 crops the bad edge band and the shader's out-of-bounds black sliver.
ISO, STEADY, ZOOM = 0.62, 0.30, 1.03
# Grade baked in. Values come from the --style flag (see the JS side); both are
# MULTIPLIERS divided by 100 in the shader, NOT additive offsets.
#   sleep      sat 40 / bri 60 -- fitted to the measured dark gate (sat<=14, luma 8-45).
#                                 sat 40 / bri 88 passed on a single clip (luma 30.0) but
#                                 the ASSEMBLED 6-clip film measured lumaMedian 53.95 and
#                                 FAILED: the gate samples the whole film and the brighter
#                                 scenes dominate the median. 60 passed with headroom.
#   historical sat 100 / bri 100 -- identity. The painterly palette is decided in the
#                                 prompt; multiplying it down here would destroy it.
SAT, BRI = ${SAT}, ${BRI}

@define
class Move(DepthScene):
    move: str = "push_in"
    def update(self):
        st = self.state
        st.isometric = ISO; st.steady = STEADY; st.zoom = ZOOM
        st.color.saturation = SAT; st.color.brightness = BRI
        e  = ease(self.tau)                 # 0->1 eased one-shot
        pp = math.sin(math.pi * self.tau)   # 0->1->0, returns to start
        s  = 2*e - 1                        # -1->+1 eased
        m  = self.move
        # NOTE every move carries SOME translation. A pure height ramp measured only 0.32
        # (below the 0.85 gate floor) on a low-detail image: scaling alone moves few pixels
        # far enough to register. A small offset alongside the height swing fixes it.
        if   m == "push_in":     st.height = HH - 0.08 + 0.30*e; st.offset = (0.10*OFF*s, 0.05*OFF*s)
        elif m == "pull_out":    st.height = HH + 0.22 - 0.30*e; st.offset = (-0.10*OFF*s, 0.05*OFF*s)
        elif m == "drift_left":  st.height = HH; st.offset = ( OFF*s, 0.0)
        elif m == "drift_right": st.height = HH; st.offset = (-OFF*s, 0.0)
        elif m == "rise":        st.height = HH; st.offset = (0.06*OFF*s,  1.15*OFF*s)
        elif m == "fall":        st.height = HH; st.offset = (0.06*OFF*s, -1.15*OFF*s)
        elif m == "diagonal":    st.height = HH; st.offset = (0.72*OFF*s, 0.46*OFF*s)
        elif m == "orbit":
            st.height = HH; st.focus = 0.30
            st.isometric = ISO + 0.10*math.cos(math.pi*self.tau)
            st.offset = (0.85*OFF*math.sin(math.pi*self.tau - math.pi/2), 0.0)
        elif m == "depth_shift":
            st.height = HH + 0.04
            st.steady = 0.12 + 0.36*e       # pivot plane slides -> rack-focus feel
            st.offset = (0.55*OFF*s, 0.0)
        elif m == "breathe":     st.height = HH - 0.06 + 0.16*pp; st.offset = (0.08*OFF*pp, 0.0)
        elif m == "float":
            st.height = HH
            st.offset = (0.26*OFF*math.sin(2*math.pi*self.tau),
                         0.19*OFF*math.sin(4*math.pi*self.tau + 1.0))
        # --- added 2026-09-18: four more calm moves. The first three add perceived change
        # with LITTLE OR NO camera displacement, which is the cheapest possible way to add
        # movement without adding speed. The fourth trades on relative motion instead.
        elif m == "rack_focus":
            # The sharp depth band migrates front-to-back WHILE the camera eases across.
            # MEASURED: the blur sweep alone gave mean 0.013 -- invisible on soft dark art
            # (the researcher flagged exactly this risk), so it rides on a real drift and the
            # focus sweep is the flavour on top, not the whole move.
            st.height = HH
            st.blur.intensity = 0.55
            st.blur.start = 0.30 + 0.34*e
            st.blur.end   = st.blur.start + 0.34
            st.offset = (0.92*OFF*s, 0.10*OFF*s)
        elif m == "dolly":
            # True perspective dolly (ray origins move), NOT a zoom crop. MEASURED: dolly
            # alone gave mean 0.019 and dropped median luma to 9.5 (it opens the perspective
            # into the dark corners), so it is paired with a drift and a smaller dolly swing.
            st.height = HH
            st.dolly = 0.30*e
            st.offset = (1.00*OFF*s, 0.10*OFF*s)
        elif m == "steady_sweep":
            # The PINNED depth plane drifts, so the scene breathes around a moving focal
            # depth. MEASURED: alone it gave mean 0.026, so it also rides on a drift.
            st.height = HH + 0.03
            st.steady = 0.20 + 0.20*e
            st.offset = (0.62*OFF*s, 0.08*OFF*s)
        elif m == "counter_drift":
            # Near plane slides one way while the framing eases the other, so the two shear
            # against each other. Relative motion is detected at about half the threshold of
            # absolute motion (Snowden 1992), which is why this move needs the SMALLEST
            # numbers in the catalogue, not the largest: MEASURED at offset 0.62 / center
            # 0.10 it hit mean 0.249 / p95 0.414, roughly double the target peak, because the
            # two displacements compound instead of cancelling. Cut hard and re-measured.
            st.height = HH
            st.offset = (0.30*OFF*s, 0.0)
            st.center = (0.030*s, 0.0)
        else:                    st.height = HH

plan = json.load(open(sys.argv[1]))
scene = Move(backend="headless")
scene.initialize()
r = (scene.opengl.info.get('GL_RENDERER') or "")
print("GL_RENDERER: " + r, flush=True)
# A silent fall back to the llvmpipe software renderer is ~80x slower; fail loudly instead
# of quietly turning a 2.5h render into days.
if any(x in r.lower() for x in ("llvmpipe","softpipe","swrast","software")) and os.environ.get("PROBE_ALLOW_SOFTWARE_GL") != "1":
    print("FATAL: software renderer -- aborting", flush=True); sys.exit(2)
# 1-SECOND GOP so the JOIN can stream-copy instead of re-encoding (added 2026-09-20).
# These clips are INTERMEDIATES -- they exist only to be cross-dissolved and then deleted,
# so a bigger file costs disk, never quality. The join is what the viewer receives.
# MEASURED, encoding directly from DepthFlow's own frames (12s clip, 1080p, ssaa 1.5):
#   default keyint : 1.54 MB,  2 keyframes (0.0s, 8.33s), render 9.0s
#   keyint=30      : 2.97 MB, 12 keyframes (every 1.0s),  render 8.6s
# So +92.8% size and NO render-time penalty (marginally faster, within noise).
# What it buys on a real 454-clip film: the interior of each clip becomes stream-copyable,
# 0% -> 71%, and the join drops from a measured 49.6 min to ~8.6 min. The finished film is
# also BETTER, because 71% of it stays bit-identical to what DepthFlow rendered instead of
# being re-encoded a second time by xfade.
# CAUTION: an earlier test measured +209% and I nearly abandoned this. That test re-encoded
# an ALREADY-COMPRESSED clip, paying the penalty twice. Encoding direct from frames is the
# only valid comparison. Do not "re-verify" this by transcoding a finished clip.
scene.ffmpeg.h264(preset="veryfast",
                  x264params=["keyint=30", "min-keyint=30", "no-open-gop"])

est = DepthAnythingV2(model="small")
done = 0; failed = []
t_all = time.time()
for p in plan:
    try:
        t0 = time.time()
        img = iio.imread(p["image"])
        # ONE estimate per image, reused for this render. 10.49s cold -> 0.02s warm.
        depth = est.estimate(img)
        scene.input(image=img, depth=depth)
        scene.state = DepthState()        # documented rule: reset between renders
        scene.move = p["move"]
        scene.main(output=p["out"], fps=${FPS}, time=p["time"],
                   width=${W}, height=${H}, ssaa=1.5)
        done += 1
        if done % 10 == 0 or done == len(plan):
            el = time.time()-t_all
            print("  %d/%d  %.1fs/clip  eta %.0f min" %
                  (done, len(plan), el/done, (len(plan)-done)*(el/done)/60), flush=True)
    except Exception as e:
        failed.append(p["id"])
        print("  FAILED %s: %s" % (p["id"], e), flush=True)
        traceback.print_exc()
print(json.dumps({"ok": not failed, "rendered": done, "failed": failed}), flush=True)
sys.exit(1 if failed else 0)
`);
const planFile = join(outDir, "_plan.json");
writeFileSync(planFile, JSON.stringify(todo, null, 1));

const t0 = Date.now();
const child = spawn("nice", ["-n", "19", py, runner, planFile], { stdio: ["ignore", "inherit", "inherit"] });
child.on("close", (code) => {
  const wall = (Date.now() - t0) / 1000;
  const rendered = plan.filter((p) => okClip(p.out, p.time)).length;
  console.log("\n" + JSON.stringify({
    ok: code === 0 && rendered === plan.length,
    scenes: plan.length, valid: rendered,
    wall_minutes: +(wall / 60).toFixed(1),
    moves: counts,
  }, null, 1));
  if (rendered !== plan.length) {
    console.error(`depthflow-render: ${plan.length - rendered} clip(s) still invalid -- re-run to resume`);
  }
  process.exit(rendered === plan.length ? 0 : 1);
});
