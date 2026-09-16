// Deterministic segmenter (spec-v3 section 6).
// words(ms) -> sentences -> splitLong -> mergeShort -> beats (1.5..6.0 s) -> sections.
import fs from "node:fs";
import path from "node:path";
import type { Beat, Beats, Section, SectionKind, Transcript, Word } from "./types.js";

export const MIN = 1500;
// Beats may run to 14 s. The old 6 s cap made a deliberate long hold architecturally
// IMPOSSIBLE: measured long-form editing puts one 30-60 s hold at 72-92 % of runtime
// (scaled to ~9 % of runtime for short films), and every professional documentary
// profile wants a p90 shot of 7-14 s. A 6 s ceiling forces uniform medium-speed
// cutting, which is the texture of an assembled video rather than an edited one.
//
// Beats near the top of this range are rare by construction — splitLong only leaves a
// long beat when there is no clause boundary to split on, which is exactly the
// sentence that deserves to breathe.
export const MAX = 14000;
// Above this, a beat is split even without a clause boundary: past ~14 s a single
// stock shot has nothing left to show.
export const HARD_MAX = 14000;
export const GAP_SPLIT = 350;
export const CONJ = new Set(["and", "but", "because", "so", "which", "while", "then", "or", "when", "although", "however", "since"]);

/** Word span in ms (first start to last end). */
export const span = (ws: Word[]): number => (ws.length ? ws[ws.length - 1].endMs - ws[0].startMs : 0);

/** Split a word list after every word where pred(word, next) is true. */
export function splitWhere(words: Word[], pred: (w: Word, n: Word | undefined) => boolean): Word[][] {
  const out: Word[][] = [];
  let cur: Word[] = [];
  for (let i = 0; i < words.length; i++) {
    cur.push(words[i]);
    if (pred(words[i], words[i + 1])) { out.push(cur); cur = []; }
  }
  if (cur.length) out.push(cur);
  return out;
}

const range = (a: number, b: number): number[] => { const r: number[] = []; for (let i = a; i <= b; i++) r.push(i); return r; };
const argmax = (idx: number[], f: (i: number) => number): number => {
  let best = idx[0], bestV = -Infinity;
  for (const i of idx) { const v = f(i); if (v > bestV) { bestV = v; best = i; } }
  return best;
};

/** Section 6: recursively split a sentence longer than MAX at the best clause boundary. */
export function splitLong(ws: Word[]): Word[][] {
  if (span(ws) <= MAX || ws.length < 4) return [ws];
  const idx = argmax(range(1, ws.length - 2), (i) =>
    (/,$/.test(ws[i].text) ? 3 : 0) +
    (CONJ.has(ws[i + 1].text.toLowerCase()) ? 2 : 0) +
    (ws[i + 1].startMs - ws[i].endMs) / 200 -
    Math.abs((i + 1) - ws.length / 2) / ws.length); // prefer clause boundaries, big gaps, near the middle
  return [...splitLong(ws.slice(0, idx + 1)), ...splitLong(ws.slice(idx + 1))];
}

/**
 * Merge groups shorter than MIN into the shorter neighbour, as long as the merged span stays <= MAX.
 * A short group that cannot be merged anywhere without exceeding MAX stays short; the Brain's P1 repair handles it.
 */
export function mergeShort(groups: Word[][]): Word[][] {
  const g = groups.filter((x) => x.length > 0).map((x) => x.slice());
  let changed = true;
  while (changed && g.length > 1) {
    changed = false;
    for (let i = 0; i < g.length; i++) {
      if (span(g[i]) >= MIN) continue;
      const prev = i > 0 ? g[i - 1] : null;
      const next = i + 1 < g.length ? g[i + 1] : null;
      const cands: number[] = [];
      if (prev && span([...prev, ...g[i]]) <= MAX) cands.push(i - 1);
      if (next && span([...g[i], ...next]) <= MAX) cands.push(i + 1);
      let target: number | null = null;
      if (cands.length === 2) target = span(g[i - 1]) <= span(g[i + 1]) ? i - 1 : i + 1; // shorter neighbour
      else if (cands.length === 1) target = cands[0];
      // no neighbour fits within MAX: leave the short group; the Brain's P1 beat repair merges/splits it in frames (spec 11.3)
      if (target === null) continue;
      if (target < i) { g[target] = [...g[target], ...g[i]]; g.splice(i, 1); }
      else { g[target] = [...g[i], ...g[target]]; g.splice(i, 1); }
      changed = true;
      break;
    }
  }
  return g;
}

export function toBeat(ws: Word[], index: number, next: Word[] | undefined, sectionId = "sec_01"): Beat {
  return {
    id: `b_${String(index + 1).padStart(4, "0")}`,
    sectionId,
    startMs: ws[0].startMs,
    endMs: ws[ws.length - 1].endMs,
    wordIds: ws.map((w) => w.id),
    text: ws.map((w) => w.text).join(" "),
    nextWordStartMs: next ? next[0].startMs : null,
    emphasisWordIds: [],
  };
}

/** Section 6 toBeats: sentence split on [.?!] or a gap > 350 ms, then splitLong, then mergeShort. */
export function toBeats(words: Word[]): Beat[] {
  if (words.length === 0) return [];
  const sentences = splitWhere(words, (w, n) => /[.?!]$/.test(w.text) || (!!n && n.startMs - w.endMs > GAP_SPLIT));
  const groups = mergeShort(sentences.flatMap(splitLong));
  return groups.map((g, i) => toBeat(g, i, groups[i + 1]));
}

