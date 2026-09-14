// I12: two runs with the same inputs and seed produce identical JSON; a different seed changes RNG-driven choices only.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import { runBrain } from "../scripts/ts/brain/index.js";
import { stableStringify } from "../scripts/ts/brain/rng.js";
import { transcriptFrom, assetsFrom, makeJobDir, beatsFor, PACKS, type WordSpec, type AssetSpec } from "./helpers.js";

function job(seedYaml = "") {
  const specs: WordSpec[] = Array.from({ length: 600 }, (_, i) => ({ len: 150 + ((i * 37) % 400), gap: (i % 13 === 0 ? 600 : 60) + ((i * 11) % 120), punct: i % 9 === 8 ? "." : i % 17 === 5 ? "," : "" }));
  const t = transcriptFrom(specs, 2600);
  const beats = beatsFor(t, [{ title: "Hook", startWordId: 0, kind: "hook" }, { title: "Story", startWordId: 300, kind: "story" }]);
  const aspecs: AssetSpec[] = [
    { missing: false, portrait: false, kind: "video", score: 0.33, y2: false, sd: false, alternates: 2, shortClip: false },
    { missing: false, portrait: true, kind: "image", score: 0.3, y2: false, sd: false, alternates: 1, shortClip: false },
    { missing: true, portrait: false, kind: "video", score: 0.2, y2: false, sd: false, alternates: 0, shortClip: false },
    { missing: false, portrait: false, kind: "image", score: 0.31, y2: false, sd: true, alternates: 1, shortClip: true },
    { missing: false, portrait: false, kind: "video", score: 0.35, y2: true, sd: false, alternates: 2, shortClip: false },
  ];
  return makeJobDir("det", t, beats, assetsFrom(beats, aspecs), "youtube_short_clip: true\n" + seedYaml);
}

describe("Brain determinism (I12)", () => {
  it("same inputs and seed -> byte-identical timeline, chunks, audio mix and log", () => {
    const dir = job();
    try {
      const a = runBrain(dir, { packsDir: PACKS });
      const tlA = fs.readFileSync(`${dir}/timeline.json`, "utf8"), chA = fs.readFileSync(`${dir}/chunks.json`, "utf8"), mixA = fs.readFileSync(`${dir}/audio-mix.json`, "utf8"), logA = fs.readFileSync(`${dir}/placement.log.jsonl`, "utf8");
      const b = runBrain(dir, { packsDir: PACKS });
      expect(fs.readFileSync(`${dir}/timeline.json`, "utf8")).toBe(tlA);
      expect(fs.readFileSync(`${dir}/chunks.json`, "utf8")).toBe(chA);
      expect(fs.readFileSync(`${dir}/audio-mix.json`, "utf8")).toBe(mixA);
      expect(fs.readFileSync(`${dir}/placement.log.jsonl`, "utf8")).toBe(logA);
      expect(stableStringify(a.timeline)).toBe(stableStringify(b.timeline));
      expect(a.chunks.map((c) => c.hash)).toEqual(b.chunks.map((c) => c.hash));
      expect(a.timeline.seed).toMatch(/^[0-9a-f]{40}$/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  it("an explicit seed in job.yaml is honoured and changes only RNG-driven choices", () => {
    const d1 = job(), d2 = job("seed: custom-seed-1\n");
    try {
      const a = runBrain(d1, { packsDir: PACKS }), b = runBrain(d2, { packsDir: PACKS });
      expect(b.timeline.seed).toBe("custom-seed-1");
      expect(a.timeline.seed).not.toBe(b.timeline.seed);
      // cut frames are seed-independent
      expect(a.timeline.tracks.broll.map((x) => x.from + x.transitionIn.durationInFrames)).toEqual(b.timeline.tracks.broll.map((x) => x.from + x.transitionIn.durationInFrames));
    } finally { fs.rmSync(d1, { recursive: true, force: true }); fs.rmSync(d2, { recursive: true, force: true }); }
  });

  it("repair mode reports which segments changed", () => {
    const dir = job();
    try {
      const a = runBrain(dir, { packsDir: PACKS });
      const target = a.timeline.tracks.broll.find((x) => x.layout === "fullscreen-clip" && x.media.length)!;
      const r = runBrain(dir, { packsDir: PACKS, repair: [{ beatId: target.beatId, action: "swap-alternate" }] });
      expect(r.changedSegments).toBeDefined();
      expect(r.changedSegments!.length).toBeGreaterThan(0);
      expect(r.changedSegments!.length).toBeLessThan(a.chunks.length);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
