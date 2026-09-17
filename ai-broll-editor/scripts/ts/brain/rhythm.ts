// P4.5 RHYTHM: the two clocks that make a film read as edited rather than assembled.
//
// Measured across MKBHD / Fireship / Hormozi / a 22-video 963-cut corpus:
//
//   LAW 1 — the LAYOUT CLOCK. Layout family alternates every 20-40 s on a clock that is
//   INDEPENDENT of shot length. A pipeline with only one clock produces uniform texture
//   no matter how good each individual shot is; this is the likeliest single reason an
//   automated edit reads generic.
//
//   LAW 2 — the DELIBERATE SLOW-DOWN. Every measured long-form creator holds one shot
//   for 30-60 s at 72-92 % of runtime, and drops to 2-5 cuts in the final 30 s. Uniform
//   cutting throughout never feels professionally edited.
//
//   LAW 3 — the FRONT-LOADED HOOK. 10-18 cuts in the first 30 s, then settle.
//
// Law 3 falls out of beat segmentation (short sentences up front) and is only reported
// here. Laws 1 and 2 are enforced.
import type { WorkShot } from "./model.js";
import type { Ctx } from "./model.js";
import { layoutFamily } from "../types.js";
import { holdTargetFrames, holdWindowFrames, laws, type StylePreset } from "./style.js";

/** Pick the one shot that should carry the long hold, and mark it.
 *
 *  Chosen, not random: inside the 72-92 % window, prefer the shot that is already
 *  longest (it earned it), that carries no text (a hold under text fights the eye),
 *  and whose media can sustain a still frame. Returns the shot id, or null when no
 *  candidate qualifies — a film with nothing to hold on should not fake one. */
export function planLongHold(ctx: Ctx, shots: WorkShot[], totalFrames: number): string | null {
  const l = laws();
  const [lo, hi] = holdWindowFrames(totalFrames, l);
  const target = holdTargetFrames(totalFrames, 30, l);

  // Y2 (credited YouTube excerpt) clips are capped at MAX_Y2_FRAMES for licensing, so
  // they can never carry the hold — excluding them here avoids planning one that
  // quantise would then have to clamp.
  const inWindow = shots.filter((s) =>
    s.cutFrame >= lo && s.cutFrame <= hi && !s.continuation && s.asset?.tier !== "y2");
  if (!inWindow.length) {
    ctx.log.log("P4.5", "long-hold", `no shot starts inside the ${lo}-${hi} frame window; skipped`);
    return null;
  }
  // Prefer a video shot (a still held for 10 s+ reads as a slideshow), then the longest.
  const ranked = inWindow.slice().sort((a, b) => {
    const kind = (x: WorkShot) => (x.asset?.kind === "video" ? 0 : 1);
    return kind(a) - kind(b) || b.netFrames - a.netFrames || a.id.localeCompare(b.id);
  });
  const pick = ranked[0];
  pick.longHold = true;
  pick.longHoldTargetFrames = target;
  ctx.log.log("P4.5", "long-hold",
    `${pick.id} marked for the deliberate hold (${target} frames / ${(target / 30).toFixed(1)} s) at ` +
    `${((pick.cutFrame / totalFrames) * 100).toFixed(0)} % of runtime`, { beatId: pick.beatId });
  return pick.id;
}

/** Report the layout clock: how long the current layout family has been running.
 *
 *  This does NOT force a layout change — forcing one is what produced the
 *  manufactured split-screens. It marks shots where a change is DUE, so the layout
 *  chooser can prefer a different family when it has a legitimate option. */
export function markLayoutClock(ctx: Ctx, shots: WorkShot[], fps: number): void {
  const [minS, maxS] = laws().layout_period_seconds;
  const minF = minS * fps, maxF = maxS * fps;
  let runStart = 0;
  let runFamily = shots.length ? layoutFamily(shots[0].layout) : "";
  let due = 0;

  for (const s of shots) {
    const fam = layoutFamily(s.layout);
    if (fam !== runFamily) { runFamily = fam; runStart = s.cutFrame; continue; }
    const runLen = s.cutFrame - runStart;
    if (runLen >= maxF) {
      s.layoutChangeDue = "overdue";
      due++;
    } else if (runLen >= minF) {
      s.layoutChangeDue = "due";
    }
  }
  ctx.log.log("P4.5", "layout-clock",
    `${due} shot(s) where the layout family has run past ${maxS} s; a different family is preferred there`);
}

/** Report how the finished cut compares to the preset's dynamic profile. Reporting only:
 *  the numbers are targets to aim at, not invariants to fail on. */
export function reportRhythm(ctx: Ctx, shots: WorkShot[], totalFrames: number, p: StylePreset, fps: number): void {
  const durs = shots.map((s) => s.netFrames / fps).sort((a, b) => a - b);
  if (!durs.length) return;
  const n = durs.length;
  const median = durs[Math.floor(n / 2)];
  const p90 = durs[Math.min(n - 1, Math.floor(n * 0.9))];
  const mean = durs.reduce((a, b) => a + b, 0) / n;
  const swing = Math.sqrt(durs.reduce((a, d) => a + (d - mean) ** 2, 0) / n);
  const runtimeMin = totalFrames / fps / 60;
  const cpm = n / Math.max(runtimeMin, 1e-6);

  const miss: string[] = [];
  const inBand = (v: number, b: [number, number]) => v >= b[0] && v <= b[1];
  if (!inBand(median, p.pacing.median_shot_s)) miss.push(`median ${median.toFixed(1)}s vs ${p.pacing.median_shot_s.join("-")}s`);
  if (!inBand(p90, p.pacing.p90_shot_s)) miss.push(`p90 ${p90.toFixed(1)}s vs ${p.pacing.p90_shot_s.join("-")}s`);
  if (!inBand(cpm, p.pacing.cuts_per_min)) miss.push(`${cpm.toFixed(1)} cuts/min vs ${p.pacing.cuts_per_min.join("-")}`);
  if (swing < p.pacing.cutting_swing_min_s) miss.push(`cutting swing ${swing.toFixed(2)}s below ${p.pacing.cutting_swing_min_s}s (too metronomic)`);

  ctx.log.log("P4.5", "rhythm",
    `median ${median.toFixed(1)}s, p90 ${p90.toFixed(1)}s, ${cpm.toFixed(1)} cuts/min, swing ${swing.toFixed(2)}s`);
  for (const m of miss) ctx.log.warn(`rhythm: ${m}`);
}
