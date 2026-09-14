// P1 beat repair + P2 cut points (spec 11.5, 3.1).
import type { Beat, Word } from "../types.js";
import { MAX, MIN, CONJ, span, mergeShort } from "../segment.js";
import type { Ctx, Cut } from "./model.js";
import { isStrong } from "./model.js";

const PAUSE_MS = 900;          // 11.5 long pause inside a beat
const PAUSE_SPLIT_MIN_MS = 4500;
const PREROLL_CARD_MS = 2000;  // 11.5 first shot: speech later than 2.0 s -> chapter-card pre-roll
const CARD_MIN_MS = 2000, CARD_MAX_MS = 3000; // 60..90 frames

/** splitLong variant: same scoring as section 6 plus a bonus for splitting right before a strong word (11.4 a). */
function splitLongStrong(ctx: Ctx, ws: Word[]): Word[][] {
  if (span(ws) <= MAX || ws.length < 4) return [ws];
  let best = 1, bv = -Infinity;
  for (let i = 1; i <= ws.length - 2; i++) {
    const v = (/,$/.test(ws[i].text) ? 3 : 0) + (CONJ.has(ws[i + 1].text.toLowerCase()) ? 2 : 0)
      + (ws[i + 1].startMs - ws[i].endMs) / 200 - Math.abs((i + 1) - ws.length / 2) / ws.length
      + (isStrong(ctx, ws[i + 1].id) ? 2.5 : 0);
    if (v > bv) { bv = v; best = i; }
  }
  return [...splitLongStrong(ctx, ws.slice(0, best + 1)), ...splitLongStrong(ctx, ws.slice(best + 1))];
}

/**
 * P1: enforce 1.5..6.0 s on every beat, keeping word alignment. Works section by section so beats never cross sections.
 * Split beats keep the parent id with a suffix (b_0001, b_0001s2); merged beats keep the earlier id.
 * Returns new beats and a map beatId -> constituent original beat ids (for plan lookup).
 */
export function repairBeats(ctx: Ctx): { beats: Beat[]; parts: Map<string, string[]> } {
  const out: Beat[] = [];
  const parts = new Map<string, string[]>();
  const words = ctx.words;
  for (const sc of ctx.sections) {
    const secBeats = sc.section.beatIds.map((id) => ctx.beatById.get(id)!).filter(Boolean);
    type G = { ws: Word[]; ids: string[] };
    let groups: G[] = [];
    for (const b of secBeats) {
      const ws = b.wordIds.map((id) => ctx.wordById.get(id)!).filter(Boolean);
      if (!ws.length) continue;
      const pieces = splitLongStrong(ctx, ws);
      pieces.forEach((p, i) => {
        groups.push({ ws: p, ids: [b.id] });
        if (pieces.length > 1) ctx.log.log("P1", "split-beat", `beat ${b.id} span ${span(ws)} ms > ${MAX}; piece ${i + 1}/${pieces.length}`, { beatId: b.id });
      });
    }
    // merge short (on word span, same as section 6) and remember constituents
    const merged = mergeShort(groups.map((g) => g.ws));
    const rebuilt: G[] = merged.map((ws) => {
      const idSet: string[] = [];
      for (const g of groups) if (g.ws.some((w) => ws.includes(w))) for (const id of g.ids) if (!idSet.includes(id)) idSet.push(id);
      return { ws, ids: idSet };
    });
    if (rebuilt.length !== groups.length) ctx.log.log("P1", "merge-short", `section ${sc.section.id}: ${groups.length} -> ${rebuilt.length} beats after merging < ${MIN} ms`);
    groups = rebuilt;
    // ids: earlier constituent id; duplicates (a beat split in two) get s2, s3...
    const used = new Map<string, number>();
    for (const g of groups) {
      const base = g.ids[0];
      const n = (used.get(base) ?? 0) + 1; used.set(base, n);
      const id = n === 1 ? base : `${base}s${n}`;
      out.push({ id, sectionId: sc.section.id, startMs: g.ws[0].startMs, endMs: g.ws[g.ws.length - 1].endMs, wordIds: g.ws.map((w) => w.id),
        text: g.ws.map((w) => w.text).join(" "), nextWordStartMs: null, emphasisWordIds: [] });
      parts.set(id, g.ids);
    }
  }
  for (let i = 0; i < out.length; i++) {
    const nextFirst = out[i + 1] ? words[out[i + 1].wordIds[0]] : undefined;
    out[i].nextWordStartMs = nextFirst ? nextFirst.startMs : null;
    const orig = parts.get(out[i].id) ?? [];
    out[i].emphasisWordIds = orig.flatMap((id) => ctx.beatById.get(id)?.emphasisWordIds ?? []).filter((w) => out[i].wordIds.includes(w));
  }
  return { beats: out, parts };
}

