import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBebas } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";

// Loaded once at module level (spec 16.4).
export const INTER = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] }).fontFamily;
export const BEBAS = loadBebas("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
export const PLAYFAIR = loadPlayfair("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
