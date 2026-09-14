// Single import point for the shared contracts. Do NOT fork: this re-exports scripts/ts/types.ts.
export * from "../../scripts/ts/types";
import type { Timeline } from "../../scripts/ts/types";

/** Props of the "Main" composition: the timeline plus an optional per-frame music duck curve (0..1). */
// Mapped alias (not an interface) so it satisfies Remotion's Record<string, unknown> props constraint.
/** renderAudio: false (default) = video-only render; the audio mix is FFmpeg's job (spec 14) and CI renders are --muted.
 *  Set true in Studio to hear narration/music/sfx (paths must then resolve under the public dir). */
export type MainProps = { [K in keyof Timeline]: Timeline[K] } & { duckCurveValues?: number[]; renderAudio?: boolean };
