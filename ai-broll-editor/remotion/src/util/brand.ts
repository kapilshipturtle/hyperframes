// Palette. Two research findings drive these values:
//   * pure #FFFFFF text is a default-caption tell; a warm off-white reads as designed.
//   * a navy ground reads corporate. A warm near-black reads filmic.
export const BRAND = {
  primary: "#12100E",        // warm near-black ground (was #0F172A navy)
  accent: "#E4552B",         // one accent per film, <= 1 element per frame
  paper: "#F8FAFC",
  ink: "#12100E",
  white: "#F5F3EF",          // warm off-white — the film's text colour
  pureWhite: "#FFFFFF",      // only where a spec genuinely requires pure white
  muted: "rgba(245,243,239,0.68)",
};
export const SAFE = 0.05; // 5 % safe area (title-safe 90 %)
export const MAX_BLUR_PX = 24; // spec 13.1: no huge blurs
export const clampBlur = (px: number): number => Math.min(MAX_BLUR_PX, Math.max(0, px));

/** Four-stop eased scrim.
 *
 *  The best-verified number in the craft research: a TWO-stop gradient produces a
 *  perceptual Mach band — the eye sees a false edge where the gradient ends — and that
 *  edge is what makes an overlay look cheap. Four eased stops match how light actually
 *  falls off and remove it.
 */
export const scrimGradient = (from: "bottom" | "top", peak = 0.8): string => {
  const dir = from === "bottom" ? "to top" : "to bottom";
  const p = Math.max(0, Math.min(1, peak));
  return `linear-gradient(${dir},` +
    ` rgba(0,0,0,${(p).toFixed(3)}) 0%,` +
    ` rgba(0,0,0,${(p * 0.625).toFixed(3)}) 30%,` +
    ` rgba(0,0,0,${(p * 0.125).toFixed(3)}) 55%,` +
    ` rgba(0,0,0,0) 70%)`;
};
