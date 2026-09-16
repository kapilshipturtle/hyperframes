// Property test (spec 11.16): random transcripts of 50..1500 words -> beats (segment.ts) -> synthetic assets -> Brain -> I1..I12.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import fs from "node:fs";
import path from "node:path";
import { runBrain } from "../scripts/ts/brain/index.js";
import { validateJob } from "../scripts/ts/validate.js";
import { layoutFamily, msToFrame, MIN_SHOT_FRAMES, MAX_SHOT_FRAMES, MAX_Y2_FRAMES, type Timeline, type BrollItem } from "../scripts/ts/types.js";
import { transcriptFrom, assetsFrom, makeJobDir, beatsFor, PACKS, type WordSpec, type AssetSpec } from "./helpers.js";

const wordSpec = fc.record({
  len: fc.integer({ min: 80, max: 700 }),
  gap: fc.oneof({ weight: 8, arbitrary: fc.integer({ min: 20, max: 300 }) }, { weight: 2, arbitrary: fc.integer({ min: 350, max: 2500 }) }),
  punct: fc.constantFrom("", "", "", "", ".", ",", "?") as fc.Arbitrary<"" | "." | "," | "?">,
}) as fc.Arbitrary<WordSpec>;
const assetSpec = fc.record({
  missing: fc.constantFrom(false, false, false, false, true),
  portrait: fc.constantFrom(false, false, false, true),
  kind: fc.constantFrom("video", "video", "image") as fc.Arbitrary<"video" | "image">,
  score: fc.constantFrom(0.2, 0.27, 0.29, 0.31, 0.34, 0.4),
  y2: fc.constantFrom(false, false, false, false, false, true),
  sd: fc.constantFrom(false, false, false, false, true),
  alternates: fc.integer({ min: 0, max: 3 }),
  shortClip: fc.constantFrom(false, false, false, true),
}) as fc.Arbitrary<AssetSpec>;

const cut = (b: BrollItem) => b.from + b.transitionIn.durationInFrames;
const net = (b: BrollItem) => b.durationInFrames - b.transitionIn.durationInFrames;

export function assertInvariants(tl: Timeline, durationMs: number) {
  const b = tl.tracks.broll;
  // I1
  expect(tl.durationInFrames).toBe(msToFrame(durationMs));
  expect(b[0].from).toBe(0); expect(b[0].transitionIn.durationInFrames).toBe(0);
  for (let i = 1; i < b.length; i++) expect(cut(b[i])).toBe(cut(b[i - 1]) + net(b[i - 1]));
  expect(b.reduce((a, x) => a + net(x), 0)).toBe(tl.durationInFrames);
  // I2
  for (const x of b) { expect(net(x)).toBeGreaterThanOrEqual(MIN_SHOT_FRAMES); expect(net(x)).toBeLessThanOrEqual(MAX_SHOT_FRAMES); if (x.tier === "y2") expect(x.durationInFrames).toBeLessThanOrEqual(MAX_Y2_FRAMES); }
  // I3
  for (let i = 1; i < b.length; i++) { const T = b[i].transitionIn.durationInFrames; if (b[i].transitionIn.type === "cut") expect(T).toBe(0); else { expect(T).toBeGreaterThanOrEqual(6); expect(T).toBeLessThanOrEqual(18); expect(T).toBeLessThanOrEqual(net(b[i - 1])); } }
  // I4
  for (const t of tl.tracks.text) {
    const host = b.find((x) => x.beatId === t.beatId && t.from >= cut(x) - 2 && t.from < cut(x) + net(x));
    expect(host, `text ${t.id} host`).toBeTruthy();
    expect(t.from + t.durationInFrames).toBeLessThanOrEqual(cut(host!) + net(host!) - 5);
    expect(t.content.split(/\s+/).length).toBeLessThanOrEqual(6);
  }
  // I6
  const nt = tl.tracks.sfx.filter((s) => s.tag !== "tick" && s.tag !== "counter-tick-loop").sort((x, y) => x.from - y.from);
  for (let i = 1; i < nt.length; i++) expect(nt[i].from - nt[i - 1].from).toBeGreaterThanOrEqual(45);
  for (const s of tl.tracks.sfx) expect(s.volume).toBeLessThanOrEqual(0.5);
  // I7
  const secs = new Set<string>();
  for (const m of tl.tracks.music) { expect(m.volume).toBeLessThanOrEqual(0.16); for (const s of m.sectionIds) { expect(secs.has(s)).toBe(false); secs.add(s); } }
  // I8 (by media src, per beat)
  const uses = new Map<string, { beatId: string; cut: number }[]>();
  for (const x of b) for (const m of x.media) { const l = uses.get(m.src) ?? []; l.push({ beatId: x.beatId, cut: cut(x) }); uses.set(m.src, l); }
  for (const [, l] of uses) { expect(new Set(l.map((u) => u.beatId)).size).toBeLessThanOrEqual(2); for (const u of l) for (const v of l) if (u.beatId !== v.beatId) expect(Math.abs(u.cut - v.cut)).toBeGreaterThanOrEqual(2700); }
  // I9
  // I9: full-screen runs are EXEMPT — consecutive full-frame shots are normal
  // documentary grammar, and capping them forced the Brain to manufacture
  // split-screens. Conspicuous framed families are still capped.
  let run = 1;
  for (let i = 1; i < b.length; i++) {
    if (b[i].layout === "typographic-card" || b[i - 1].layout === "typographic-card") { run = 1; continue; }
    run = layoutFamily(b[i].layout) === layoutFamily(b[i - 1].layout) ? run + 1 : 1;
    if (layoutFamily(b[i].layout) === "fullscreen") continue;
    expect(run, `${b[i].id} family run`).toBeLessThanOrEqual(3);
  }
  // I10
  for (const x of b) if (x.tier === "y2") { expect(x.credit).toBeTruthy(); expect(layoutFamily(x.layout)).not.toBe("grid"); expect(tl.tracks.credits.some((c) => c.tier === "y2" && c.beatId === x.beatId)).toBe(true); }
  // I11: every Pexels media has a credit line (all synthetic stock is Pexels)
  for (const x of b) for (const m of x.media) if (m.src.startsWith("prepared/") && x.tier === "stock") expect(tl.tracks.credits.length).toBeGreaterThan(0);
}

