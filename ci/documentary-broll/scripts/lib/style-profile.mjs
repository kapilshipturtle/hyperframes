// style-profile.mjs — loads references/style-profiles.json and exposes one
// profile's targets to every script that takes `--profile <name>`.
//
// Profiles are MEASURED (25 top-viewed retention-explainer videos, four
// channels, every cut/shot/text event/SFX — see scripts/style-analysis/ and
// the `_measured` note on each profile), not taste guesses. `documentary`
// reproduces the skill's pre-profile behaviour: any script that receives
// `--profile documentary` (or no --profile at all) must behave exactly as it
// did before profiles existed — that invariant is what keeps the two shipped
// films rebuilding identically.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PROFILES_PATH = join(HERE, "..", "..", "references", "style-profiles.json");

let cache = null;
export function loadProfiles(path = PROFILES_PATH) {
  if (cache && path === PROFILES_PATH) return cache;
  if (!existsSync(path)) throw new Error(`style-profile: profiles file not found at ${path}`);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  if (path === PROFILES_PATH) cache = parsed;
  return parsed;
}

export function profileNames() {
  return Object.keys(loadProfiles().profiles);
}

// Returns the profile object, or null for a missing/"documentary" name when
// `allowNull` is set — callers use null to mean "legacy behaviour, don't
// consult profile targets at all".
export function loadProfile(name, { allowNull = true } = {}) {
  if (!name) return allowNull ? null : loadProfiles().profiles.documentary;
  const p = loadProfiles().profiles[name];
  if (!p) {
    throw new Error(`style-profile: unknown profile "${name}" — expected one of: ${profileNames().join(", ")}`);
  }
  return { name, ...p };
}

export function isExplainerProfile(profile) {
  return Boolean(profile && profile.name && profile.name !== "documentary");
}

// Linear SFX volume for a cue name from the measured level table (falls back
// to the engine's own default when a cue isn't listed).
export function sfxLevel(cueName, fallback = 0.1) {
  const t = loadProfiles().sfx_levels_linear || {};
  return t[cueName] != null ? t[cueName] : fallback;
}

// dB (relative to narration = 0 dB) -> linear volume.
export function dbToLinear(db) {
  return Number(Math.pow(10, db / 20).toFixed(4));
}

// Deterministic "every k-th boundary" selector shared by pick-transitions
// (hard-cut whoosh share, dissolve share) and plan-sfx — no Math.random
// anywhere (seek-safe / reproducible render rule). share=0.33 -> roughly one
// in three, spread evenly (Bresenham-style accumulation), never two in a row
// unless share > 0.5.
export function shareMask(count, share, phase = 0) {
  const mask = new Array(count).fill(false);
  if (!share || share <= 0) return mask;
  let acc = phase;
  for (let i = 0; i < count; i++) {
    acc += share;
    if (acc >= 1) { mask[i] = true; acc -= 1; }
  }
  return mask;
}
