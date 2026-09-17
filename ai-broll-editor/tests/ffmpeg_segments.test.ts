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

  it("xfade offset lands the transition completion at the cut frame (half-frame early)", () => {
    // exiting a: 0..119 (cut at 120); entering b owns a 12-frame fade: from = 108, duration = 80 + 12
    const chunk: Chunk = { id: "seg_0001", route: "ffmpeg", fromFrame: 0, toFrame: 199, hash: "h", brollIds: ["a", "b"] };
    const b = item({ id: "b", from: 108, durationInFrames: 92, transitionIn: { type: "fade", durationInFrames: 12 } });
    const g = buildSegmentGraph(chunk, [item({ id: "a", from: 0, durationInFrames: 120 }), b], grade, resolve);
    const m = /xfade=transition=fade:duration=([\d.]+):offset=([\d.]+)/.exec(g.filterComplex);
    expect(m).not.toBeNull();
    const T = Number(m![1]) * 30, offset = Number(m![2]) * 30;
    // The offset is deliberately nudged HALF A FRAME earlier. framesToSeconds rounds at
    // 6 dp, so an offset+duration that should equal the exiting stream's length can
    // exceed it by 1e-6 s and ffmpeg then fails to configure the xfade pad. Half a
    // frame is imperceptible and puts the comparison safely on the right side.
    expect(offset).toBeCloseTo(107.5, 1);   // (entering.from - chunk.fromFrame) - 0.5
    expect(offset + T).toBeCloseTo(119.5, 1); // completes at the cut frame, less half a frame
    expect(offset + T).toBeLessThan(120);     // and never AFTER the exiting stream ends
    expect(g.expectedFrames).toBe(200);  // 120 + 92 - 12
  });

  it("offsets are relative to the chunk start", () => {
    const chunk: Chunk = { id: "seg_0002", route: "ffmpeg", fromFrame: 900, toFrame: 1099, hash: "h", brollIds: ["a", "b"] };
    const a = item({ id: "a", from: 900, durationInFrames: 100 });
    const b = item({ id: "b", from: 990, durationInFrames: 110, transitionIn: { type: "fade", durationInFrames: 10 } });
    const g = buildSegmentGraph(chunk, [a, b], grade, resolve);
    const m = /offset=([\d.]+)/.exec(g.filterComplex)!;
    expect(Number(m[1]) * 30).toBeCloseTo(89.5, 1); // 90 less the half-frame nudge
    // Absolute cut frame, less the deliberate half-frame nudge.
    expect(Number(m[1]) * 30 + 10 + chunk.fromFrame).toBeCloseTo(999.5, 1);
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
    // 90 frames + 1 s of headroom. The source must be able to OUTLAST the shot:
    // trim=end_frame cuts back to exactly 90, but a stream that ends early starves the
    // following xfade ("Failed to configure output pad on Parsed_xfade_N").
    expect(g.inputs[1].args).toEqual(["-loop", "1", "-framerate", "30", "-t", "4.0", "-i", "/abs/prepared/b.jpg"]);
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

describe("short-source headroom", () => {
  it("pads every stream past the shot so a short clip cannot starve an xfade", async () => {
    const { itemStream } = await import("../scripts/ts/lib/ffmpeg_graph.js");
    const mk = (kind: "video" | "image") => ({
      id: "x", beatId: "b", sectionId: "s", from: 0, durationInFrames: 400,
      route: "ffmpeg" as const, segmentId: "seg_0001", layout: "fullscreen-clip" as const,
      media: [{ src: `prepared/x.${kind === "video" ? "mp4" : "jpg"}`, kind, startFromFrame: 0 }],
      motion: { type: "none" as const }, transitionIn: { type: "cut" as const, durationInFrames: 0 },
      credit: null,
    });
    // A 400-frame (13.3 s) hold — the length the raised beat cap now allows.
    const vid = itemStream(mk("video") as never, 0, 400, 0, (s) => s);
    expect(vid.filter).toMatch(/tpad=stop_mode=clone:stop_duration=/);
    const padded = Number(/stop_duration=([\d.]+)/.exec(vid.filter)![1]);
    expect(padded).toBeGreaterThan(400 / 30); // strictly longer than the shot itself

    const img = itemStream(mk("image") as never, 0, 400, 0, (s) => s);
    const loopDur = Number(img.input.args[img.input.args.indexOf("-t") + 1]);
    expect(loopDur).toBeGreaterThan(400 / 30);

    // and both still trim back to exactly the shot length
    expect(vid.filter).toContain("trim=end_frame=400");
    expect(img.filter).toContain("trim=end_frame=400");
  });
});

describe("xfade margin", () => {
  it("the exiting stream outlasts every xfade it feeds", async () => {
    const { buildSegmentGraph } = await import("../scripts/ts/lib/ffmpeg_graph.js");
    const mk = (id: string, from: number, dur: number, T: number) => ({
      id, beatId: id, sectionId: "s1", from: from - T, durationInFrames: dur + T,
      route: "ffmpeg", segmentId: "seg_0001", layout: "fullscreen-clip",
      media: [{ src: `prepared/${id}.mp4`, kind: "video", startFromFrame: 0 }],
      motion: { type: "none" },
      transitionIn: { type: T ? "fade" : "cut", durationInFrames: T }, credit: null,
    });
    // A 13.3 s hold followed by a 12-frame fade — the shape the raised beat cap allows.
    const items = [mk("a", 0, 400, 0), mk("b", 400, 200, 12), mk("c", 600, 150, 0)];
    const chunk = { id: "seg_0001", route: "ffmpeg" as const, fromFrame: 0, toFrame: 749, hash: "h", brollIds: ["a", "b", "c"] };
    const g = buildSegmentGraph(chunk as never, items as never, "null", (s) => s);

    const trims = [...g.filterComplex.matchAll(/trim=end_frame=(\d+)/g)].map((m) => Number(m[1]));
    const fades = [...g.filterComplex.matchAll(/xfade=transition=\w+:duration=([\d.]+):offset=([\d.]+)/g)]
      .map((m) => ({ duration: Number(m[1]), offset: Number(m[2]) }));
    expect(fades.length).toBeGreaterThan(0);

    // xfade reads the exiting stream through offset+duration. Trimming to exactly the
    // shot length leaves a ZERO-frame margin, and ffmpeg then fails to configure the
    // pad ("Parsed_xfade_N", exit 234). The margin must be strictly positive.
    const exitingSeconds = trims[0] / 30;
    const needed = fades[0].offset + fades[0].duration;
    expect(exitingSeconds).toBeGreaterThan(needed);

    // ...and the segment still declares the exact chunk length.
    expect(g.expectedFrames).toBe(750);
  });
});

describe("xfade float margin", () => {
  it("the exiting stream is never shorter than offset+duration, at any frame count", async () => {
    const { buildSegmentGraph } = await import("../scripts/ts/lib/ffmpeg_graph.js");
    const mk = (id: string, from: number, dur: number, T: number) => ({
      id, beatId: id, sectionId: "s1", from: from - T, durationInFrames: dur + T,
      route: "ffmpeg", segmentId: "seg_0001", layout: "fullscreen-clip",
      media: [{ src: `prepared/${id}.mp4`, kind: "video", startFromFrame: 0 }],
      motion: { type: "none" },
      transitionIn: { type: T ? "fade" : "cut", durationInFrames: T }, credit: null,
    });
    // Sweep the shape that produced margin = -1e-6 s in CI: three hard cuts summing to
    // an awkward total, then a 17-frame fade.
    for (const [a, b, c] of [[167, 80, 75], [100, 100, 100], [33, 67, 101], [1, 2, 3].map((x) => x * 45) as number[]]) {
      for (const T of [12, 14, 17, 18]) {
        const pre = a + b + c;
        const items = [
          mk("a", 0, a, 0), mk("b", a, b, 0), mk("c", a + b, c, 0),
          mk("d", pre, 152, T), mk("e", pre + 152, 90, 0),
        ];
        const total = pre + 152 + 90;
        const chunk = { id: "seg_0001", route: "ffmpeg" as const, fromFrame: 0, toFrame: total - 1, hash: "h", brollIds: items.map((i) => i.id) };
        const g = buildSegmentGraph(chunk as never, items as never, "null", (s) => s);
        const f = [...g.filterComplex.matchAll(/xfade=transition=\w+:duration=([\d.]+):offset=([\d.]+)/g)]
          .map((m) => ({ duration: Number(m[1]), offset: Number(m[2]) }));
        for (const x of f) {
          // The accumulated stream before the fade is `pre` frames.
          expect(x.offset + x.duration, `pre=${pre} T=${T}`).toBeLessThan(pre / 30);
        }
      }
    }
  });
});
