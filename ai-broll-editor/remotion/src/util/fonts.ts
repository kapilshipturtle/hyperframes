import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";

// ONE family carries the film. Research finding: a display serif (we shipped Playfair)
// is wrong for this genre — Vox uses Balto, Bloomberg uses Avenir Heavy, and all five
// of the repo's own measured style profiles specify bold-sans or condensed-sans.
// Archivo is the closest free Gotham-adjacent face and has a condensed sibling, so one
// family covers display and body without a second typeface.
//
// Loaded once at module level (spec 16.4).
export const ARCHIVO = loadArchivo("normal", { weights: ["400", "500", "600", "700", "800", "900"], subsets: ["latin"] }).fontFamily;
export const INTER = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily;
export const BEBAS = loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

/** The film's display face. Everything on screen should come from here. */
export const DISPLAY = ARCHIVO;
/** Body/UI face for credits and small labels. */
export const BODY = ARCHIVO;

/** Tracking as a FUNCTION of size, not a constant.
 *
 *  Tracking 0 on everything is the giveaway of default-caption typography. Editorial
 *  practice is negative tracking as size increases and positive tracking on uppercase
 *  and small text.
 *
 *  @param sizePctH font size as a percentage of frame height
 *  @returns tracking in em, for CSS letterSpacing
 */
export const trackingEm = (sizePctH: number, isUpper = false): number => {
  const base = -0.022 * Math.log2(Math.max(0.5, sizePctH) / 2.0);
  const v = base + (isUpper ? 0.08 : 0);
  return Math.max(-0.035, Math.min(0.14, v));
};

/** Font size from a percentage of frame height, so type scales to 4K. */
export const sizeFromPctH = (pctH: number, frameHeight: number): number =>
  Math.round((pctH / 100) * frameHeight);

/** Drop shadow scaled to the type size — a fixed 0 1px 3px vanishes on a 150px stat. */
export const scaledShadow = (fontPx: number, alpha = 0.45): string =>
  `0 ${Math.round(0.02 * fontPx)}px ${Math.round(0.10 * fontPx)}px rgba(0,0,0,${alpha})`;
