import type { BrollItem, Grade, Layout, MainProps, MotionGfxItem, MotionType, TextItem, TextPosition, TextStyle, TransitionType } from "./types";
import { GRADES, LAYOUTS } from "./types";

const TRANSITIONS: TransitionType[] = ["cut", "fade", "luma-dissolve", "wipe", "slide", "push-blur", "zoom-punch", "whip-pan", "glitch", "flip", "iris", "clockWipe", "light-leak", "film-burn", "shutter", "pixelate"];
const MOTIONS: MotionType[] = ["none", "ken-burns", "parallax-drift", "slow-zoom-out", "handheld", "speed-ramp", "freeze-end"];
const TEXT_STYLES: TextStyle[] = ["kinetic-bold", "typewriter", "highlight-marker", "lower-third-name", "big-number", "caption-box", "outline-stroke", "gradient-fill", "slide-up-mask", "word-by-word-pop"];
const POSITIONS: TextPosition[] = ["lower-left", "lower-center", "lower-right", "center", "upper-left", "upper-right", "left-panel", "right-panel"];
const GFX: MotionGfxItem["type"][] = ["stat-counter", "progress-bar-top", "arrow-callout", "highlight-box", "circle-reveal", "underline-draw", "icon-pop", "particles-light", "bar-chart-mini", "checklist-tick", "corner-credit"];
const COLORS = ["#1D4ED8", "#DC2626", "#059669", "#7C3AED", "#D97706", "#0891B2", "#BE185D", "#4B5563"];

const SHOT = 75; // frames per showcase shot

const media = (i: number, n = 1) =>
  Array.from({ length: n }).map((_, k) => ({ src: `solid:${COLORS[(i + k) % COLORS.length]}`, kind: "image" as const, startFromFrame: 0, label: `media ${i}.${k}` }));

/** Spec M8: every layout, transition, text style, motion, grade and motion graphic appears at least once. */
export const buildShowcase = (): MainProps => {
  const broll: BrollItem[] = LAYOUTS.map((layout: Layout, i) => {
    const t = TRANSITIONS[i % TRANSITIONS.length];
    const m = MOTIONS[i % MOTIONS.length];
    const g: Grade = GRADES[i % GRADES.length];
    const n = layout === "grid-4" ? 4 : layout === "grid-3" ? 3 : layout === "grid-2" || layout === "comparison-split" ? 2 : layout === "typographic-card" ? 0 : 1;
    return {
      id: `sc_${String(i + 1).padStart(2, "0")}`, beatId: `beat_${i + 1}`, sectionId: `sec_${g}`, from: i * SHOT, durationInFrames: SHOT,
      route: "remotion", segmentId: "seg_showcase", layout, media: media(i, n),
      motion: { type: m, to: "bottom-right", zoom: 1.15, peakFrame: 30, playbackRate: 1.5 },
      transitionIn: { type: t, durationInFrames: t === "cut" ? 0 : 12, direction: (["from-left", "from-right", "from-top", "from-bottom"] as const)[i % 4] },
      credit: i % 5 === 0 ? { text: `Video by Creator ${i} on Pexels` } : null,
      grade: g,
      gridLabels: ["Alpha", "Beta", "Gamma", "Delta"].slice(0, n),
      gridStaggerFrames: 6,
      stat: { value: 1250, prefix: "$", suffix: "M", label: "raised in 2024", countFrames: 40 },
      quote: { text: "The best way to predict the future is to invent it.", attribution: "Alan Kay" },
      listLines: ["First point", "Second point", "Third point"].map((text, k) => ({ text, atFrame: 8 + k * 12 })),
      cardTitle: layout.replace(/-/g, " ").toUpperCase(),
      cardSubtitle: layout === "map-pin" ? "48,44" : `transition ${t} / motion ${m} / grade ${g}`,
      keyPhrase: "Words carry the idea",
      tier: layout === "pip-over-blur" ? "archival" : "stock",
    };
  });
  const total = broll.length * SHOT;

  const text: TextItem[] = TEXT_STYLES.map((style, i) => {
    const from = i * SHOT * 2 + 15;
    const content = style === "big-number" ? "$4.2M" : style === "lower-third-name" ? "Jane Doe | Senior Editor" : "Every word lands on the beat";
    const words = content.split(" ");
    return {
      id: `tx_${i}`, beatId: `beat_${i}`, from, durationInFrames: 50, content, style, position: POSITIONS[i % POSITIONS.length], anchorWordId: i,
      wordFrames: style === "word-by-word-pop" ? words.map((w, k) => ({ text: w, from: from + k * 5, durationInFrames: 50 - k * 5 })) : undefined,
    };
  });

  const motiongfx: MotionGfxItem[] = GFX.map((type, i) => ({
    id: `gfx_${i}`, beatId: `beat_${i}`, type, from: type === "progress-bar-top" ? 0 : i * SHOT * 1.7 + 20, durationInFrames: type === "progress-bar-top" ? total : 45,
    params: {
      sectionStart: 0, sectionEnd: total, value: 87, suffix: "%", countFrames: 30, label: "adoption", x: 30 + (i % 3) * 20, y: 35 + (i % 2) * 20, w: 26, h: 18,
      toX: 60, toY: 30, radius: 12, icon: ["check", "star", "bolt", "heart", "alert", "dollar", "clock"][i % 7], values: [4, 7, 3, 9], labels: ["Q1", "Q2", "Q3", "Q4"],
      items: ["Sourced", "Trimmed", "Graded"], text: "Clip: Channel Y (CC BY)", count: 40,
    },
  })).map((g) => ({ ...g, from: Math.round(g.from) }));

  return {
    fps: 30, width: 1920, height: 1080, durationInFrames: total, jobId: "showcase", seed: "showcase",
    narration: { src: "solid:#000000", startFrame: 0 }, grade: "clean-cool",
    tracks: {
      broll, text, motiongfx, sfx: [], music: [],
      captions: {
        enabled: true, style: "karaoke-bottom",
        pages: [{ from: 10, durationInFrames: 60, text: "Captions render as karaoke pages", tokens: "Captions render as karaoke pages".split(" ").map((t, k, a) => ({ text: (k < a.length - 1 ? `${t} ` : t), from: 10 + k * 12, durationInFrames: 12 })) }],
      },
      credits: [],
    },
    placementLog: "",
  };
};
