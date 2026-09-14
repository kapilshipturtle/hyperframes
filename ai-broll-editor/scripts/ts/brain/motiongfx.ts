// P8 motion graphics scheduling (spec 11.10). Also collects SFX candidates for P9 (grid clicks, tick trains, risers).
import type { MotionGfxItem, TextItem } from "../types.js";
import { layoutFamily, msToFrame } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { strongestWord } from "./emphasis.js";
import { verbatimRun } from "./shots.js";
import type { SfxCandidate } from "./sfx.js";

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
  // progress-bar-top (continuous, section-aware) is intentionally not emitted: it would force every segment to Remotion (11.13).
  return { gfx: gfx.sort((a, b) => a.from - b.from || a.id.localeCompare(b.id)), sfx };
}
