// Rule-based planner fallback (spec 7 last line; used when plans/<section>.json is missing or invalid).
// alternate fullscreen-clip / kenburns, cut/fade, text on ~35% of beats (strongest 2..4 consecutive words), importance 3.
import type { Beat, Grade, Shot, ShotPlan, Section, Word } from "../types.js";
import { keyPhrase } from "./emphasis.js";
import { sha1 } from "./rng.js";

export function fallbackPlan(section: Section, beats: Beat[], words: Map<number, Word>, emph: Map<number, number>, grade: Grade, seed: string): ShotPlan {
  const shots: Shot[] = beats.map((b, i) => {
    const ws = b.wordIds.map((id) => words.get(id)!).filter(Boolean);
    // deterministic ~35 %: hash of seed + beat id
    const h = parseInt(sha1(`${seed}:${b.id}`).slice(0, 8), 16) % 100;
    const withText = h < 35 && ws.length >= 2;
    const kp = withText ? keyPhrase(emph, ws, 2, 4) : null;
    const isImage = i % 2 === 1;
    return {
      beatId: b.id,
      importance: 3,
      visualIntent: b.text,
      layoutPreference: isImage ? "fullscreen-image-kenburns" : "fullscreen-clip",
      queries: [],
      preferMotion: !isImage,
      shotScale: (["wide", "medium", "close"] as const)[i % 3],
      transitionFamily: "documentary",
      text: kp && kp.text ? { content: kp.text, anchorWordId: kp.wordIds[0], style: "kinetic-bold", position: i % 2 ? "lower-right" : "lower-left" } : null,
      sfx: i % 2 ? ["whoosh-soft"] : [],
      motion: isImage ? { type: "ken-burns", to: "center", zoom: 1.1 } : { type: "none" },
      grid: null,
    };
  });
  return { sectionId: section.id, mood: "documentary", musicTag: "documentary-ambient", grade, shots };
}
