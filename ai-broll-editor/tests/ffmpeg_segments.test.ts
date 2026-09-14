import { describe, expect, it } from "vitest";
import { buildSegmentGraph, chunkFrames, itemsInChunk, zoompanFilter } from "../scripts/ts/lib/ffmpeg_graph.js";
import { gradeFilter, FALLBACK_GRADES } from "../scripts/ts/lib/grades.js";
import type { BrollItem, Chunk } from "../scripts/ts/types.js";

const item = (o: Partial<BrollItem> & { id: string; from: number; durationInFrames: number }): BrollItem => ({
  beatId: o.id, sectionId: "sec_01", route: "ffmpeg", segmentId: "seg_0001", layout: "fullscreen-clip",
  media: [{ src: "solid:#336699", kind: "image", startFromFrame: 0 }], motion: { type: "none" },
  transitionIn: { type: "cut", durationInFrames: 0 }, credit: null, ...o,
});
const grade = gradeFilter("clean-cool", FALLBACK_GRADES);
const resolve = (s: string) => `/abs/${s}`;

describe("buildSegmentGraph", () => {
  it("cuts concat and the frame count equals the chunk span", () => {
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 199, hash: "h", brollIds: ["a", "b"] };
    const g = buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 120 }), item({ id: "b", from: 120, durationInFrames: 80 })], grade, resolve);
    expect(g.expectedFrames).toBe(200);
    expect(chunkFrames(chunk)).toBe(200);
    expect(g.filterComplex).toContain("concat=n=2:v=1:a=0");
    expect(g.filterComplex).toContain("eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04,vignette=PI/5");
    expect(g.filterComplex.endsWith("format=yuv420p[v]")).toBe(true);
    expect(g.inputs).toHaveLength(2);
  });

  it("xfade offset lands the transition completion exactly at the cut frame", () => {
    // exiting a: 0..119 (cut at 120); entering b owns a 12-frame fade: from = 108, duration = 80 + 12
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 199, hash: "h", brollIds: ["a", "b"] };
    const b = item({ id: "b", from: 108, durationInFrames: 92, transitionIn: { type: "fade", durationInFrames: 12 } });
    const g = buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 120 }), b], grade, resolve);
    const m = /xfade=transition=fade:duration=([\d.]+):offset=([\d.]+)/.exec(g.filterComplex);
    expect(m).not.toBeNull();
    const T = Number(m![1]) * 30, offset = Number(m![2]) * 30;
    expect(offset).toBe(108);            // (entering.from - chunk.fromFrame)
    expect(offset + T).toBe(120);        // completes at the cut frame
    expect(g.expectedFrames).toBe(200);  // 120 + 92 - 12
  });

  it("offsets are relative to the chunk start", () => {
    const chunk: Chunk = { id: "seg_0002", route: "ffmpeg", fromFrame: 900, toFrame: 1099, hash: "h", brollIds: ["a", "b"] };
    const a = item({ id: "a", from: 900, durationInFrames: 100 });
    const b = item({ id: "b", from: 990, durationInFrames: 110, transitionIn: { type: "fade", durationInFrames: 10 } });
    const g = buildSegmentGraph(chunk, [a, b], grade, resolve);
    const m = /offset=([\d.]+)/.exec(g.filterComplex)!;
    expect(Number(m[1]) * 30).toBe(90);
    expect(Number(m[1]) * 30 + 10 + chunk.fromFrame).toBe(1000);
  });

  it("clamps an item running past the chunk end and rejects gaps", () => {
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 149, hash: "h", brollIds: ["a", "b"] };
    const g = buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 100 }), item({ id: "b", from: 100, durationInFrames: 90 })], grade, resolve);
    expect(g.items.map((i) => i.frames)).toEqual([100, 50]);
    expect(() => buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 100 }), item({ id: "b", from: 110, durationInFrames: 40 })], grade, resolve)).toThrow(/gap\/overlap/);
  });

  it("rejects non-fade transitions and non-tiling items", () => {
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 199, hash: "h", brollIds: ["a", "b"] };
    const bad = item({ id: "b", from: 110, durationInFrames: 90, transitionIn: { type: "wipe", durationInFrames: 10 } });
    expect(() => buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 120 }), bad], grade, resolve)).toThrow(/not FFmpeg-routable/);
    expect(() => buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 120 })], grade, resolve)).toThrow(/produce 120 frames/);
  });

  it("media forms: solid via lavfi, image via -loop + zoompan, video via -ss", () => {
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 269, hash: "h", brollIds: ["a", "b", "c"] };
    const a = item({ id: "a", from: 0, durationInFrames: 90 });
    const b = item({ id: "b", from: 90, durationInFrames: 90, layout: "fullscreen-image-kenburns", media: [{ src: "prepared/b.jpg", kind: "image", startFromFrame: 0 }], motion: { type: "slow-zoom-out", to: "top-right", zoom: 1.12 } });
    const c = item({ id: "c", from: 180, durationInFrames: 90, media: [{ src: "prepared/c.mp4", kind: "video", startFromFrame: 45 }] });
    const g = buildSegmentGraph(chunk, [a, b, c], grade, resolve);
    expect(g.inputs[0].args.slice(0, 2)).toEqual(["-f", "lavfi"]);
    expect(g.inputs[0].args.at(-1)).toContain("color=c=0x336699:s=1920x1080:r=30");
    expect(g.inputs[1].args).toEqual(["-loop", "1", "-framerate", "30", "-t", "3.0", "-i", "/abs/prepared/b.jpg"]);
    expect(g.filterComplex).toContain("zoompan=z='1.1200-0.1200*on/89':x='iw-iw/zoom':y='0'");
    expect(g.inputs[2].args.slice(0, 2)).toEqual(["-ss", "1.5"]);
    expect(zoompanFilter(item({ id: "z", from: 0, durationInFrames: 61, motion: { type: "ken-burns", zoom: 1.1 } }), 61)).toContain("z='1+0.1000*on/60'");
  });

  it("itemsInChunk keeps only intersecting items in frame order", () => {
    const chunk: Chunk = { id: "s", route: "ffmpeg", fromFrame: 100, toFrame: 199, hash: "h", brollIds: [] };
    const ids = itemsInChunk([item({ id: "late", from: 200, durationInFrames: 50 }), item({ id: "in", from: 150, durationInFrames: 50 }), item({ id: "early", from: 0, durationInFrames: 100 }), item({ id: "span", from: 90, durationInFrames: 60 })], chunk).map((i) => i.id);
    expect(ids).toEqual(["span", "in"]);
  });
});
