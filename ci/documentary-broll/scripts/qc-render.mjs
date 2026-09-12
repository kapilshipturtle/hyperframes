#!/usr/bin/env node
// qc-render.mjs — the ONLY trustworthy pass/fail check on a rendered MP4.
//
// WHY THIS EXISTS
// ---------------
// Three consecutive films were reported to the user as verified — "0 black
// spans, 0.00%" — while the user kept replying that there were black scenes.
// The user was right every time. The gate was blind:
//
//   blackdetect has black_min_duration (d) default 2.0s and
//   picture_black_ratio_th (pic_th) default 0.98. It detects black frames
//   internally and then SILENTLY DISCARDS any run shorter than d. Our gate ran
//   d=0.20, so everything under 0.2s vanished, and 2fps luma sampling missed
//   the rest.
//
// Measured on the delivered 12:14 film:
//   blackdetect d=0.20  ->     0 spans   ("clean")
//   blackframe          -> 1303+ frames, 13 runs, 43.4s = 6% of the film
//
// blackframe has NO minimum-duration floor: it reports every offending frame.
// That is the difference between a check and a rubber stamp.
//
// Usage:
//   node qc-render.mjs --video <file.mp4> [--project .] [--fps 30]
//                      [--allow-black N] [--json out.json]
//
// Exits 1 on any blocking failure. Intended to run before ANY delivery.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const argv = process.argv.slice(2);
const flag = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};

const video = flag("video");
const projectDir = flag("project", ".");
const fps = Number(flag("fps", "30"));
// A black frame is NEVER acceptable by default. The escape hatch exists only so
// a known-and-accepted engine defect (ISS-0045) can be acknowledged explicitly
// on the command line rather than silently tolerated in the code.
const allowBlack = Number(flag("allow-black", "0"));
const jsonOut = flag("json", null);

if (!video || !existsSync(video)) {
  console.error(`✗ qc-render: --video <file.mp4> is required (got ${JSON.stringify(video)})`);
  process.exit(1);
}

const fails = [];
const warns = [];
const oks = [];
const report = { video, checks: {} };

// ffmpeg writes filter reports (blackframe, freezedetect, ebur128) to STDERR,
// and execFileSync only hands back stdout on success — so a successful run
// returned an EMPTY string and every stderr-based check silently reported zero
// findings. Capture both streams explicitly and always concatenate them.
function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  return `${r.stdout || ""}${r.stderr || ""}`;
}

// ── duration / container ──────────────────────────────────────────────────────
const probe = sh("ffprobe", [
  "-v", "error", "-show_entries", "format=duration",
  "-show_entries", "stream=codec_name,width,height,nb_frames",
  "-of", "default=nw=1", video,
]);
const durSec = Number((probe.match(/duration=([\d.]+)/) || [])[1] || 0);
const nbFrames = Number((probe.match(/nb_frames=(\d+)/) || [])[1] || 0);
report.checks.container = { durationSeconds: durSec, frames: nbFrames };
oks.push(`container: ${durSec.toFixed(2)}s, ${nbFrames} frames`);

// ── 1. BLACK FRAMES — blackframe, no duration floor (THE check) ───────────────
// amount=90: a frame counts when >=90% of its pixels are below threshold.
// threshold=32: luma 32/255, i.e. genuinely black rather than merely dark.
{
  const out = sh("ffmpeg", [
    "-nostdin", "-v", "info", "-i", video,
    "-vf", "blackframe=amount=90:threshold=32", "-an", "-f", "null", "-",
  ]);
  // ffmpeg interleaves its own progress line ("frame=  113 fps=... speed=") on
  // the SAME output line as the blackframe report, so anchor on the filter's
  // own tag, not on line structure. Getting this wrong made the check report
  // "black frames: 0" on a file with 9 of them.
  const rows = [...out.matchAll(/Parsed_blackframe[^\n]*?frame:(\d+) pblack:(\d+)[^\n]*?t:([\d.]+)/g)]
    .map((m) => ({ frame: Number(m[1]), pblack: Number(m[2]), t: Number(m[3]) }));
  // contiguous runs
  const runs = [];
  for (const r of rows) {
    const last = runs[runs.length - 1];
    if (last && r.frame === last.endFrame + 1) { last.endFrame = r.frame; last.endT = r.t; }
    else runs.push({ startFrame: r.frame, endFrame: r.frame, startT: r.t, endT: r.t });
  }
  const totalSec = rows.length / fps;
  report.checks.blackFrames = { count: rows.length, runs: runs.length, seconds: +totalSec.toFixed(3),
    worst: runs.slice().sort((a, b) => (b.endFrame - b.startFrame) - (a.endFrame - a.startFrame)).slice(0, 5) };
  if (rows.length > allowBlack) {
    const worst = report.checks.blackFrames.worst
      .map((r) => `${r.startT.toFixed(2)}s (${r.endFrame - r.startFrame + 1}f)`).join(", ");
    fails.push(
      `BLACK FRAMES: ${rows.length} frame(s) in ${runs.length} run(s) = ${totalSec.toFixed(2)}s ` +
      `(${(100 * totalSec / Math.max(1, durSec)).toFixed(2)}% of the film). Worst: ${worst}. ` +
      `blackdetect reports 0 for these — its 2s duration floor discards them (ISS-0044).`,
    );
  } else {
    oks.push(`black frames: ${rows.length}${allowBlack ? ` (allowed ${allowBlack})` : ""}`);
  }
}

