import { describe, it, expect } from "vitest";
import { preset, presetNames, laws, holdTargetFrames, holdWindowFrames } from "../scripts/ts/brain/style.js";
import { trackingEm, sizeFromPctH, scaledShadow } from "../remotion/src/util/fonts.js";
import { scrimGradient } from "../remotion/src/util/brand.js";

describe("style presets", () => {
  it("every preset has a filmable, self-consistent pacing band", () => {
    for (const name of presetNames()) {
      const p = preset(name);
      const [lo, hi] = p.pacing.median_shot_s;
      expect(lo).toBeLessThan(hi);
      expect(p.pacing.p90_shot_s[0]).toBeGreaterThanOrEqual(hi - 0.01);
      expect(p.pacing.cutting_swing_min_s).toBeGreaterThan(0);
    }
  });

  it("no preset allows a display serif, and all cap the text system", () => {
    for (const name of presetNames()) {
      const p = preset(name);
      // slide-up-mask was the serif style; the constraint is declared, not implied
      expect(p.negative_constraints.join(" ")).toMatch(/serif/i);
      expect(p.typography.styles_allowed.length).toBeLessThanOrEqual(4);
    }
  });

  it("unknown preset names fall back to documentary and warn", () => {
    const warnings: string[] = [];
    const p = preset("does-not-exist", (m) => warnings.push(m));
    expect(p.label).toMatch(/Documentary/i);
    expect(warnings.length).toBe(1);
  });

  it("clean-minimal forbids texture (cleanliness IS the style)", () => {
    const p = preset("clean-minimal");
    expect(p.texture.grain).toBe(0);
    expect(p.texture.vignette).toBe(false);
  });

  it("the long hold scales with runtime rather than using the raw measured figure", () => {
    const l = laws();
    // 2-minute film: the measured 30-60 s would be a third of the runtime
    const short = holdTargetFrames(122 * 30, 30, l) / 30;
    // 20-minute film
    const long = holdTargetFrames(1200 * 30, 30, l) / 30;
    expect(short).toBeLessThan(long);
    expect(short).toBeGreaterThanOrEqual(l.long_hold.duration_s[0]);
    expect(long).toBeLessThanOrEqual(l.long_hold.duration_s[1]);
  });

  it("the hold window sits late in the film", () => {
    const [a, b] = holdWindowFrames(1000, laws());
    expect(a).toBeGreaterThanOrEqual(700);
    expect(b).toBeLessThanOrEqual(1000);
  });
});

describe("typography scaling", () => {
  it("tracking is a function of size, not a constant", () => {
    // negative as size grows, positive on small uppercase — tracking 0 everywhere is
    // the default-caption tell
    expect(trackingEm(17)).toBeLessThan(0);
    expect(trackingEm(2.0)).toBeCloseTo(0, 2);
    expect(trackingEm(2.2, true)).toBeGreaterThan(0.05);
  });

  it("tracking stays inside legible bounds for any input", () => {
    for (const s of [0.1, 1, 2, 5, 9, 20, 60]) {
      for (const u of [true, false]) {
        const t = trackingEm(s, u);
        expect(t).toBeGreaterThanOrEqual(-0.035);
        expect(t).toBeLessThanOrEqual(0.14);
      }
    }
  });

  it("sizes scale with frame height so 4K is not half-size", () => {
    expect(sizeFromPctH(8, 1080)).toBe(86);
    expect(sizeFromPctH(8, 2160)).toBe(173);
  });

  it("shadow scales with the type size", () => {
    expect(scaledShadow(48)).toBe("0 1px 5px rgba(0,0,0,0.45)");
    expect(scaledShadow(180)).toBe("0 4px 18px rgba(0,0,0,0.45)");
  });
});

describe("scrim", () => {
  it("uses four stops — a two-stop gradient creates a visible Mach band", () => {
    const g = scrimGradient("bottom", 0.8);
    expect(g.match(/rgba\(/g)?.length).toBe(4);
    expect(g).toContain("0%");
    expect(g).toContain("30%");
    expect(g).toContain("55%");
    expect(g).toContain("70%");
  });

  it("peak opacity is honoured and the far stop is fully transparent", () => {
    expect(scrimGradient("bottom", 0.8)).toContain("rgba(0,0,0,0.800) 0%");
    expect(scrimGradient("top", 0.55)).toContain("rgba(0,0,0,0.550) 0%");
    expect(scrimGradient("bottom", 0.8)).toContain("rgba(0,0,0,0) 70%");
  });
});

describe("ffmpeg chain bounding", () => {
  it("never chains more than MAX_FFMPEG_XFADES transitions per segment", async () => {
    const { buildSegments, chunkSegments, MAX_FFMPEG_XFADES } = await import("../scripts/ts/brain/route.js");
    type Any = Record<string, unknown>;
    const items: Any[] = [];
    let f = 0;
    for (let i = 0; i < 12; i++) {
      const T = i > 0 && i % 2 === 1 ? 12 : 0;
      items.push({
        id: `b_${i}`, beatId: `b_${i}`, sectionId: "s1", from: f - T, durationInFrames: 120 + T,
        route: "ffmpeg", segmentId: "", layout: "fullscreen-clip",
        media: [{ src: "x.mp4", kind: "video", startFromFrame: 0 }],
        motion: { type: "none" }, transitionIn: { type: T ? "fade" : "cut", durationInFrames: T }, credit: null,
      });
      f += 120;
    }
    // Each xfade consumes T frames of overlap; a long chain leaves the accumulated
    // stream shorter than the next offset and ffmpeg fails to configure the pad.
    const segs = chunkSegments(buildSegments(items as never, f), items as never);
    for (const s of segs) {
      const inSeg = items.filter((it) => {
        const c = (it.from as number) + ((it.transitionIn as Any).durationInFrames as number);
        return c >= s.fromFrame && c <= s.toFrame;
      });
      const fades = inSeg.filter((it, k) => k > 0 && ((it.transitionIn as Any).durationInFrames as number) > 0).length;
      expect(fades, `${s.id} chains ${fades} xfades`).toBeLessThanOrEqual(MAX_FFMPEG_XFADES);
    }
  });
});
