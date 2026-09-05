#!/usr/bin/env node
// concat-chunked-renders.mjs — losslessly concatenates the finished MP4s
// produced by rendering each split-for-chunked-render.mjs chunk separately,
// back into one final full-length video. See split-for-chunked-render.mjs's
// header for the full reasoning (a confirmed, source-verified concurrency
// bug in the hyperframes CLI's video_extract stage, unfixable via any flag,
// worked around by rendering fewer distinct video sources at a time).
//
// ZERO QUALITY LOSS: uses ffmpeg's `concat` DEMUXER (`-f concat`), which is
// a pure stream-copy operation (`-c copy`) when all inputs share the same
// codec/resolution/timebase — which they always will here, since every
// chunk was rendered by the exact same `hyperframes render` command against
// sub-projects that share the identical composition settings (fps, quality,
// codec) as the original whole-film project. No re-encode happens at any
// point in this script — the final file's video/audio streams are bit-
// identical copies of each chunk's own encoded output, just concatenated.
// This is NOT the concat FILTER (`concat` in a `-filter_complex` graph),
// which re-encodes and would be lossy — deliberately avoided.
//
// Because every chunk boundary was chosen (by split-for-chunked-render.mjs)
// to fall exactly on a pre-existing hard-cut transition, the seam between
// two chunks is already a plain instantaneous cut with no blended pixels to
// reproduce — concatenating there is indistinguishable from what a single
// uninterrupted render would have produced at that same timestamp.
//
// Usage:
//   node concat-chunked-renders.mjs --chunks-dir .hyperframes/chunks \
//     --out renders/video.mp4 [--log .hyperframes/run-log.md]
//
// Expects each chunk-NN/ subdirectory (as written by split-for-chunked-
// render.mjs) to contain its own renders/video.mp4 already produced by
// running the standard lint/check/render pipeline against that chunk as a
// standalone project.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { RunLog } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

function main() {
  const argv = process.argv.slice(2);
  const chunksDir = flag(argv, "chunks-dir", ".hyperframes/chunks");
  const outPath = flag(argv, "out", "renders/video.mp4");

  const manifestPath = join(chunksDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error(`✗ concat-chunked-renders: manifest not found at ${manifestPath} — run split-for-chunked-render.mjs first.`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const chunkVideoPaths = [];
  const missing = [];
  for (const chunk of manifest.chunks) {
    const videoPath = join(chunksDir, chunk.dirName, "renders/video.mp4");
    if (!existsSync(videoPath)) {
      missing.push({ chunk: chunk.dirName, expected: videoPath });
    } else {
      chunkVideoPaths.push(resolve(videoPath));
    }
  }

  if (missing.length) {
    console.error(`✗ concat-chunked-renders: ${missing.length} chunk(s) have no rendered video yet:`);
    for (const m of missing) console.error(`    ${m.chunk}: expected ${m.expected}`);
    console.error(`  Render every chunk (lint + check + hyperframes render inside each chunk-NN/ dir) before concatenating.`);
    process.exit(1);
  }

  console.log(`\n— concat-chunked-renders: ${chunkVideoPaths.length} chunk video(s) found, concatenating —`);
  chunkVideoPaths.forEach((p, i) => console.log(`  [${i}] ${p}`));

  // ffmpeg concat demuxer needs a plain text list file, one input per line,
  // each wrapped as `file '<absolute path>'` (absolute paths avoid any
  // relative-path ambiguity from ffmpeg's own working directory).
  const listPath = resolve(chunksDir, "concat-list.txt");
  const listContent = chunkVideoPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n") + "\n";
  writeFileSync(listPath, listContent);

  mkdirSync(dirname(resolve(outPath)), { recursive: true });

  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", resolve(outPath)],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (e) {
    console.error(`✗ concat-chunked-renders: ffmpeg concat failed — ${e.message}`);
    console.error(
      `  If this is a "codec/timebase mismatch" error, the chunks were rendered with different quality/fps ` +
        `settings — re-render every chunk with IDENTICAL hyperframes render flags (same --quality, same --fps) ` +
        `before concatenating; stream-copy concat requires matching parameters across all inputs.`,
    );
    process.exit(1);
  }

  console.log(`\n✓ concat-chunked-renders: wrote ${outPath} (lossless stream-copy concat of ${chunkVideoPaths.length} chunk(s))`);

  const log = new RunLog(flag(argv, "log", ".hyperframes/run-log.md"));
  log.event("Chunked render — concat", `${chunkVideoPaths.length} chunk(s) concatenated losslessly`, {
    chunks: manifest.chunks.map((c) => c.dirName).join(", "),
    output: outPath,
  });
}

main();
