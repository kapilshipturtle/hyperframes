import type { MainProps } from "./types";

/** Tiny hard-coded 10 s timeline with placeholder solid-colour media so the pipeline can render with no assets. */
export const DEFAULT_TIMELINE: MainProps = {
  fps: 30, width: 1920, height: 1080, durationInFrames: 300, jobId: "default", seed: "default",
  narration: { src: "solid:#000000", startFrame: 0 },
  grade: "clean-cool",
  tracks: {
    broll: [
      { id: "b_0001", beatId: "beat_1", sectionId: "s1", from: 0, durationInFrames: 100, route: "remotion", segmentId: "seg_1", layout: "fullscreen-clip",
        media: [{ src: "solid:#1D4ED8", kind: "image", startFromFrame: 0, label: "shot 1" }], motion: { type: "ken-burns", to: "top-right", zoom: 1.12, peakFrame: 40 },
        transitionIn: { type: "cut", durationInFrames: 0 }, credit: null },
      { id: "b_0002", beatId: "beat_2", sectionId: "s1", from: 100, durationInFrames: 100, route: "remotion", segmentId: "seg_1", layout: "split-left-media-right-text",
        media: [{ src: "solid:#DC2626", kind: "image", startFromFrame: 0, label: "shot 2" }], motion: { type: "none" }, cardTitle: "Placeholder", cardSubtitle: "solid-colour media",
        transitionIn: { type: "wipe", durationInFrames: 12, direction: "from-left" }, credit: { text: "Video by X on Pexels" } },
      { id: "b_0003", beatId: "beat_3", sectionId: "s1", from: 200, durationInFrames: 100, route: "remotion", segmentId: "seg_1", layout: "typographic-card",
        media: [], motion: { type: "none" }, keyPhrase: "Real footage, exact timing",
        transitionIn: { type: "zoom-punch", durationInFrames: 8 }, credit: null },
    ],
    text: [
      { id: "t_0001", beatId: "beat_1", from: 30, durationInFrames: 60, content: "Break it down", style: "kinetic-bold", position: "lower-left", anchorWordId: 4 },
    ],
    motiongfx: [
      { id: "g_0001", beatId: "beat_1", type: "progress-bar-top", from: 0, durationInFrames: 300, params: { sectionStart: 0, sectionEnd: 300 } },
    ],
    sfx: [],
    music: [],
    captions: { enabled: false, style: "karaoke-bottom", pages: [] },
    credits: [],
  },
  placementLog: "",
};
