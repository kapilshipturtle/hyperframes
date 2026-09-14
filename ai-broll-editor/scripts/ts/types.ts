// Shared data contracts for ai-broll-editor. Mirrors spec-v3.md section 10.
// Planning files carry milliseconds; timeline.json carries frames only.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** The only ms->frame conversion in the codebase (spec 11.8). */
export const msToFrame = (ms: number): number => Math.round((ms / 1000) * FPS);
export const frameToMs = (f: number): number => Math.round((f / FPS) * 1000);

export const MIN_SHOT_FRAMES = 45;
export const MAX_SHOT_FRAMES = 180;
export const MAX_Y2_FRAMES = 149;

// ---------- transcript.json ----------
export interface Word {
  id: number;
  text: string;
  startMs: number;
  endMs: number;
  conf: number;
  rms?: number;          // mean dBFS of 50 ms RMS bins inside the word
  gapAfterMs?: number;   // silence to next word
}
export interface TranscriptSegment { id: number; text: string; startMs: number; endMs: number; wordIds: number[] }
export interface Silence { startMs: number; endMs: number }
export interface Transcript {
  audioPath: string;
  durationMs: number;
  language: string;
  engine: string;
  words: Word[];
  segments: TranscriptSegment[];
  silences: Silence[];
}

// ---------- beats.json ----------
export type SectionKind = "hook" | "explain" | "story" | "list" | "comparison" | "outro";
export interface Section { id: string; title: string | null; kind: SectionKind; startMs: number; endMs: number; beatIds: string[] }
export interface Beat {
  id: string;
  sectionId: string;
  startMs: number;
  endMs: number;
  wordIds: number[];
  text: string;
  nextWordStartMs: number | null;
  emphasisWordIds: number[];
}
export interface Beats { sections: Section[]; beats: Beat[] }

// ---------- shotplan.json (Director output, intent only) ----------
export type Layout =
  | "fullscreen-clip" | "fullscreen-image-kenburns"
  | "split-left-media-right-text" | "split-right-media-left-text"
  | "grid-2" | "grid-3" | "grid-4" | "pip-over-blur" | "quote-card" | "stat-counter" | "list-reveal"
  | "chapter-card" | "end-card" | "lower-third" | "comparison-split" | "device-frame" | "map-pin"
  | "timeline-strip" | "typographic-card";
export const LAYOUTS: Layout[] = [
  "fullscreen-clip", "fullscreen-image-kenburns", "split-left-media-right-text", "split-right-media-left-text",
  "grid-2", "grid-3", "grid-4", "pip-over-blur", "quote-card", "stat-counter", "list-reveal", "chapter-card",
  "end-card", "lower-third", "comparison-split", "device-frame", "map-pin", "timeline-strip", "typographic-card",
];
export type LayoutFamily = "fullscreen" | "split" | "grid" | "pip" | "card" | "graphic";
export const layoutFamily = (l: Layout): LayoutFamily => {
  if (l.startsWith("fullscreen")) return "fullscreen";
  if (l.startsWith("split") || l === "comparison-split") return "split";
  if (l.startsWith("grid")) return "grid";
  if (l === "pip-over-blur" || l === "device-frame") return "pip";
  if (l.endsWith("card")) return "card";
  return "graphic";
};

export type TransitionFamily = "cut" | "energetic" | "calm" | "documentary" | "tech";
export type TransitionType =
  | "cut" | "fade" | "luma-dissolve" | "wipe" | "slide" | "push-blur" | "zoom-punch" | "whip-pan" | "glitch"
  | "flip" | "iris" | "clockWipe" | "light-leak" | "film-burn" | "shutter" | "pixelate";
