// Per-grade FFmpeg filter strings. Prefers the Remotion builder's calibrated
// remotion/src/components/grades/grades.json; falls back to spec 16.5 verbatim.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Grade } from "../types.js";
import { PACKAGE_ROOT } from "./common.js";

export interface GradeDef { css: string; ffmpeg: string; grain: number; vignette: boolean }

// Spec 16.5 FFmpeg column. `noise` is expressed via `grain` and appended by gradeFilter().
export const FALLBACK_GRADES: Record<Grade, GradeDef> = {
  "clean-cool":         { css: "contrast(1.05) saturate(0.95)", ffmpeg: "eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04", grain: 0, vignette: true },
  "warm-film":          { css: "sepia(0.12) contrast(1.08)", ffmpeg: "eq=contrast=1.08,colorbalance=rs=0.05:bs=-0.04", grain: 6, vignette: true },
  "teal-orange":        { css: "", ffmpeg: "colorbalance=rs=0.06:bs=0.08:rm=-0.03", grain: 0, vignette: true },
  "muted-documentary":  { css: "saturate(0.8) contrast(1.03)", ffmpeg: "eq=saturation=0.8:contrast=1.03", grain: 0, vignette: true },
  "high-contrast-bw":   { css: "grayscale(1) contrast(1.3)", ffmpeg: "hue=s=0,eq=contrast=1.3", grain: 0, vignette: true },
  "vibrant":            { css: "saturate(1.25) contrast(1.05)", ffmpeg: "eq=saturation=1.25:contrast=1.05", grain: 0, vignette: true },
  "night":              { css: "brightness(0.85)", ffmpeg: "eq=brightness=-0.06,colorbalance=bs=0.1", grain: 0, vignette: true },
  "vintage":            { css: "sepia(0.25) contrast(1.1)", ffmpeg: "eq=contrast=1.1,colorbalance=rs=0.08:gs=0.03", grain: 12, vignette: true },
};

export const GRADES_JSON_PATH = join(PACKAGE_ROOT, "remotion", "src", "components", "grades", "grades.json");

let cached: { grades: Record<string, GradeDef>; source: string } | null = null;
export function loadGrades(): { grades: Record<string, GradeDef>; source: string } {
  if (cached) return cached;
  if (existsSync(GRADES_JSON_PATH)) {
    const raw = JSON.parse(readFileSync(GRADES_JSON_PATH, "utf8")) as Record<string, Partial<GradeDef>>;
    const grades: Record<string, GradeDef> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v.ffmpeg !== "string") continue;
      grades[k] = { css: v.css ?? "", ffmpeg: v.ffmpeg, grain: Number(v.grain ?? 0), vignette: v.vignette !== false };
    }
    if (Object.keys(grades).length) { cached = { grades: { ...FALLBACK_GRADES, ...grades }, source: GRADES_JSON_PATH }; return cached; }
  }
  cached = { grades: { ...FALLBACK_GRADES }, source: "spec-16.5-fallback" };
  return cached;
}

/** Full grade chain for one segment: grade + vignette=PI/5 (+ noise when grain > 0). */
export function gradeFilter(grade: string, defs: Record<string, GradeDef> = loadGrades().grades): string {
  const g = defs[grade];
  if (!g) throw new Error(`Unknown grade "${grade}" (known: ${Object.keys(defs).join(", ")})`);
  const parts = [g.ffmpeg];
  if (g.vignette) parts.push("vignette=PI/5");
  // ffmpeg `noise` filter already present in the calibrated string? don't double it.
  if (g.grain > 0 && !/(^|,)noise=/.test(g.ffmpeg)) parts.push(`noise=alls=${g.grain}:allf=t`);
  return parts.filter(Boolean).join(",");
}
