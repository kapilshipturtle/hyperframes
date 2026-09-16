// Style presets (researched 2026-09-16). One place that answers "what are the numbers
// for this look?", so the Brain's passes read a profile instead of hardcoding taste.
//
// EVIDENCE DISCIPLINE: every preset carries `_evidence`. "measured" = frame-by-frame
// study, "standard" = a published spec, "knob" = craft folklore that should be tuned
// against our own corpus. Roughly 60 % of the editing numbers on the web are folklore;
// they are fine as defaults and unsafe as asserted facts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const PRESETS_PATH = path.resolve(here, "..", "..", "..", "references", "style-presets.json");

export interface Range { 0: number; 1: number; length: 2 }
type Pair = [number, number];

export interface StyleLaws {
  layout_period_seconds: Pair;
  long_hold: { duration_s: Pair; position_pct: Pair; count: number };
  hook: { cuts_in_first_30s: Pair };
  tail: { cuts_in_last_30s: Pair };
}
export interface StylePreset {
  label: string;
  pacing: { beat_s: Pair; cuts_per_min: Pair; median_shot_s: Pair; p90_shot_s: Pair; cutting_swing_min_s: number };
  dynamic_profile: { hook_cpm: number; body_cpm: number; tail_cpm: number };
  motion: {
    static_share: Pair; max_rate_pct_per_s: number; drift_pct_per_s: Pair;
    ken_burns_pct_per_s: Pair; video_gets_motion_only_if_held_s: number;
  };
  transitions: { soft_share: Pair; types: string[]; duration_frames: Pair };
  typography: {
    family: string; case: "sentence" | "upper"; text_pct: string; ink: string; accent: string;
    accent_max_share_of_shots: number;
    size_pct_h: Record<string, Pair>;
    styles_allowed: string[];
  };
  texture: { grain: number; vignette: boolean; lift_black_ire: number; halation?: number };
  negative_constraints: string[];
}

let cache: { laws: StyleLaws; presets: Record<string, StylePreset> } | null = null;

function load(): { laws: StyleLaws; presets: Record<string, StylePreset> } {
  if (cache) return cache;
  const raw = JSON.parse(fs.readFileSync(PRESETS_PATH, "utf8"));
  cache = { laws: raw._laws as StyleLaws, presets: raw.presets as Record<string, StylePreset> };
  return cache;
}

export const laws = (): StyleLaws => load().laws;
export const presetNames = (): string[] => Object.keys(load().presets);

/** Resolve a job's style_preset. Unknown names fall back to `documentary` loudly. */
export function preset(name: string | undefined, warn?: (m: string) => void): StylePreset {
  const { presets } = load();
  const key = name && presets[name] ? name : "documentary";
  if (name && !presets[name]) warn?.(`unknown style_preset "${name}"; using documentary. Available: ${Object.keys(presets).join(", ")}`);
  return presets[key];
}

/** The long hold scales with runtime: the measured 30-60 s figure comes from 10-20 min
 *  videos, where it is ~5 % of runtime. On a 2-minute film that would be a third of it. */
export function holdTargetFrames(totalFrames: number, fps: number, l: StyleLaws): number {
  const runtimeS = totalFrames / fps;
  const byShare = runtimeS * 0.09;              // ~9 % of the film
  const [lo, hi] = l.long_hold.duration_s;
  return Math.round(Math.max(lo, Math.min(hi, byShare)) * fps);
}

/** Frame window in which the long hold should land (72-92 % of runtime by default). */
export function holdWindowFrames(totalFrames: number, l: StyleLaws): [number, number] {
  const [a, b] = l.long_hold.position_pct;
  return [Math.floor(totalFrames * a), Math.floor(totalFrames * b)];
}
