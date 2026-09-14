// P5 transition assignment (spec 11.7). Works in ms (P6 re-checks the < 1.8 s rule after frame-domain merges).
import type { Direction, Mood, SectionKind, TransitionFamily, TransitionType } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { isStrong } from "./model.js";

export const PUNCHY: TransitionType[] = ["zoom-punch", "whip-pan", "glitch"];
const FAMILY_TYPES: Record<TransitionFamily, TransitionType[]> = {
  cut: ["cut"],
  energetic: ["zoom-punch", "whip-pan", "slide"],
  calm: ["fade", "luma-dissolve"],
  documentary: ["cut", "fade"],
  tech: ["glitch", "wipe"],
};
const MOOD_FAMILY: Record<Mood, TransitionFamily> = { energetic: "energetic", calm: "calm", documentary: "documentary", tech: "tech", dramatic: "calm" };
/** 11.7 duration ranges by type. */
export const DURATION_RANGE: Record<TransitionType, [number, number]> = {
  cut: [0, 0], fade: [12, 18], "luma-dissolve": [12, 18], wipe: [10, 14], slide: [10, 14], "push-blur": [10, 14],
  "zoom-punch": [6, 10], "whip-pan": [6, 10], glitch: [6, 10], flip: [12, 16], iris: [12, 16], clockWipe: [12, 16],
  "light-leak": [10, 14], "film-burn": [10, 14], shutter: [10, 14], pixelate: [10, 14],
};
const DIRECTIONAL: TransitionType[] = ["wipe", "slide", "push-blur", "whip-pan", "flip"];
const CADENCE: Record<SectionKind, number> = { hook: 1, explain: 2, story: 3, list: 2, comparison: 2, outro: 2 }; // one non-cut every N cuts
const GLITCH_MIN_GAP_MS = 60_000;
const SHORT_MS = 2200, FORCE_CUT_MS = 1800;

export function assignTransitions(ctx: Ctx, shots: WorkShot[]): void {
  let lastType: TransitionType = "cut";
  let lastNonCutIdx = -Infinity;
  let cutsSinceNonCut = 99;
  let lastGlitchMs = -Infinity;
  let whipDir: Direction = "from-left";
  let dirToggle = 0;
  let curSection = "";
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (s.sectionId !== curSection) { curSection = s.sectionId; cutsSinceNonCut = 99; }
    if (i === 0) { s.transitionIn = { type: "cut", durationInFrames: 0 }; ctx.log.log("P5", "transition:cut", "first shot", { beatId: s.beatId }); continue; }
    const prev = shots[i - 1];
    const sc = ctx.sectionById.get(s.sectionId)!;
    const kind = sc.section.kind;
    const spanMs = s.endMs - s.cutMs, prevSpan = prev.endMs - prev.cutMs;
    const reasons: string[] = [];
    let type: TransitionType;
    let pool: TransitionType[];
    if (s.kind === "chapter-card" || s.kind === "end-card" || prev.kind === "chapter-card" || s.layout === "typographic-card" || s.continuation) {
      // cards enter/exit with the section's default (calm) transition; continuations are invisible joins
      pool = s.continuation ? ["cut"] : ["fade"];
      reasons.push(s.continuation ? "continuation of the same media" : "card boundary uses the section default fade");
    } else {
      const fam: TransitionFamily = s.plan?.transitionFamily ?? MOOD_FAMILY[sc.mood];
      pool = FAMILY_TYPES[fam].slice();
      reasons.push(`family ${fam}${s.plan ? "" : " (from mood)"}`);
    }
    // cadence: at most one non-cut every N cuts (hook unlimited)
    const cadence = CADENCE[kind];
    const nonCutAllowed = cadence <= 1 || cutsSinceNonCut >= cadence;
    if (!nonCutAllowed && !pool.includes("cut") && !s.continuation) reasons.push(`cadence: ${kind} allows one visible transition every ${cadence} cuts`);
    let cands = nonCutAllowed ? pool : pool.filter((t) => t === "cut");
    if (!cands.length) cands = ["cut"];
    // rotation: no identical non-cut type twice in a row; never two zoom-punch in a row
    const rotated = cands.filter((t) => t === "cut" || t !== lastType);
    if (rotated.length) cands = rotated; else reasons.push("rotation: only one type available");
    // emphasis gating: zoom-punch only when the entering beat's first word is strong
    const firstWord = s.wordIds[0];
    if (cands.includes("zoom-punch") && !(firstWord !== undefined && isStrong(ctx, firstWord))) { cands = cands.filter((t) => t !== "zoom-punch"); reasons.push("zoom-punch gated: first word not strong"); }
    // glitch max once per 60 s
    if (cands.includes("glitch") && s.cutMs - lastGlitchMs < GLITCH_MIN_GAP_MS) { cands = cands.filter((t) => t !== "glitch"); reasons.push("glitch gated: once per 60 s"); }
    if (!cands.length) cands = ["cut"];
    const rng = ctx.rngFor(`transition:${s.id}`);
    type = cands.length === 1 ? cands[0] : cands[rng.int(cands.length)];
    // force cut if the entering shot is under 1.8 s
    if (type !== "cut" && spanMs < FORCE_CUT_MS) { type = "cut"; reasons.push(`entering shot ${spanMs} ms < 1.8 s: forced cut`); }
    if (type !== "cut" && prevSpan < 45 * 1000 / 30) { type = "cut"; reasons.push("previous shot too short to host the overlap"); }

    let [lo, hi] = DURATION_RANGE[type];
    let dur = type === "cut" ? 0 : lo + rng.int(hi - lo + 1);
    if (type !== "cut" && (spanMs < SHORT_MS || prevSpan < SHORT_MS)) { dur = Math.max(lo, dur - 2); reasons.push("scaled down 2 frames: adjacent shot under 2.2 s"); }
    const t: WorkShot["transitionIn"] = { type, durationInFrames: dur };
    if (DIRECTIONAL.includes(type)) {
      if (type === "whip-pan") { t.direction = whipDir; whipDir = whipDir === "from-left" ? "from-right" : "from-left"; }
      else { t.direction = (["from-left", "from-right", "from-top", "from-bottom"] as Direction[])[type === "wipe" ? dirToggle % 4 : dirToggle % 2]; dirToggle++; }
    }
    s.transitionIn = t;
    if (type === "cut") cutsSinceNonCut++; else { cutsSinceNonCut = 0; lastNonCutIdx = i; lastType = type; }
    if (type === "glitch") lastGlitchMs = s.cutMs;
    ctx.log.log("P5", `transition:${type}`, reasons.join("; "), { beatId: s.beatId, durationInFrames: dur });
  }
  void lastNonCutIdx;
}