describe("Brain property test (I1..I12)", () => {
  it("random transcripts 50..1500 words produce valid timelines", async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(wordSpec, { minLength: 50, maxLength: 1500, size: "+2" }), // bias to long transcripts
      fc.array(assetSpec, { minLength: 3, maxLength: 12 }),
      fc.integer({ min: 0, max: 3 }),
      async (specs, aspecs, chapterMode) => {
        const t = transcriptFrom(specs, 300 + (specs.length % 5) * 700);
        const n = t.words.length;
        const chapters = chapterMode === 0 ? undefined
          : chapterMode === 1 ? [{ title: "Opening", startWordId: 0, kind: "hook" as const }, { title: "The Story", startWordId: Math.floor(n / 2), kind: "story" as const }]
          : chapterMode === 2 ? [{ title: "Hook", startWordId: 0, kind: "hook" as const }, { title: null as unknown as string, startWordId: Math.floor(n / 3), kind: "explain" as const }, { title: "Outro", startWordId: Math.floor(2 * n / 3), kind: "outro" as const }]
          : [{ title: "A", startWordId: 0, kind: "explain" as const }, { title: "B", startWordId: Math.floor(n / 4), kind: "list" as const }];
        const beats = beatsFor(t, chapters);
        const assets = assetsFrom(beats, aspecs);
        const dir = makeJobDir("prop", t, beats, assets, chapterMode === 3 ? "youtube_short_clip: true\n" : "");
        try {
          const r = runBrain(dir, { packsDir: PACKS });
          assertInvariants(r.timeline, t.durationMs);
          expect(r.chunks[0].fromFrame).toBe(0);
          expect(r.chunks[r.chunks.length - 1].toFrame).toBe(r.timeline.durationInFrames - 1);
          for (let i = 1; i < r.chunks.length; i++) expect(r.chunks[i].fromFrame).toBe(r.chunks[i - 1].toFrame + 1);
          expect(r.duckCurve.length).toBe(r.timeline.durationInFrames);
          expect(fs.existsSync(path.join(dir, "timeline.json"))).toBe(true);
          // independent validator agrees (media files are fake; determinism is covered by its own test)
          const v = await validateJob(dir, { skipMedia: true, packsDir: PACKS, skipDeterminism: true });
          expect(v.errors, v.errors.join("\n")).toEqual([]);
        } finally { fs.rmSync(dir, { recursive: true, force: true }); }
      }), { numRuns: 40, timeout: 55_000, endOnFailure: true }); // no shrinking: each step re-runs Brain + validator
  }, 60_000);
});