/** 11.5 cut ms for a beat whose first word is w: 100 ms lead, never before previous word end + 40. */
export function beatCutMs(ctx: Ctx, firstWordId: number): number {
  const w = ctx.wordById.get(firstWordId)!;
  const prev = ctx.wordById.get(firstWordId - 1);
  const earliest = prev ? prev.endMs + 40 : 0;
  return Math.max(earliest, w.startMs - ctx.leadMs);
}

/** P2: cut points in ms including chapter-card pre-roll, section chapter-cards, long-pause splits and the end-card. */
export function cutPoints(ctx: Ctx, beats: Beat[]): Cut[] {
  const cuts: Cut[] = [];
  const durationMs = ctx.transcript.durationMs;
  const words = ctx.words;
  if (beats.length === 0) {
    cuts.push({ id: "end-card", beatId: "none", sectionId: ctx.sections[0]?.section.id ?? "sec_01", kind: "end-card", cutMs: 0, endMs: durationMs, wordIds: [], reason: "no words: end-card fills everything" });
    return cuts;
  }
  const sectionCardDone = new Set<string>();
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i], next = beats[i + 1];
    const firstWord = ctx.wordById.get(b.wordIds[0])!;
    let cutMs = i === 0 ? 0 : beatCutMs(ctx, b.wordIds[0]);
    const endMs = next ? beatCutMs(ctx, next.wordIds[0]) : durationMs;
    let reason = i === 0 ? "first shot starts at 0" : `word #${b.wordIds[0]} start ${firstWord.startMs} minus lead ${ctx.leadMs}`;
    const sc = ctx.sectionById.get(b.sectionId);
    let cardWordCount = 0;
    const isSectionFirst = sc?.section.beatIds.length ? beats.findIndex((x) => x.sectionId === b.sectionId) === i : false;

    // 11.5 first shot: speech later than 2.0 s -> chapter-card pre-roll, cut to the first B-roll 100 ms before the first word
    if (i === 0 && firstWord.startMs > PREROLL_CARD_MS) {
      const cardEnd = firstWord.startMs - ctx.leadMs;
      cuts.push({ id: `${b.id}-card`, beatId: b.id, sectionId: b.sectionId, kind: "chapter-card", cutMs: 0, endMs: cardEnd, wordIds: [],
        reason: `speech starts at ${firstWord.startMs} ms (> 2.0 s): chapter-card pre-roll` });
      cutMs = cardEnd; reason = `first B-roll ${ctx.leadMs} ms before word #${b.wordIds[0]} after pre-roll card`;
      sectionCardDone.add(b.sectionId);
    } else if (isSectionFirst && sc && (sc.section.kind === "hook" || sc.section.kind === "story") && sc.section.title && !sectionCardDone.has(b.sectionId)) {
      // 11.5 section boundary: chapter-card 60..90 frames if the section has a title; the first B-roll follows on a WORD START
      // (rule 3.1: visual changes land on word starts), so the card end snaps to the beat word closest to 2.5 s in.
      let best: { ms: number; idx: number } | null = null;
      for (let k = 1; k < b.wordIds.length; k++) {
        const ms = beatCutMs(ctx, b.wordIds[k]);
        const cardMs = ms - cutMs;
        if (cardMs < CARD_MIN_MS || cardMs > CARD_MAX_MS || endMs - ms < MIN) continue;
        if (!best || Math.abs(cardMs - 2500) < Math.abs(best.ms - cutMs - 2500)) best = { ms, idx: k };
      }
      if (best) {
        cuts.push({ id: `${b.id}-card`, beatId: b.id, sectionId: b.sectionId, kind: "chapter-card", cutMs, endMs: best.ms, wordIds: b.wordIds.slice(0, best.idx),
          reason: `section ${sc.section.id} (${sc.section.kind}) titled "${sc.section.title}": chapter-card ${best.ms - cutMs} ms, ends on word #${b.wordIds[best.idx]} start` });
        cardWordCount = best.idx;
        cutMs = best.ms; reason = `first B-roll of ${sc.section.id} after chapter-card, word #${b.wordIds[best.idx]}`;
        sectionCardDone.add(b.sectionId);
      } else {
        ctx.log.log("P2", "skip-chapter-card", `section ${sc.section.id}: no word start 2..3 s into the first beat leaves a 1.5 s B-roll`, { beatId: b.id });
      }
    }

    // words spoken inside [cutMs, endMs)
    const inside = b.wordIds.slice(cardWordCount);
    // 11.5 long pause inside the beat: > 900 ms and beat > 4.5 s -> split at pause end minus lead, second half is a held moment
    const spanMs = endMs - cutMs;
    let splitAt: { ms: number; idx: number } | null = null;
    if (spanMs > PAUSE_SPLIT_MIN_MS) {
      for (let k = 0; k + 1 < inside.length; k++) {
        const w = words[inside[k]], n = words[inside[k + 1]];
        if (n.startMs - w.endMs > PAUSE_MS) {
          const ms = n.startMs - ctx.leadMs;
          if (ms - cutMs >= MIN && endMs - ms >= MIN) { splitAt = { ms, idx: k + 1 }; break; }
        }
      }
    }
    if (splitAt) {
      cuts.push({ id: b.id, beatId: b.id, sectionId: b.sectionId, kind: "beat", cutMs, endMs: splitAt.ms, wordIds: inside.slice(0, splitAt.idx), reason });
      cuts.push({ id: `${b.id}-held`, beatId: b.id, sectionId: b.sectionId, kind: "split", cutMs: splitAt.ms, endMs, wordIds: inside.slice(splitAt.idx), heldMoment: true,
        reason: `pause > ${PAUSE_MS} ms inside beat over 4.5 s: split at pause end minus lead; held moment (slow-zoom-out)` });
    } else {
      cuts.push({ id: b.id, beatId: b.id, sectionId: b.sectionId, kind: "beat", cutMs, endMs, wordIds: inside, reason });
    }
  }
  // 11.5 end: last shot extends to durationMs; if narration ends > 1.5 s before the audio ends, an end-card fills the tail
  const last = cuts[cuts.length - 1];
  const lastWord = words[beats[beats.length - 1].wordIds.slice(-1)[0]];
  if (durationMs - lastWord.endMs > 1500) {
    const cardStart = lastWord.endMs + 100;
    if (cardStart - last.cutMs >= MIN && durationMs - cardStart >= MIN) {
      last.endMs = cardStart;
      cuts.push({ id: "end-card", beatId: last.beatId, sectionId: last.sectionId, kind: "end-card", cutMs: cardStart, endMs: durationMs, wordIds: [],
        reason: `narration ends at ${lastWord.endMs} ms, audio at ${durationMs} ms: end-card fills the tail` });
    }
  }
  for (const c of cuts) ctx.log.log("P2", `cut:${c.kind}`, `${c.reason} [${c.cutMs}..${c.endMs} ms]`, { beatId: c.beatId });
  return cuts;
}
