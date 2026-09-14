// P3 emphasis map (spec 11.4).
// emph = 0.45*z(rms) + 0.25*z(duration) + 0.15*(gapBefore > 250) + 0.15*(director emphasis)
// z-scores are computed within the section. strong >= 1.0, medium >= 0.5.
import type { Beat, Section, Shot, Word } from "../types.js";

export interface EmphasisInput { words: Word[]; beats: Beat[]; sections: Section[]; shots?: Shot[] }

function zscores(vals: (number | undefined)[]): number[] {
  const present = vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (present.length < 2) return vals.map(() => 0);
  const mean = present.reduce((a, b) => a + b, 0) / present.length;
  const sd = Math.sqrt(present.reduce((a, b) => a + (b - mean) ** 2, 0) / present.length) || 0;
  return vals.map((v) => (typeof v === "number" && Number.isFinite(v) && sd > 0 ? (v - mean) / sd : 0));
}

export function computeEmphasis(inp: EmphasisInput): Map<number, number> {
  const out = new Map<number, number>();
  const wordById = new Map(inp.words.map((w) => [w.id, w]));
  const beatById = new Map(inp.beats.map((b) => [b.id, b]));
  const directorIds = new Set<number>();
  for (const b of inp.beats) for (const id of b.emphasisWordIds ?? []) directorIds.add(id);
  for (const sh of inp.shots ?? []) for (const id of sh.emphasisWordIds ?? []) directorIds.add(id);  // spec 7 Director flags
  const sections = inp.sections.length ? inp.sections : [{ id: "all", beatIds: inp.beats.map((b) => b.id) } as Section];
  const seen = new Set<number>();
  for (const s of sections) {
    const ws: Word[] = [];
    for (const bid of s.beatIds) for (const wid of beatById.get(bid)?.wordIds ?? []) { const w = wordById.get(wid); if (w) ws.push(w); }
    score(ws);
  }
  // words outside any section (should not happen) get scored globally
  const rest = inp.words.filter((w) => !seen.has(w.id));
  if (rest.length) score(rest);
  return out;

  function score(ws: Word[]) {
    const zr = zscores(ws.map((w) => w.rms));
    const zd = zscores(ws.map((w) => w.endMs - w.startMs));
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i];
      const prev = wordById.get(w.id - 1);
      const gapBefore = prev ? w.startMs - prev.endMs : 1000;
      const e = 0.45 * zr[i] + 0.25 * zd[i] + 0.15 * (gapBefore > 250 ? 1 : 0) + 0.15 * (directorIds.has(w.id) ? 1 : 0);
      out.set(w.id, Math.round(e * 1e6) / 1e6);
      seen.add(w.id);
    }
  }
}

/** Strongest word id among ids (ties -> earliest). */
export function strongestWord(emph: Map<number, number>, ids: number[]): number {
  let best = ids[0], bv = -Infinity;
  for (const id of ids) { const v = emph.get(id) ?? 0; if (v > bv) { bv = v; best = id; } }
  return best;
}

/** Key phrase: strongest 2..5 consecutive words by summed emphasis (11.6 rule 9). */
export function keyPhrase(emph: Map<number, number>, words: Word[], minLen = 2, maxLen = 5): { text: string; wordIds: number[] } {
  if (words.length === 0) return { text: "", wordIds: [] };
  if (words.length <= minLen) return { text: words.map((w) => w.text).join(" "), wordIds: words.map((w) => w.id) };
  let best: Word[] = words.slice(0, minLen), bv = -Infinity;
  for (let L = minLen; L <= Math.min(maxLen, words.length); L++) {
    for (let i = 0; i + L <= words.length; i++) {
      const win = words.slice(i, i + L);
      // mean emphasis plus a small bonus for length so 3-word phrases beat 2-word ones on ties
      const v = win.reduce((a, w) => a + (emph.get(w.id) ?? 0), 0) / L + L * 0.01;
      if (v > bv + 1e-9) { bv = v; best = win; }
    }
  }
  // on-screen phrase: drop trailing/leading punctuation ("history, economics," -> "history, economics")
  const text = best.map((w) => w.text).join(" ").replace(/^[\s"“”'(\[,;:.!?-]+|[\s"“”')\],;:.!?-]+$/g, "");
  return { text, wordIds: best.map((w) => w.id) };
}
