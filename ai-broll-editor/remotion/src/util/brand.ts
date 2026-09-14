export const BRAND = {
  primary: "#0F172A",
  accent: "#F59E0B",
  paper: "#F8FAFC",
  ink: "#0B1220",
  white: "#FFFFFF",
  muted: "rgba(255,255,255,0.72)",
};
export const SAFE = 0.05; // 5 % safe area
export const MAX_BLUR_PX = 24; // spec 13.1: no huge blurs
export const clampBlur = (px: number): number => Math.min(MAX_BLUR_PX, Math.max(0, px));