export type Direction = "from-left" | "from-right" | "from-top" | "from-bottom";
export type Mood = "energetic" | "calm" | "documentary" | "tech" | "dramatic";
export type Grade = "clean-cool" | "warm-film" | "teal-orange" | "muted-documentary" | "high-contrast-bw" | "vibrant" | "night" | "vintage";
export const GRADES: Grade[] = ["clean-cool", "warm-film", "teal-orange", "muted-documentary", "high-contrast-bw", "vibrant", "night", "vintage"];
export type MusicTag = "upbeat-corporate" | "calm-piano" | "tension-drone" | "documentary-ambient" | "tech-minimal" | "hopeful-strings";
export type SfxTag =
  | "whoosh-soft" | "whoosh-hard" | "swoosh-short" | "pop" | "click" | "tick" | "impact-soft" | "glitch"
  | "camera-shutter" | "typewriter-key" | "riser-short" | "ding" | "counter-tick-loop";
export type TextStyle =
  | "kinetic-bold" | "typewriter" | "highlight-marker" | "lower-third-name" | "big-number" | "caption-box"
  | "outline-stroke" | "gradient-fill" | "slide-up-mask" | "word-by-word-pop";
export type TextPosition =
  | "lower-left" | "lower-center" | "lower-right" | "center" | "upper-left" | "upper-right" | "left-panel" | "right-panel";
export type MotionType = "none" | "ken-burns" | "parallax-drift" | "slow-zoom-out" | "handheld" | "speed-ramp" | "freeze-end";
export type KenBurnsAnchor = "center" | "top-left" | "top" | "top-right" | "left" | "right" | "bottom-left" | "bottom" | "bottom-right";
export interface Motion { type: MotionType; to?: KenBurnsAnchor; zoom?: number; peakFrame?: number; playbackRate?: number }

export interface ShotText { content: string; anchorWordId: number; style: TextStyle; position: TextPosition }
export interface ShotGrid { cells: 2 | 3 | 4; labels: string[] }
export interface Shot {
  beatId: string;
  importance: 1 | 2 | 3 | 4 | 5;
  visualIntent: string;
  layoutPreference: Layout;
  queries: string[];
  preferMotion?: boolean;
  shotScale?: "wide" | "medium" | "close";
  transitionFamily: TransitionFamily;
  text: ShotText | null;
  sfx: SfxTag[];
  motion: Motion;
  grid: ShotGrid | null;
  stat?: { value: number; prefix?: string; suffix?: string; label?: string } | null;
  quote?: { text: string; attribution?: string } | null;
  listLines?: string[] | null;
}
export interface ShotPlan { sectionId: string; mood: Mood; musicTag: MusicTag; grade: Grade; shots: Shot[] }

// ---------- assets.json ----------
export type AssetSource = "pexels" | "openverse" | "wikimedia" | "nasa" | "archiveorg" | "youtube" | "user";
export type AssetTier = "stock" | "archival" | "y1" | "y2" | "user";
export interface Asset {
  assetId: string;
  kind: "video" | "image";
  source: AssetSource;
  srcUrl: string;
  localPath: string;
  preparedPath?: string;
  inMs: number;
  outMs: number;
  width: number;
  height: number;
  fps?: number;
  durationMs?: number;       // source duration
  clipScore: number;
  sceneScore?: number;
  license: string;
  attribution: string | null;
  tier: AssetTier;
  sd?: boolean;              // < 720 lines, archival treatment
  channelTitle?: string;     // youtube
  sourceVideoId?: string;    // youtube: one clip per source video
  headPadFrames?: number;    // written by the Brain (11.7)
  reasons: string[];
}
export interface BeatAssets { chosen: Asset | null; alternates: Asset[] }
export type Assets = Record<string, BeatAssets>;

