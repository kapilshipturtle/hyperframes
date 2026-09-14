// Spec 13.3 concat + 14 mux + 15.5 asserts.
//   tsx scripts/ts/concat.ts --job <id>
// segments/<seg>.mp4 in frame order -> video_only.mp4 (-c copy; nb_read_frames must equal durationInFrames)
// -> mux with mix.m4a -> final.mp4; then blackdetect / loudness / A-V duration asserts appended to report.md.
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError, main, parseArgs, probeVideo, readJson, requireJob, run, runFfmpegStderr, whichOrDie } from "./lib/common.js";
import { parseLoudnorm } from "./lib/audio_graph.js";
import type { BrollItem, Chunk, Timeline } from "./types.js";

const CARD_LAYOUTS = new Set(["chapter-card", "end-card", "typographic-card"]);
export const MAX_BLACK_FRAMES = 15;

export interface BlackRun { startFrame: number; endFrame: number; frames: number }
export function parseBlackdetect(stderr: string): BlackRun[] {
  const out: BlackRun[] = [];
  for (const m of stderr.matchAll(/black_start:([\d.]+)\s+black_end:([\d.]+)/g)) {
    const s = Math.round(Number(m[1]) * 30), e = Math.round(Number(m[2]) * 30);
    out.push({ startFrame: s, endFrame: e, frames: e - s });
  }
  return out;
}
/** A black run is allowed when every frame of it lies inside intentional cards (chapter/end/typographic). */
export function blackRunAllowed(run: BlackRun, broll: BrollItem[]): boolean {
  const cards = broll.filter((b) => CARD_LAYOUTS.has(b.layout));
  for (let f = run.startFrame; f < run.endFrame; f++) {
    if (!cards.some((c) => f >= c.from && f < c.from + c.durationInFrames)) return false;
  }
  return true;
}

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  whichOrDie("ffmpeg"); whichOrDie("ffprobe");
  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const chunks = readJson<Chunk[]>(join(jobDir, "chunks.json"), "chunks.json").slice().sort((a, b) => a.fromFrame - b.fromFrame);
  if (!chunks.length) throw new CliError("chunks.json is empty");

  // contiguity + presence
  const problems: string[] = [];
  let expect = 0;
  for (const c of chunks) {
    if (c.fromFrame !== expect) problems.push(`${c.id} starts at ${c.fromFrame}, expected ${expect}`);
    expect = c.toFrame + 1;
    if (!existsSync(join(jobDir, "segments", `${c.id}.mp4`))) problems.push(`${c.id}: segments/${c.id}.mp4 is missing`);
  }
  if (expect !== timeline.durationInFrames) problems.push(`chunks end at ${expect} but timeline.durationInFrames is ${timeline.durationInFrames}`);
  if (problems.length) throw new CliError(`cannot concat:\n  ${problems.join("\n  ")}`);

  const listPath = join(jobDir, "list.txt");
  writeFileSync(listPath, chunks.map((c) => `file '${join(jobDir, "segments", `${c.id}.mp4`).replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  const videoOnly = join(jobDir, "video_only.mp4");
  console.log(`[concat ${jobId}] ${chunks.length} segments -> video_only.mp4`);
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", videoOnly]);
  const vp = probeVideo(videoOnly, true);
  if (vp.nb_read_frames !== timeline.durationInFrames) throw new CliError(`video_only.mp4 has ${vp.nb_read_frames} frames, timeline.durationInFrames is ${timeline.durationInFrames}`);
  console.log(`  frame count ok: ${vp.nb_read_frames}`);

  const mix = join(jobDir, "mix.m4a");
  if (!existsSync(mix)) throw new CliError(`mix.m4a missing; run audio_mix first (${mix})`);
  const final = join(jobDir, "final.mp4");
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", videoOnly, "-i", mix, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", final]);
  console.log(`  muxed -> ${final}`);

  // ---- asserts (spec 15.5)
  const lines: string[] = [`## Concat asserts (${new Date().toISOString()})`, ""];
  const fails: string[] = [];
  const fp = probeVideo(final, true);
  lines.push(`- frames: ${fp.nb_read_frames} / expected ${timeline.durationInFrames} ${fp.nb_read_frames === timeline.durationInFrames ? "OK" : "FAIL"}`);
  if (fp.nb_read_frames !== timeline.durationInFrames) fails.push("final frame count");

  const bd = runFfmpegStderr(["-hide_banner", "-i", final, "-vf", "blackdetect=d=0.5:pix_th=0.10", "-an", "-f", "null", "-"]);
  const runs = parseBlackdetect(bd).filter((r) => r.frames > MAX_BLACK_FRAMES);
  const bad = runs.filter((r) => !blackRunAllowed(r, timeline.tracks.broll));
  lines.push(`- blackdetect: ${runs.length} run(s) > ${MAX_BLACK_FRAMES} frames, ${bad.length} outside cards ${bad.length ? "FAIL" : "OK"}`);
  for (const r of bad) lines.push(`  - black ${r.startFrame}..${r.endFrame} (${r.frames} frames)`);
  if (bad.length) fails.push("black frames outside cards");

  const ln = runFfmpegStderr(["-hide_banner", "-i", final, "-vn", "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]);
  const I = Number(parseLoudnorm(ln).input_i);
  const loudOk = Math.abs(I + 14) <= 1;
  lines.push(`- loudness: ${I.toFixed(2)} LUFS integrated (target -14 ±1) ${loudOk ? "OK" : "FAIL"}`);
  if (!loudOk) fails.push("loudness");

  const durs = run("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "csv=p=0", final]).trim().split("\n");
  const get = (t: string) => Number(durs.find((l) => l.startsWith(t))?.split(",")[1]);
  const vDur = get("video"), aDur = get("audio");
  const avOk = Number.isFinite(vDur) && Number.isFinite(aDur) && Math.abs(vDur - aDur) < 1 / 30;
  lines.push(`- A/V duration: video ${vDur.toFixed(3)} s, audio ${aDur.toFixed(3)} s, diff ${(Math.abs(vDur - aDur) * 1000).toFixed(1)} ms ${avOk ? "OK" : "FAIL"}`);
  if (!avOk) fails.push("A/V duration");
  lines.push("");
  appendFileSync(join(jobDir, "report.md"), lines.join("\n") + "\n");
  console.log(lines.join("\n"));
  if (fails.length) throw new CliError(`asserts failed: ${fails.join(", ")} (see report.md)`);
  console.log(`[concat ${jobId}] final.mp4 ok`);
});
