// Exact trim lengths for scripts/py/prepare_assets.py, derived from timeline.json (frames) + assets.json.
//   tsx scripts/ts/prepare_needs.ts --job <id>
// Writes work/<id>/prepare-needs.json:
//   { "<beatId>": { neededFrames, headPadFrames, itemIds, media: [src...] } }
// neededFrames = item.durationInFrames + 6 safety (max over the beat's items); headPadFrames = transitionIn.durationInFrames.
import { join } from "node:path";
import { CliError, main, parseArgs, readJson, requireJob, writeJson } from "./lib/common.js";
import type { Assets, Timeline } from "./types.js";

export const SAFETY_FRAMES = 6;
export interface PrepareNeed { beatId: string; neededFrames: number; headPadFrames: number; itemIds: string[]; media: string[] }

export function computeNeeds(timeline: Timeline): Record<string, PrepareNeed> {
  const out: Record<string, PrepareNeed> = {};
  for (const it of timeline.tracks.broll) {
    const real = it.media.filter((m) => !m.src.startsWith("solid:"));
    if (!real.length) continue;
    const head = it.transitionIn.type === "cut" ? 0 : it.transitionIn.durationInFrames;
    const need = it.durationInFrames + SAFETY_FRAMES;
    const cur = out[it.beatId] ?? { beatId: it.beatId, neededFrames: 0, headPadFrames: 0, itemIds: [], media: [] };
    cur.neededFrames = Math.max(cur.neededFrames, need);
    cur.headPadFrames = Math.max(cur.headPadFrames, head);
    cur.itemIds.push(it.id);
    for (const m of real) if (!cur.media.includes(m.src)) cur.media.push(m.src);
    out[it.beatId] = cur;
  }
  return out;
}

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const assets = readJson<Assets>(join(jobDir, "assets.json"), "assets.json");
  const needs = computeNeeds(timeline);
  const missing = Object.keys(needs).filter((beatId) => !assets[beatId]?.chosen);
  if (missing.length) throw new CliError(`timeline references media for beats with no chosen asset in assets.json: ${missing.join(", ")}`);
  const dest = join(jobDir, "prepare-needs.json");
  writeJson(dest, needs);
  const n = Object.keys(needs).length;
  const pads = Object.values(needs).filter((x) => x.headPadFrames > 0).length;
  console.log(`[prepare_needs ${jobId}] ${n} beat(s) need prepared media (${pads} with head padding) -> ${dest}`);
});
