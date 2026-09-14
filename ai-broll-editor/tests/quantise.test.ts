import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { quantiseCuts, enforceBounds } from "../scripts/ts/brain/quantise.js";
import { msToFrame, MIN_SHOT_FRAMES, MAX_SHOT_FRAMES } from "../scripts/ts/types.js";

describe("quantise (spec 11.8)", () => {
  it("quantiseCuts: contiguous, first at 0, sum equals msToFrame(duration)", () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 100, max: 9000 }), { minLength: 1, maxLength: 300 }), fc.integer({ min: 0, max: 3000 }), (gaps, tail) => {
      let t = 0;
      const cuts = gaps.map((g, i) => { const c = { beatId: `b${i}`, cutMs: t }; t += g; return c; });
      const durationMs = t + tail;
      const shots = quantiseCuts(cuts, durationMs);
      expect(shots[0].from).toBe(0);
      for (let i = 1; i < shots.length; i++) expect(shots[i].from).toBe(shots[i - 1].from + shots[i - 1].durationInFrames);
      expect(shots.reduce((a, s) => a + s.durationInFrames, 0)).toBe(msToFrame(durationMs));
      for (let i = 1; i < shots.length; i++) expect(shots[i].from).toBe(msToFrame(cuts[i].cutMs));
    }), { numRuns: 200 });
  });

  it("enforceBounds: every shot 45..180, sum preserved, contiguity preserved", () => {
    fc.assert(fc.property(fc.array(fc.integer({ min: 1, max: 400 }), { minLength: 1, maxLength: 200 }), (durs) => {
      const total = durs.reduce((a, b) => a + b, 0);
      fc.pre(total >= MIN_SHOT_FRAMES);
      let f = 0;
      const shots = durs.map((d, i) => { const s = { beatId: `b${i}`, from: f, durationInFrames: d }; f += d; return s; });
      const fixed = enforceBounds(shots);
      expect(fixed.reduce((a, s) => a + s.durationInFrames, 0)).toBe(total);
      expect(fixed[0].from).toBe(0);
      for (let i = 1; i < fixed.length; i++) expect(fixed[i].from).toBe(fixed[i - 1].from + fixed[i - 1].durationInFrames);
      for (const s of fixed) { expect(s.durationInFrames).toBeGreaterThanOrEqual(MIN_SHOT_FRAMES); expect(s.durationInFrames).toBeLessThanOrEqual(MAX_SHOT_FRAMES); }
    }), { numRuns: 200 });
  });

  it("msToFrame is the rounding contract", () => {
    expect(msToFrame(1000)).toBe(30);
    expect(msToFrame(1016)).toBe(30);
    expect(msToFrame(1017)).toBe(31);
    expect(msToFrame(0)).toBe(0);
  });
});
