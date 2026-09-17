// P8 motion graphics scheduling (spec 11.10). Also collects SFX candidates for P9 (grid clicks, tick trains, risers).
import type { MotionGfxItem, TextItem } from "../types.js";
import { layoutFamily, msToFrame } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { strongestWord } from "./emphasis.js";
import { verbatimRun } from "./shots.js";
import type { SfxCandidate } from "./sfx.js";
import { findTriggers, GRAPHIC_FOR, HOLD_SECONDS, type Trigger } from "./triggers.js";

export function scheduleMotionGfx(ctx: Ctx, shots: WorkShot[], texts: TextItem[]): { gfx: MotionGfxItem[]; sfx: SfxCandidate[] } {
  const gfx: MotionGfxItem[] = [];
  const sfx: SfxCandidate[] = [];
  const riserDone = new Set<string>();
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const kind = ctx.sectionById.get(s.sectionId)?.section.kind ?? "explain";
    const beatEnd = s.cutFrame + s.netFrames;
    // stat-counter: count duration = min(60, beatFrames - 20); ticks every 6 frames while counting (one SFX event for spacing)
    if (s.layout === "stat-counter" && s.stat) {
      const countFrames = Math.max(1, Math.min(60, s.netFrames - 20));
      const from = s.cutFrame + 4;
      gfx.push({ id: `g_${s.id}_stat`, beatId: s.beatId, type: "stat-counter", from, durationInFrames: Math.max(countFrames, beatEnd - from - 5), params: { ...s.stat, countFrames } });
      (s as WorkShot & { statCountFrames?: number }).statCountFrames = countFrames;
      for (let f = from; f < from + countFrames; f += 6) sfx.push({ frame: f, tag: "tick", kind: "tick-train", priority: 1, sectionKind: kind, reason: `counter tick ${s.beatId}`, strong: false });
      ctx.log.log("P8", "stat-counter", `count ${countFrames} frames from ${from}`, { beatId: s.beatId, from, durationInFrames: countFrames });
    }
    // grid-N: cell k at from + 6 + k * stagger, labels 4 frames later, click per cell
    if (layoutFamily(s.layout) === "grid") {
      const N = s.media.length;
      const stagger = Math.max(4, Math.min(10, Math.floor((s.netFrames - 30) / (N + 1))));
      (s as WorkShot & { gridStaggerFrames?: number }).gridStaggerFrames = stagger;
      for (let k = 0; k < N; k++) sfx.push({ frame: s.cutFrame + 6 + k * stagger, tag: "click", kind: "grid-cell", priority: 1, sectionKind: kind, reason: `grid cell ${k + 1} ${s.beatId}`, strong: false });
      ctx.log.log("P8", "grid-reveal", `${N} cells, stagger ${stagger}, labels +4`, { beatId: s.beatId, from: s.cutFrame + 6 });
    }
    // list-reveal: line k at the start frame of the word that begins line k minus 2
    if (s.layout === "list-reveal" && s.listLines) {
      const words = s.wordIds.map((w) => ctx.wordById.get(w)!).filter(Boolean);
      const lines = s.listLines.map((text, k) => {
        const run = verbatimRun(text, words);
        const at = run ? Math.max(s.cutFrame, msToFrame(ctx.wordById.get(run[0])!.startMs) - 2) : s.cutFrame + 6 + k * 10;
        return { text, atFrame: at };
      });
      (s as WorkShot & { listLinesTimed?: { text: string; atFrame: number }[] }).listLinesTimed = lines;
      gfx.push({ id: `g_${s.id}_list`, beatId: s.beatId, type: "checklist-tick", from: lines[0].atFrame, durationInFrames: Math.max(10, beatEnd - lines[0].atFrame - 5), params: { lines } });
      ctx.log.log("P8", "list-reveal", lines.map((l) => `${l.atFrame}:"${l.text}"`).join(", "), { beatId: s.beatId });
    }
    // highlight-marker text -> underline-draw anchored to the strongest word, 10 frame draw-on
    for (const t of texts.filter((t) => t.beatId === s.beatId && t.style === "highlight-marker")) {
      const words = s.wordIds.length ? s.wordIds : [t.anchorWordId];
      const w = ctx.wordById.get(strongestWord(ctx.emphasis, words));
      const from = Math.max(t.from, w ? msToFrame(w.startMs) - 2 : t.from);
      gfx.push({ id: `g_${s.id}_underline`, beatId: s.beatId, type: "underline-draw", from, durationInFrames: Math.max(10, t.from + t.durationInFrames - from), params: { drawFrames: 10, textId: t.id } });
    }
    // corner credit for CC / Y1 / Y2 clips for the whole clip duration
    if (s.credit) {
      gfx.push({ id: `g_${s.id}_credit`, beatId: s.beatId, type: "corner-credit", from: s.cutFrame, durationInFrames: s.netFrames, params: { text: s.credit.text, corner: s.credit.corner ?? "bottom-right", tier: s.tier ?? "stock" } });
    }
    // chapter-card: riser-short once per section, starting 45 frames before the card
    if (s.kind === "chapter-card" && !riserDone.has(s.sectionId) && s.cutFrame >= 45) {
      riserDone.add(s.sectionId);
      sfx.push({ frame: s.cutFrame - 45, tag: "riser-short", kind: "riser", priority: 3, sectionKind: kind, reason: `riser before chapter-card ${s.id}`, strong: false });
    }
  }
  // ---- P8b: graphics on ORDINARY shots -------------------------------------
  //
  // Everything above requires a special layout (stat card, grid, list reveal),
  // so a film of plain full-screen clips got ZERO graphics and read as a
  // narrated slideshow. The renderer never had this restriction — motiongfx is
  // an independent track above all b-roll — so the fix belongs here.
  //
  // A graphic is earned by something SPOKEN, placed within +/-1 s of its
  // trigger word (measured: 73 % of real b-roll inserts sit in that window),
  // never on a timer. Cadence-driven decoration is the very thing that makes an
  // edit look automated.
  gfx.push(...planTriggeredGfx(ctx, shots, gfx));

  // progress-bar-top (continuous, section-aware) is intentionally not emitted: it would force every segment to Remotion (11.13).
  return { gfx: gfx.sort((a, b) => a.from - b.from || a.id.localeCompare(b.id)), sfx };
}


