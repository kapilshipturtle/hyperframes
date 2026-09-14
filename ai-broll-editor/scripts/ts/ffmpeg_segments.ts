// Spec 13.3: render every chunk with route "ffmpeg" as one filter_complex invocation.
//   tsx scripts/ts/ffmpeg_segments.ts --job <id> [--dry-run] [--only seg_0007[,seg_0009]]
// Output: work/<id>/segments/<chunkId>.mp4, verified with ffprobe nb_frames == chunk length.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CliError, H264_FLAGS, flagBool, flagString, main, parseArgs, probeVideo, readJson, requireJob, resolveMedia, run, whichOrDie } from "./lib/common.js";
import { buildSegmentGraph, ffmpegArgs } from "./lib/ffmpeg_graph.js";
import { gradeFilter, loadGrades } from "./lib/grades.js";
import type { Chunk, Timeline } from "./types.js";

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  const dryRun = flagBool(args, "dry-run");
  const only = flagString(args, "only")?.split(",").map((s) => s.trim()).filter(Boolean);
  if (!dryRun) { whichOrDie("ffmpeg"); whichOrDie("ffprobe"); }

  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const chunks = readJson<Chunk[]>(join(jobDir, "chunks.json"), "chunks.json");
  const { grades, source } = loadGrades();
  console.log(`[ffmpeg_segments ${jobId}] grades from ${source}`);

  let targets = chunks.filter((c) => c.route === "ffmpeg");
  if (only) {
    for (const id of only) {
      const c = chunks.find((x) => x.id === id);
      if (!c) throw new CliError(`--only: chunk "${id}" not in chunks.json`);
      if (c.route !== "ffmpeg") throw new CliError(`--only: chunk "${id}" has route ${c.route}; render it with Remotion`);
    }
    targets = targets.filter((c) => only.includes(c.id));
  }
  if (!targets.length) { console.log(`[ffmpeg_segments ${jobId}] no ffmpeg chunks to render`); return; }
  mkdirSync(join(jobDir, "segments"), { recursive: true });

  const missing: string[] = [];
  const resolveSrc = (src: string): string => {
    const p = resolveMedia(src, jobDir);
    if (!p) { missing.push(src); return src; }
    return p;
  };

  const failures: string[] = [];
  for (const chunk of targets) {
    const items = timeline.tracks.broll.filter((b) => chunk.brollIds.length ? chunk.brollIds.includes(b.id) : true);
    const grade = items.find((i) => i.grade)?.grade ?? timeline.grade;
    let graph;
    try { graph = buildSegmentGraph(chunk, items, gradeFilter(grade, grades), resolveSrc); }
    catch (e) { throw new CliError(`${chunk.id}: ${(e as Error).message}`); }
    if (missing.length) throw new CliError(`${chunk.id}: media not found (looked in the job dir, assets/, package root):\n  ${[...new Set(missing)].join("\n  ")}`);

    const out = join(jobDir, "segments", `${chunk.id}.mp4`);
    const cmd = ffmpegArgs(graph, out, H264_FLAGS);
    if (dryRun) {
      console.log(`\n# ${chunk.id}: frames ${chunk.fromFrame}..${chunk.toFrame} (${graph.expectedFrames}f), grade ${grade}, items ${graph.items.map((i) => `${i.id}:${i.frames}f${i.fadeFrames ? `(fade ${i.fadeFrames})` : ""}`).join(" ")}`);
      console.log("ffmpeg " + cmd.map((a) => (/[\s;\[\]'(),:=]/.test(a) ? `'${a.replace(/'/g, "'\\''")}'` : a)).join(" "));
      continue;
    }
    console.log(`[ffmpeg_segments ${jobId}] ${chunk.id}: ${graph.expectedFrames} frames from ${graph.items.length} item(s), grade ${grade}`);
    const t0 = Date.now();
    run("ffmpeg", cmd, { stdio: ["ignore", "pipe", "pipe"] });
    if (!existsSync(out)) { failures.push(`${chunk.id}: ffmpeg produced no file`); continue; }
    const probe = probeVideo(out, true);
    const got = probe.nb_read_frames ?? probe.nb_frames;
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    if (got !== graph.expectedFrames) failures.push(`${chunk.id}: expected ${graph.expectedFrames} frames, ffprobe counted ${got}`);
    else console.log(`  ok ${out} (${got} frames, ${secs}s, ${(graph.expectedFrames / Number(secs || 1)).toFixed(0)} fps)`);
  }
  if (failures.length) throw new CliError(`frame-count verification failed:\n  ${failures.join("\n  ")}`);
  if (!dryRun) console.log(`[ffmpeg_segments ${jobId}] ${targets.length} segment(s) verified`);
});
