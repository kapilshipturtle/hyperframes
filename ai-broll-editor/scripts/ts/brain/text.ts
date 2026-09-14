// P7 text placement (spec 11.9 rules 1..7).
import type { TextItem, TextPosition, Word } from "../types.js";
import { layoutFamily, msToFrame } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { strongestWord } from "./emphasis.js";
import { verbatimRun } from "./shots.js";

const WINDOW_FRAMES = 1800;   // rule 6: 60 s window
const DENSITY_CAP = 0.5;
const NO_FLOATING_TEXT = new Set(["chapter-card", "end-card", "typographic-card", "quote-card", "stat-counter", "list-reveal", "lower-third", "grid-2", "grid-3", "grid-4"]);
const WORD_BY_WORD = new Set(["word-by-word-pop", "typewriter"]);

export const readingFrames = (wordCount: number): number => Math.max(45, Math.min(150, Math.round(30 * (0.9 + 0.35 * wordCount))));

export function placeText(ctx: Ctx, shots: WorkShot[]): TextItem[] {
  const items: (TextItem & { shotIdx: number; importance: number })[] = [];
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const plan = s.plan;
    if (!plan?.text || s.kind === "chapter-card" || s.kind === "end-card") continue;
    if (NO_FLOATING_TEXT.has(s.layout)) { if (layoutFamily(s.layout) === "grid") ctx.log.log("P7", "text-as-labels", `rule 4: text on ${s.layout} became labels or was dropped`, { beatId: s.beatId }); continue; }
    if (s.continuation && shots[i - 1]?.beatId === s.beatId && shots[i - 1].plan === plan) {
      // the first half already carried (or could not carry) this text
      if (items.some((t) => t.beatId === s.beatId)) continue;
    }
    const words: Word[] = s.wordIds.map((id) => ctx.wordById.get(id)!).filter(Boolean);
    const run = verbatimRun(plan.text.content, words);
    if (!run) { ctx.log.log("P7", "text-dropped", `"${plan.text.content}" is not a verbatim run inside shot ${s.id} (I5)`, { beatId: s.beatId }); continue; }
    const wc = run.length;
    if (wc > 6) { ctx.log.log("P7", "text-dropped", `"${plan.text.content}" has ${wc} words (> 6)`, { beatId: s.beatId }); continue; }
    // rule 1: anchor frame; re-anchor when the Director's anchor is outside the span or weak
    let anchor = plan.text.anchorWordId;
    const reasons: string[] = [];
    if (!run.includes(anchor) || (ctx.emphasis.get(anchor) ?? 0) < 0.5) {
      const strongest = strongestWord(ctx.emphasis, run);
      if (strongest !== anchor) reasons.push(`re-anchored #${anchor} -> #${strongest} (${run.includes(anchor) ? "weak" : "outside span"})`);
      anchor = strongest;
    }
    const beatEnd = s.cutFrame + s.netFrames;
    let from = msToFrame(ctx.wordById.get(anchor)!.startMs) - 2;
    if (from < s.cutFrame) from = s.cutFrame;
    // rule 2: duration
    const dur = Math.min(beatEnd - from - 5, readingFrames(wc));
    if (dur < 30) { ctx.log.log("P7", "text-dropped", `unreadable window (${dur} frames)`, { beatId: s.beatId }); continue; }
    // rule 3: position and collisions
    let position: TextPosition = plan.text.position;
    if (layoutFamily(s.layout) === "split") { position = s.layout === "split-left-media-right-text" ? "right-panel" : "left-panel"; reasons.push("split layout: text lives in the panel"); }
    else {
      if (position === "left-panel" || position === "right-panel") position = "lower-left";
      if (s.credit && position === "lower-right") { position = "lower-left"; reasons.push("collision with corner credit: moved to lower-left"); }
      if (ctx.job.captions && position === "lower-center") { position = "lower-left"; reasons.push("collision with caption band: moved to lower-left"); }
      // CLIP-detected subject centring is not available in assets.json; a centred subject would prefer lower-left/right (rule 3)
    }
    const item: TextItem & { shotIdx: number; importance: number } = {
      id: `t_${s.id}`, beatId: s.beatId, from, durationInFrames: dur, content: plan.text.content, style: plan.text.style, position, anchorWordId: anchor,
      shotIdx: i, importance: s.importance,
    };
    // rule 7: word-by-word styles use each word's own timestamps; a word under 4 frames borrows 2 from the next
    if (WORD_BY_WORD.has(plan.text.style)) {
      const ws = run.map((id) => ctx.wordById.get(id)!);
      const wf = ws.map((w) => ({ text: w.text, from: Math.max(from, msToFrame(w.startMs)), durationInFrames: Math.max(1, msToFrame(w.endMs) - msToFrame(w.startMs)) }));
      for (let k = 0; k < wf.length; k++) {
        if (wf[k].durationInFrames < 4 && k + 1 < wf.length) { wf[k].durationInFrames += 2; wf[k + 1].from += 2; wf[k + 1].durationInFrames = Math.max(1, wf[k + 1].durationInFrames - 2); }
        const end = Math.min(wf[k].from + wf[k].durationInFrames, from + dur);
        wf[k].durationInFrames = Math.max(1, end - wf[k].from);
        if (wf[k].from >= from + dur) wf[k].from = from + dur - 1;
      }
      item.wordFrames = wf;
    }
    items.push(item);
    ctx.log.log("P7", "text", `"${plan.text.content}" anchored #${anchor}, ${position}${reasons.length ? "; " + reasons.join("; ") : ""}`, { beatId: s.beatId, from, durationInFrames: dur });
  }
  // rule 6: density cap, at most 50 % of beats in any 60 s window carry text; drop lowest importance first
  const beatShots = shots.filter((s) => s.kind === "beat" || s.kind === "split");
  let changed = true;
  while (changed) {
    changed = false;
    for (const w0 of beatShots) {
      const inWin = beatShots.filter((s) => s.cutFrame >= w0.cutFrame && s.cutFrame < w0.cutFrame + WINDOW_FRAMES);
      const ids = new Set(inWin.map((s) => s.id));
      const carrying = items.filter((t) => ids.has(shots[t.shotIdx].id));
      if (inWin.length >= 2 && carrying.length / inWin.length > DENSITY_CAP) {
        const victim = carrying.slice().sort((a, b) => a.importance - b.importance || b.from - a.from)[0];
        items.splice(items.indexOf(victim), 1);
        ctx.log.log("P7", "text-dropped", `density cap: ${carrying.length}/${inWin.length} beats in the 60 s window from frame ${w0.cutFrame} carried text; dropped lowest importance (${victim.importance})`, { beatId: victim.beatId });
        changed = true; break;
      }
    }
  }
  return items.map(({ shotIdx: _s, importance: _i, ...t }) => t).sort((a, b) => a.from - b.from || a.id.localeCompare(b.id));
}
