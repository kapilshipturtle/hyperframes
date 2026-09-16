// Internal working model shared by the Brain passes. Public contracts live in ../types.ts.
import type {
  Asset, Assets, Beat, Beats, Grade, JobConfig, Layout, Motion, Mood, MusicManifestEntry, Section, SectionKind, SfxManifestEntry,
  Shot, ShotPlan, Transcript, TransitionIn, Word, AssetTier, Credit, MusicTag,
} from "../types.js";
import type { Rng } from "./rng.js";
import type { PlacementLog } from "./log.js";

export const BRAIN_VERSION = "brain-v3.0.0";

export type ShotKind = "beat" | "chapter-card" | "end-card" | "split";

/** P2 output: a cut in ms. Cards and split halves are cuts too. */
export interface Cut {
  id: string;             // item id
  beatId: string;         // owning beat (cards: the beat they precede / follow)
  sectionId: string;
  kind: ShotKind;
  cutMs: number;
  endMs: number;
  wordIds: number[];      // words spoken inside this cut window
  reason: string;
  heldMoment?: boolean;   // 11.5 long-pause split: second half -> slow-zoom-out
}

/** P4..P6 working shot. Frames are filled by P6. */
export interface WorkShot {
  /** Set by rule 5 when this is the third full-screen shot in a row: vary the
   *  camera move rather than switching to a different layout family. */
  varyMotion?: boolean;
  id: string;
  beatId: string;
  beatIds: string[];      // constituent beats (after merges)
  sectionId: string;
  kind: ShotKind;
  cutMs: number;
  endMs: number;
  wordIds: number[];
  // P4
  layout: Layout;
  asset: Asset | null;
  extraAssets: Asset[];   // grid cells / comparison
  media: { src: string; kind: "video" | "image"; startFromFrame: number; label?: string; freezeAfterFrame?: number }[];
  motion: Motion;
  tier?: AssetTier;
  credit: Credit | null;
  keyPhrase?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  gridLabels?: string[];
  stat?: { value: number; prefix?: string; suffix?: string; label?: string } | null;
  quote?: { text: string; attribution?: string } | null;
  listLines?: string[] | null;
  importance: number;
  plan: Shot | null;
  overrides: string[];
  // P5
  transitionIn: TransitionIn;
  // P6
  from: number;           // includes transition head (cutFrame - T)
  cutFrame: number;
  durationInFrames: number; // D + T
  netFrames: number;      // D
  heldMoment?: boolean;
  continuation?: boolean; // split second half continuing the same media
}

export interface SectionCtx {
  section: Section;
  plan: ShotPlan;
  planByBeat: Map<string, Shot>;
  fallback: boolean;
  mood: Mood;
  grade: Grade;
  musicTag: MusicTag;
}

export interface Ctx {
  jobDir: string;
  job: JobConfig;
  seed: string;
  rng: Rng;
  /** Per-key RNG (seed + key) so a repair on one beat never re-rolls choices elsewhere (11.15 locality). */
  rngFor(key: string): Rng;
  log: PlacementLog;
  transcript: Transcript;
  words: Word[];
  wordById: Map<number, Word>;
  beats: Beats;
  beatById: Map<string, Beat>;
  sections: SectionCtx[];
  sectionById: Map<string, SectionCtx>;
  assets: Assets;
  prepared: Record<string, { assetId: string; path: string }>;  // prepared/manifest.json: `beatId` (own chosen) or `beatId:assetId`
  sfxPack: SfxManifestEntry[];
  musicPack: MusicManifestEntry[];
  rmsBins: number[] | null;      // 50 ms RMS bins (dBFS)
  leadMs: number;
  clipThreshold: number;
  heroThreshold: number;
  typographicCap: number;
  totalFrames: number;
  /** P3 output: word id -> emphasis weight; strong >= 1.0, medium >= 0.5 */
  emphasis: Map<number, number>;
}

export const sectionKindOf = (ctx: Ctx, sectionId: string): SectionKind => ctx.sectionById.get(sectionId)?.section.kind ?? "explain";
export const isStrong = (ctx: Ctx, wordId: number): boolean => (ctx.emphasis.get(wordId) ?? 0) >= 1.0;