// ---------- timeline.json ----------
export type Route = "ffmpeg" | "remotion";
export interface MediaRef { src: string; kind: "video" | "image"; startFromFrame: number; label?: string; freezeAfterFrame?: number }
export interface TransitionIn { type: TransitionType; durationInFrames: number; direction?: Direction }
export interface Credit { text: string; corner?: "bottom-left" | "bottom-right" }
export interface BrollItem {
  id: string;                 // beat id (or beat id + suffix for split shots / cards)
  beatId: string;
  sectionId: string;
  from: number;
  durationInFrames: number;
  route: Route;
  segmentId: string;
  layout: Layout;
  media: MediaRef[];
  motion: Motion;
  transitionIn: TransitionIn;
  credit: Credit | null;
  grade?: Grade;              // per-section grade
  gridLabels?: string[];
  gridStaggerFrames?: number;
  stat?: { value: number; prefix?: string; suffix?: string; label?: string; countFrames: number };
  quote?: { text: string; attribution?: string };
  listLines?: { text: string; atFrame: number }[];
  cardTitle?: string;
  cardSubtitle?: string;
  keyPhrase?: string;         // typographic-card
  tier?: AssetTier;
}
export interface TextItem {
  id: string;
  beatId: string;
  from: number;
  durationInFrames: number;
  content: string;
  style: TextStyle;
  position: TextPosition;
  anchorWordId: number;
  wordFrames?: { text: string; from: number; durationInFrames: number }[]; // word-by-word styles
}
export interface MotionGfxItem {
  id: string;
  beatId: string;
  type: "stat-counter" | "progress-bar-top" | "arrow-callout" | "highlight-box" | "circle-reveal" | "underline-draw"
      | "icon-pop" | "particles-light" | "bar-chart-mini" | "checklist-tick" | "corner-credit";
  from: number;
  durationInFrames: number;
  params: Record<string, unknown>;
}
export interface SfxItem { id: string; from: number; src: string; volume: number; tag: SfxTag; reason: string }
export interface MusicItem {
  id: string; from: number; durationInFrames: number; src: string; volume: number;
  fadeInFrames: number; fadeOutFrames: number; startFromFrame?: number; sectionIds: string[]; tag: MusicTag;
  loopAtFrames?: number[];
}
export interface CaptionPage { from: number; durationInFrames: number; text: string; tokens: { text: string; from: number; durationInFrames: number }[] }
export interface CreditLine { source: string; text: string; beatId?: string; tier?: AssetTier }
export interface Timeline {
  fps: 30;
  width: 1920;
  height: 1080;
  durationInFrames: number;
  jobId: string;
  seed: string;
  narration: { src: string; startFrame: number };
  grade: Grade;
  duckCurve?: string;             // path to duckCurve.json (one value per frame)
  tracks: {
    broll: BrollItem[];
    text: TextItem[];
    motiongfx: MotionGfxItem[];
    sfx: SfxItem[];
    music: MusicItem[];
    captions: { enabled: boolean; style: string; pages: CaptionPage[] };
    credits: CreditLine[];
  };
  placementLog: string;
}

// ---------- chunks.json ----------
export interface Chunk { id: string; route: Route; fromFrame: number; toFrame: number; hash: string; brollIds: string[] }

// ---------- placement log ----------
export interface LogLine {
  pass: string; beatId?: string; decision: string; from?: number; durationInFrames?: number; reason: string; overrides?: string[];
}

// ---------- job.yaml ----------
export interface JobConfig {
  job_id: string;
  input_audio: string;
  language: string;
  fps: 30;
  width: 1920;
  height: 1080;
  style_preset: "documentary" | "energetic" | "calm" | "tech";
  grade: Grade;
  brand: { primary: string; accent: string; font_heading: string; font_body: string };
  transcription: { engine: "groq" | "whispercpp" | "whisperx"; align: boolean; glossary: string; corrections: Record<string, string> };
  sources: { pexels: boolean; openverse: boolean; wikimedia: boolean; nasa: boolean; archiveorg: boolean };
  youtube: boolean;
  youtube_short_clip: boolean;
  captions: boolean;
  music: boolean;
  sfx: boolean;
  brain: { lead_ms: number; clip_threshold: number; hero_threshold: number; typographic_cap: number };
  render: { workers: number; runner: string; draft: boolean };
}

// ---------- packs ----------
export interface SfxManifestEntry { tag: SfxTag; file: string; durationMs: number; source: string; license: string; direction?: "ltr" | "rtl" }
export interface MusicManifestEntry { mood: MusicTag; file: string; bpm: number; durationMs: number; source: string; license: string }