export interface ChapterIn { title: string; startWordId: number; kind: SectionKind }

/**
 * Build sections from chapters (snapped to beat/sentence starts) or one "explain" section.
 * Soft bounds 90..240 s: chapters shorter than 90 s merge into the previous one, longer than 240 s are kept (logged by caller).
 */
export function buildSections(beats: Beat[], durationMs: number, chapters?: ChapterIn[]): Section[] {
  if (beats.length === 0) return [];
  const mk = (i: number, title: string | null, kind: SectionKind): Section => ({ id: `sec_${String(i).padStart(2, "0")}`, title, kind, startMs: 0, endMs: 0, beatIds: [] });
  let starts: { beatIdx: number; title: string | null; kind: SectionKind }[];
  if (!chapters || chapters.length === 0) {
    starts = [{ beatIdx: 0, title: null, kind: "explain" }];
  } else {
    const sorted = chapters.slice().sort((a, b) => a.startWordId - b.startWordId);
    starts = [];
    for (const ch of sorted) {
      // snap to the first beat whose first word >= startWordId (beat starts are sentence/clause starts)
      let idx = beats.findIndex((b) => b.wordIds[0] >= ch.startWordId);
      if (idx < 0) idx = beats.length - 1;
      if (starts.length && starts[starts.length - 1].beatIdx === idx) { starts[starts.length - 1] = { beatIdx: idx, title: ch.title, kind: ch.kind }; continue; }
      starts.push({ beatIdx: idx, title: ch.title, kind: ch.kind });
    }
    if (starts[0].beatIdx !== 0) starts.unshift({ beatIdx: 0, title: null, kind: "hook" });
    // soft lower bound 90 s: merge too-short chapters into the previous
    const merged: typeof starts = [];
    for (let i = 0; i < starts.length; i++) {
      const s = starts[i];
      const endMs = i + 1 < starts.length ? beats[starts[i + 1].beatIdx].startMs : durationMs;
      const len = endMs - beats[s.beatIdx].startMs;
      if (merged.length && len < 90_000 && i < starts.length - 1) continue; // absorbed by previous (last chapter may be short: outro)
      merged.push(s);
    }
    starts = merged;
  }
  const sections: Section[] = [];
  for (let i = 0; i < starts.length; i++) {
    const s = mk(i + 1, starts[i].title, starts[i].kind);
    const from = starts[i].beatIdx, to = i + 1 < starts.length ? starts[i + 1].beatIdx : beats.length;
    for (let k = from; k < to; k++) { beats[k].sectionId = s.id; s.beatIds.push(beats[k].id); }
    s.startMs = i === 0 ? 0 : beats[from].startMs;
    s.endMs = i + 1 < starts.length ? beats[to].startMs : durationMs;
    sections.push(s);
  }
  return sections;
}

export function segmentTranscript(t: Transcript, chapters?: ChapterIn[]): Beats {
  const beats = toBeats(t.words);
  const sections = buildSections(beats, t.durationMs, chapters);
  return { sections, beats };
}

// ---------- CLI ----------
function cli(argv: string[]) {
  const i = argv.indexOf("--job");
  if (i < 0 || !argv[i + 1]) { console.error("usage: tsx scripts/ts/segment.ts --job <id>"); process.exit(2); }
  const jobDir = path.resolve("work", argv[i + 1]);
  const t = JSON.parse(fs.readFileSync(path.join(jobDir, "transcript.json"), "utf8")) as Transcript;
  let chapters: ChapterIn[] | undefined;
  const sectionsPath = path.join(jobDir, "sections.json");
  const chaptersPath = path.join(jobDir, "chapters.json");
  let out: Beats;
  if (fs.existsSync(sectionsPath)) {
    // pre-built sections: {sections:[{id,title,kind,startMs,endMs}]} -> assign beats by startMs
    const secs = (JSON.parse(fs.readFileSync(sectionsPath, "utf8")) as { sections: Section[] }).sections;
    const beats = toBeats(t.words);
    const sections = secs.map((s) => ({ ...s, beatIds: [] as string[] }));
    for (const b of beats) {
      let s = sections.find((x) => b.startMs >= x.startMs && b.startMs < x.endMs) ?? sections[sections.length - 1];
      b.sectionId = s.id; s.beatIds.push(b.id);
    }
    out = { sections: sections.filter((s) => s.beatIds.length > 0), beats };
  } else {
    if (fs.existsSync(chaptersPath)) chapters = (JSON.parse(fs.readFileSync(chaptersPath, "utf8")) as { chapters: ChapterIn[] }).chapters;
    out = segmentTranscript(t, chapters);
  }
  for (const s of out.sections) {
    const len = (s.endMs - s.startMs) / 1000;
    if (len > 240) console.warn(`warn: section ${s.id} is ${len.toFixed(0)} s (> 240 s soft bound)`);
  }
  fs.writeFileSync(path.join(jobDir, "beats.json"), JSON.stringify(out, null, 2) + "\n");
  console.log(`beats.json: ${out.beats.length} beats, ${out.sections.length} sections`);
}

if (process.argv[1] && /segment\.ts$/.test(process.argv[1])) cli(process.argv.slice(2));
