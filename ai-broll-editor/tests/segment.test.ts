import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { toBeats, MIN, MAX, GAP_SPLIT, span, splitLong, mergeShort } from "../scripts/ts/segment.js";
import { transcriptFrom, type WordSpec } from "./helpers.js";

const wordSpec = fc.record({
  len: fc.integer({ min: 80, max: 700 }),
  gap: fc.oneof({ weight: 8, arbitrary: fc.integer({ min: 20, max: 300 }) }, { weight: 2, arbitrary: fc.integer({ min: 350, max: 2500 }) }),
  punct: fc.constantFrom("", "", "", "", ".", ",", "?") as fc.Arbitrary<"" | "." | "," | "?">,
}) as fc.Arbitrary<WordSpec>;

describe("segment.ts (spec 6)", () => {
  it("keeps every word exactly once, in order, aligned to word ids", () => {
    fc.assert(fc.property(fc.array(wordSpec, { minLength: 1, maxLength: 400 }), (specs) => {
      const t = transcriptFrom(specs);
      const beats = toBeats(t.words);
      const ids = beats.flatMap((b) => b.wordIds);
      expect(ids).toEqual(t.words.map((w) => w.id));
      for (const b of beats) {
        expect(b.startMs).toBe(t.words[b.wordIds[0]].startMs);
        expect(b.endMs).toBe(t.words[b.wordIds[b.wordIds.length - 1]].endMs);
        expect(b.text).toBe(b.wordIds.map((id) => t.words[id].text).join(" "));
        expect(b.emphasisWordIds).toEqual([]);
      }
      for (let i = 0; i < beats.length; i++) expect(beats[i].nextWordStartMs).toBe(i + 1 < beats.length ? t.words[beats[i + 1].wordIds[0]].startMs : null);
    }), { numRuns: 150 });
  });

  it("beats are 1.5..6.0 s except where the words make it impossible", () => {
    fc.assert(fc.property(fc.array(wordSpec, { minLength: 4, maxLength: 400 }), (specs) => {
      const t = transcriptFrom(specs);
      const beats = toBeats(t.words);
      for (let i = 0; i < beats.length; i++) {
        const b = beats[i];
        const len = b.endMs - b.startMs;
        // over MAX only when the group cannot be split (fewer than 4 words) or it absorbed a lone tail across a pause
        if (len > MAX) {
          const gaps = b.wordIds.slice(1).map((id, k) => t.words[id].startMs - t.words[b.wordIds[k]].endMs);
          expect(b.wordIds.length < 4 || gaps.some((g) => g > GAP_SPLIT)).toBe(true);
        }
        if (len < MIN) {
          // under MIN only when merging into either neighbour would exceed MAX (or there is no neighbour)
          const prev = beats[i - 1], next = beats[i + 1];
          const canPrev = prev && b.endMs - prev.startMs <= MAX;
          const canNext = next && next.endMs - b.startMs <= MAX;
          expect(!!canPrev || !!canNext).toBe(false);
        }
      }
    }), { numRuns: 150 });
  });

  it("splitLong prefers clause boundaries and never drops words", () => {
    // 45 words at 360 ms each is ~16 s, comfortably past MAX (14 s) so a split is
    // required. (This used to be 30 words, which only exceeded the old 6 s cap;
    // MAX was raised to 14 s so a deliberate long hold is representable at all.)
    const specs: WordSpec[] = Array.from({ length: 45 }, (_, i) => ({ len: 300, gap: 60, punct: i === 22 ? "," : "" }));
    const t = transcriptFrom(specs);
    const pieces = splitLong(t.words);
    expect(pieces.flat().map((w) => w.id)).toEqual(t.words.map((w) => w.id));
    expect(pieces.length).toBeGreaterThan(1);
    expect(pieces.every((p) => span(p) <= MAX)).toBe(true);
    // the first split lands right after the comma word
    expect(pieces[0][pieces[0].length - 1].text.endsWith(",")).toBe(true);
  });

  it("mergeShort merges into the shorter neighbour", () => {
    const t = transcriptFrom(Array.from({ length: 12 }, () => ({ len: 300, gap: 50, punct: "" as const })));
    const groups = [t.words.slice(0, 6), t.words.slice(6, 7), t.words.slice(7, 12)]; // 6 words (~2.1 s), 1 word, 5 words (~1.7 s)
    const merged = mergeShort(groups);
    expect(merged.length).toBe(2);
    expect(merged[1].length).toBe(6); // lone word joined the shorter (later) neighbour
  });
});
