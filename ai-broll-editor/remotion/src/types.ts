// Single import point for the shared contracts. Do NOT fork: this re-exports scripts/ts/types.ts.
export * from "../../scripts/ts/types";
import type { Timeline } from "../../scripts/ts/types";

/** Props of the "Main" composition: the timeline plus an optional per-frame music duck curve (0..1). */
// Mapped alias (not an interface) so it satisfies Remotion's Record<string, unknown> props constraint.
export type MainProps = { [K in keyof Timeline]: Timeline[K] } & { duckCurveValues?: number[] };