/** Frames a graphic may sit from its trigger word: the measured +/-1 s window. */
const TRIGGER_WINDOW_FRAMES = 30;
/** Corpus median gap between visual inserts is 9 s; this floor keeps a dense
 *  passage from turning into clutter while still allowing ~13 events / 2 min. */
const MIN_GAP_FRAMES = 135; // 4.5 s
/** Graphics must never crowd the film's one deliberate hold: that bare moment
 *  is measured and intentional. */
const HOLD_KEEPOUT = true;

/** Plan one graphic per eligible shot from what the narration actually says. */
function planTriggeredGfx(ctx: Ctx, shots: WorkShot[], existing: MotionGfxItem[]): MotionGfxItem[] {
  const out: MotionGfxItem[] = [];
  const busy = existing.map((g) => g.from).sort((a, b) => a - b);
  let lastFrom = -Infinity;
  let lastType = "";

  for (const s of shots) {
    if (s.longHold && HOLD_KEEPOUT) continue;           // keep the payoff bare
    if (layoutFamily(s.layout) !== "fullscreen") continue; // specials are handled above
    if (existing.some((g) => g.beatId === s.beatId)) continue; // one per shot
    if (s.netFrames < 60) continue;                     // nothing under 2 s

    const words = s.wordIds.map((id) => ctx.wordById.get(id)!).filter(Boolean);
    if (!words.length) continue;

    // Highest-priority trigger in this shot; ties break on word order.
    const cands = findTriggers(words).filter((t) => GRAPHIC_FOR[t.kind]);
    if (!cands.length) continue;
    cands.sort((a, b) => b.priority - a.priority || a.wordId - b.wordId);

    const pick = cands.find((t) => GRAPHIC_FOR[t.kind] !== lastType) ?? cands[0];
    const type = GRAPHIC_FOR[pick.kind]!;
    if (type === lastType) continue;                    // never twice in a row

    const w = ctx.wordById.get(pick.wordId)!;
    // Land ~10 frames BEFORE the word: a graphic that appears exactly on the
    // word feels mechanical, one that is already arriving reads as intentional.
    let from = msToFrame(w.startMs) - 10;
    from = Math.max(s.cutFrame, Math.min(from, s.cutFrame + s.netFrames - 45));
    if (Math.abs(from - (msToFrame(w.startMs) - 10)) > TRIGGER_WINDOW_FRAMES) continue;
    if (from - lastFrom < MIN_GAP_FRAMES) continue;
    if (busy.some((b) => Math.abs(b - from) < MIN_GAP_FRAMES)) continue;

    const hold = Math.round(HOLD_SECONDS[pick.kind] * 30);
    const dur = Math.max(45, Math.min(hold, s.cutFrame + s.netFrames - from - 5));
    if (dur < 45) continue;                             // under 1.5 s is unreadable

    out.push({
      id: `g_${s.id}_${pick.kind}`, beatId: s.beatId, type: type as MotionGfxItem["type"],
      from, durationInFrames: dur, params: paramsFor(pick, ctx),
    });
    lastFrom = from; lastType = type;
    ctx.log.log("P8b", `gfx:${type}`, `"${pick.text}" (${pick.kind}) at frame ${from}`, { beatId: s.beatId, from, durationInFrames: dur });
  }
  return out;
}

/** Build the renderer params for a trigger. Kept deliberately frame-anchored:
 *  we cannot locate objects in the footage, and a circle around nothing is
 *  worse than no circle. */
function paramsFor(t: Trigger, _ctx: Ctx): Record<string, unknown> {
  switch (t.kind) {
    case "number": {
      const n = Number(t.text.replace(/[^0-9.]/g, ""));
      const prefix = t.text.startsWith("$") ? "$" : "";
      const suffix = /%/.test(t.text) ? "%"
        : /\b(million|billion|trillion|thousand)\b/i.exec(t.text)?.[0] ?? "";
      return { value: Number.isFinite(n) ? n : 0, prefix, suffix: suffix ? ` ${suffix}` : "", label: "", countFrames: 60 };
    }
    case "comparison":
      return { labels: ["", ""], values: [100, 55] };
    case "enumeration":
      return { lines: [{ text: t.text, atFrame: 0 }] };
    default:
      return { label: t.text };
  }
}