// ── 2. FREEZE / duplicate frames — a shot that stops moving ───────────────────
{
  const out = sh("ffmpeg", [
    "-nostdin", "-v", "info", "-i", video,
    "-vf", "freezedetect=n=-60dB:d=0.5", "-an", "-f", "null", "-",
  ]);
  const starts = [...out.matchAll(/freeze_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const durs = [...out.matchAll(/freeze_duration: ([\d.]+)/g)].map((m) => Number(m[1]));
  report.checks.freeze = { count: starts.length, spans: starts.map((t, i) => ({ t, d: durs[i] ?? null })) };
  if (starts.length) {
    const worst = Math.max(...durs.filter(Number.isFinite), 0);
    // A deliberate freeze-frame is a real device in this skill, so this warns.
    warns.push(`freeze: ${starts.length} span(s) >=0.5s (longest ${worst.toFixed(2)}s) — confirm each is a deliberate freeze`);
  } else oks.push("freeze: none >=0.5s");
}

// ── 3. SOLID / FLAT frames — a flash to white or any single colour ────────────
// blackframe only catches black. YMIN ~= YMAX means the frame is one flat tone.
{
  const out = sh("ffprobe", [
    "-v", "error", "-f", "lavfi",
    "-i", `movie=${video.replace(/\\/g, "/").replace(/:/g, "\\:")},signalstats`,
    "-show_entries", "frame=pkt_pts_time",
    "-show_entries", "frame_tags=lavfi.signalstats.YMIN,lavfi.signalstats.YMAX,lavfi.signalstats.YAVG",
    "-of", "csv=p=0",
  ]);
  const flat = [];
  const luma = [];
  for (const line of out.split("\n")) {
    const p = line.split(",").map(Number);
    if (p.length < 4 || !Number.isFinite(p[0])) continue;
    // ffprobe emits frame_tags in ITS OWN alphabetical order, not the order
    // requested: the columns are time,YMIN,YAVG,YMAX. Reading them positionally
    // as time,YMIN,YMAX,YAVG reported a luma mean of 235.5 on footage whose
    // real mean is 75.8 — verified against the raw CSV.
    const [t, ymin, yavg, ymax] = p;
    luma.push(yavg);
    if (ymax - ymin < 5) flat.push({ t, ymin, ymax, yavg });
  }
  report.checks.flatFrames = { count: flat.length, sample: flat.slice(0, 5) };
  if (luma.length) {
    const mean = luma.reduce((a, b) => a + b, 0) / luma.length;
    report.checks.luma = { frames: luma.length, mean: +mean.toFixed(1), min: Math.min(...luma), max: Math.max(...luma) };
    oks.push(`luma: mean ${mean.toFixed(1)}, min ${Math.min(...luma).toFixed(1)}, max ${Math.max(...luma).toFixed(1)} over ${luma.length} frames`);
  }
  if (flat.length > allowBlack) {
    fails.push(`FLAT FRAMES: ${flat.length} frame(s) are a single solid tone (YMAX-YMIN<5), e.g. t=${flat.slice(0, 3).map((f) => f.t.toFixed(2)).join(", ")}s`);
  } else oks.push(`flat frames: ${flat.length}`);
}

// ── 4. CUT TIMING vs the plan ─────────────────────────────────────────────────
// Detected scene changes must line up with the storyboard's planned cuts.
// ±1 frame is rounding; >4 frames is a real defect; a CONSISTENT offset on every
// cut is a logic bug regardless of size.
{
  const sbPath = `${projectDir}/STORYBOARD.md`;
  const beatsPath = `${projectDir}/.hyperframes/beats.json`;
  let planned = null;
  if (existsSync(beatsPath)) {
    try {
      const beats = JSON.parse(readFileSync(beatsPath, "utf8")).beats || [];
      let t = 0; planned = [];
      for (const b of beats) { t += b.durationSeconds; planned.push(+t.toFixed(3)); }
      planned.pop(); // the final boundary is the end of the film, not a cut
    } catch {}
  }
  if (!planned || !planned.length) {
    warns.push(`cut timing: no beats.json at ${beatsPath} — cannot verify cuts against the plan`);
  } else {
    const out = sh("ffmpeg", [
      "-nostdin", "-v", "info", "-i", video,
      "-vf", "select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-",
    ]);
    const detected = [...out.matchAll(/pts_time:([\d.]+)/g)].map((m) => Number(m[1]));
    const tolFrames = 4;
    const tol = tolFrames / fps;
    const drifts = [];
    let missing = 0;
    for (const p of planned) {
      const near = detected.reduce((best, d) => (Math.abs(d - p) < Math.abs(best - p) ? d : best), Infinity);
      if (!Number.isFinite(near) || Math.abs(near - p) > 1.0) { missing++; continue; }
      drifts.push(+(near - p).toFixed(4));
    }
    report.checks.cutTiming = { plannedCuts: planned.length, detected: detected.length, missing, drifts: drifts.slice(0, 20) };
    const bad = drifts.filter((d) => Math.abs(d) > tol);
    // a consistent offset is a logic bug even when small
    const mean = drifts.length ? drifts.reduce((a, b) => a + b, 0) / drifts.length : 0;
    const consistent = drifts.length >= 5 && Math.abs(mean) > 1 / fps && drifts.every((d) => Math.sign(d) === Math.sign(mean));
    if (bad.length) fails.push(`CUT TIMING: ${bad.length} cut(s) drift more than ${tolFrames} frames from the plan (worst ${Math.max(...bad.map(Math.abs)).toFixed(3)}s)`);
    else if (consistent) fails.push(`CUT TIMING: every cut is offset in the same direction by ${(mean * fps).toFixed(2)} frames — a consistent offset is an assembly logic bug, not rounding`);
    else oks.push(`cut timing: ${drifts.length}/${planned.length} cuts within ${tolFrames} frames (${missing} undetected — soft transitions read as no scene change)`);
  }
}

// ── 5. LOUDNESS ───────────────────────────────────────────────────────────────
{
  const out = sh("ffmpeg", ["-nostdin", "-hide_banner", "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"]);
  // ebur128 emits a per-window running log AND a final "Summary:" block. A
  // plain regex matches the FIRST window (~-70 LUFS on a fade-in) instead of
  // the integrated figure — it reported -70 LUFS for a film that measures
  // -18.9. Parse the Summary block only.
  const sumIdx = out.lastIndexOf("Summary:");
  const tail = sumIdx >= 0 ? out.slice(sumIdx) : out;
  const I = Number((tail.match(/I:\s*(-?[\d.]+) LUFS/) || [])[1]);
  const peak = Number((tail.match(/Peak:\s*(-?[\d.]+) dBFS/) || [])[1]);
  const lra = Number((tail.match(/LRA:\s*([\d.]+) LU/) || [])[1]);
  report.checks.loudness = { I, peak, lra };
  if (Number.isFinite(I)) {
    if (I < -24 || I > -12) warns.push(`loudness ${I} LUFS is outside the -24..-12 web range`);
    if (peak > -0.5) warns.push(`true peak ${peak} dBFS is close to clipping`);
    oks.push(`loudness: ${I} LUFS, peak ${peak} dBFS, LRA ${lra}`);
  } else warns.push("loudness: no audio stream measured");
}

// ── report ────────────────────────────────────────────────────────────────────
console.log("qc-render — the checks a viewer would notice, not the ones that pass easily\n");
for (const m of oks) console.log(`  ✓ ${m}`);
for (const m of warns) console.log(`  ⚠ ${m}`);
for (const m of fails) console.error(`  ✗ ${m}`);
console.log(`\n${fails.length ? "✗" : "✓"} qc-render: ${oks.length} passed, ${warns.length} warning(s), ${fails.length} failure(s)`);
if (jsonOut) { writeFileSync(jsonOut, JSON.stringify(report, null, 2)); console.log(`  report → ${jsonOut}`); }
if (fails.length) { console.error("  DO NOT DELIVER this file."); process.exit(1); }
