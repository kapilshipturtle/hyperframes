#!/usr/bin/env node
// split-for-chunked-render.mjs — splits an already-assembled documentary-broll
// project into N standalone sub-projects at existing hard-cut boundaries, so
// each chunk can render independently (each with far fewer distinct video
// sources than the whole film) and the resulting MP4s can be concatenated
// losslessly afterward with zero quality loss and an invisible seam.
//
// WHY THIS EXISTS: a confirmed, source-verified bug in the `hyperframes` CLI
// itself (not this skill, not the render.yml workflow) — video_extract fires
// one ffmpeg subprocess PER UNIQUE VIDEO SOURCE, all simultaneously, with no
// concurrency limit anywhere in that code path (grepped and read directly in
// node_modules/hyperframes/dist/cli.js's extractAllVideoFrames: a bare
// Promise.all over every cache-miss source, no semaphore/batching/queue).
// A film with ~167 distinct video sources (a real 145-beat/13-min project)
// launches 167 concurrent ffmpeg processes in one uncapped burst, which
// exhausts the GitHub Actions runner and kills the whole job with a bare
// "shutdown signal" / exit 143 — no disk error, no OOM text, nothing that
// names the real cause. --workers and --low-memory-mode do NOT help (both
// confirmed, via source, to only affect the LATER capture/encode stage,
// which video_extract runs before). There is no existing CLI flag or env var
// that throttles video_extract's concurrency.
//
// THE FIX: since the tool can't be told to extract fewer sources at once,
// give it fewer sources per render by physically splitting the composition
// into smaller pieces. Each chunk is bounded to end well under the failure
// threshold (targets ~40 distinct sources per chunk against the ~167 that
// broke a real run — a large safety margin, not a tight fit).
//
// ZERO QUALITY LOSS: split boundaries are chosen ONLY at existing hard-cut
// transitions (0s duration, an instant frame change already in the plan) —
// never mid-crossfade, never mid-clip. Concatenating two hard-cut-adjacent
// segments produces a bit-identical result to what one uninterrupted render
// would have produced at that exact frame, because a hard cut has no blended
// pixels to reproduce across the seam. Audio is handled the same non-
// destructive way slice-narration.mjs already uses elsewhere in this skill —
// every chunk's audio_meta.json still points at the SAME original narration
// file with the SAME real mediaStart offsets, just re-indexed to that
// chunk's own frame numbers. No audio is ever re-encoded until the final
// concat, and ffmpeg's concat demuxer (used below) is itself stream-copy —
// no re-encode of the chunk MP4s at all, so the final file is exactly as
// lossless as N independent full-quality renders stitched together.
//
// Usage:
//   node split-for-chunked-render.mjs --project . --max-sources-per-chunk 40 \
//     --out-dir .hyperframes/chunks [--log .hyperframes/run-log.md]
//
// Writes one subdirectory per chunk under --out-dir, each containing:
//   STORYBOARD.md       (re-indexed frame numbers, this chunk's beats only)
//   audio_meta.json      (re-indexed frame numbers, same narration file + offsets)
//   compositions/frames/*.html  (copied unchanged from the parent project)
//   manifest.json         (chunk metadata: beat range, source count, order)
//
// Does NOT touch the parent project's own STORYBOARD.md/index.html/
// audio_meta.json in any way — this is a read-only split into new files.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, cpSync } from "node:fs";
import { join } from "node:path";
import { RunLog } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

function parseStoryboard(md) {
  // Split on "## Frame " headers, keep each frame's raw block for verbatim
  // re-emission (never reformat/re-derive fields — copy them exactly).
  const blocks = md.split(/^## Frame /m).slice(1);
  return blocks.map((block) => {
    const idMatch = block.match(/^(\d+)/);
    const durMatch = block.match(/duration: ([\d.]+)s/);
    const transMatch = block.match(/transition_in: (.+)/);
    const srcMatch = block.match(/src: (\S+)/);
    return {
      id: idMatch[1],
      durationSeconds: parseFloat(durMatch[1]),
      transitionIn: transMatch ? transMatch[1].trim() : "cut",
      src: srcMatch[1],
      rawBlock: block,
    };
  });
}

function countSources(projectDir, beatId) {
  let n = 0;
  for (const ext of [".mp4", ".jpg"]) {
    if (existsSync(join(projectDir, ".media/broll", `beat-${beatId}${ext}`))) {
      n++;
      break;
    }
  }
  if (existsSync(join(projectDir, ".media/broll", `beat-${beatId}-cutaway.mp4`))) n++;
  return n;
}

function isHardCut(transitionIn) {
  return /^(cut|hard-cut)/.test(transitionIn.trim());
}

function main() {
  const argv = process.argv.slice(2);
  const projectDir = flag(argv, "project", ".");
  const maxSources = Number(flag(argv, "max-sources-per-chunk", "40"));
  const outDir = flag(argv, "out-dir", ".hyperframes/chunks");

  const storyboardPath = join(projectDir, "STORYBOARD.md");
  const audioMetaPath = join(projectDir, "audio_meta.json");
  const beatsPath = join(projectDir, ".hyperframes/beats.json");
  if (!existsSync(storyboardPath)) {
    console.error(`✗ split-for-chunked-render: STORYBOARD.md not found at ${storyboardPath}`);
    process.exit(1);
  }
  if (!existsSync(audioMetaPath)) {
    console.error(`✗ split-for-chunked-render: audio_meta.json not found at ${audioMetaPath}`);
    process.exit(1);
  }
  if (!existsSync(beatsPath)) {
    console.error(`✗ split-for-chunked-render: .hyperframes/beats.json not found at ${beatsPath} — needed so each chunk's own copy can be filtered to just that chunk's beats (replay-media-choices.mjs requires it in CI).`);
    process.exit(1);
  }

  const frames = parseStoryboard(readFileSync(storyboardPath, "utf8"));
  const audioMeta = JSON.parse(readFileSync(audioMetaPath, "utf8"));
  const voiceByFrame = new Map(audioMeta.voices.map((v) => [v.frame, v]));
  const allBeats = JSON.parse(readFileSync(beatsPath, "utf8")).beats;
  const beatById = new Map(allBeats.map((b) => [b.id, b]));

  // ---- find candidate split points: only at hard-cut boundaries ----
  // frames[i].transitionIn describes the transition INTO frame i (from i-1),
  // so a hard cut at index i means "frames[i-1] and frames[i] can be split
  // here with zero visual/audio continuity to preserve across the seam."
  const hardCutIndices = [];
  for (let i = 1; i < frames.length; i++) {
    if (isHardCut(frames[i].transitionIn)) hardCutIndices.push(i);
  }
  if (hardCutIndices.length === 0) {
    console.error(
      `✗ split-for-chunked-render: no hard-cut boundaries found anywhere in this film — ` +
        `cannot split without cutting through a live transition (crossfade/slide/etc), which ` +
        `would visibly break the seam. This tool refuses to do that; fix the underlying render ` +
        `concurrency limit instead, or accept a single full-length render.`,
    );
    process.exit(1);
  }

  // ---- greedily grow chunks up to maxSources, snapping each boundary to
  // the nearest hard cut so no chunk ever ends mid-transition ----
  const chunkBoundaries = []; // frame indices where a new chunk starts (always includes 0)
  let chunkStart = 0;
  let chunkSources = 0;
  for (let i = 0; i < frames.length; i++) {
    const n = countSources(projectDir, frames[i].id);
    if (chunkSources + n > maxSources && i > chunkStart && isHardCut(frames[i].transitionIn)) {
      chunkBoundaries.push(i);
      chunkStart = i;
      chunkSources = 0;
    }
    chunkSources += n;
  }
  // If we overshot maxSources but never hit a hard cut in time, keep growing
  // until the next available hard cut rather than splitting mid-transition —
  // correctness (no visible seam) always wins over hitting the exact target.
  const boundarySet = new Set(chunkBoundaries);
  const finalBoundaries = [0];
  let cursor = 0;
  let cursorSources = 0;
  for (let i = 0; i < frames.length; i++) {
    cursorSources += countSources(projectDir, frames[i].id);
    if (boundarySet.has(i)) {
      finalBoundaries.push(i);
      cursorSources = 0;
    }
  }
  finalBoundaries.push(frames.length);
  const uniqueBoundaries = [...new Set(finalBoundaries)].sort((a, b) => a - b);

  const chunks = [];
  for (let c = 0; c < uniqueBoundaries.length - 1; c++) {
    const start = uniqueBoundaries[c];
    const end = uniqueBoundaries[c + 1] - 1;
    chunks.push({ index: c, startIdx: start, endIdx: end, frames: frames.slice(start, end + 1) });
  }

  console.log(`\n— split-for-chunked-render: ${chunks.length} chunk(s) —`);

  mkdirSync(join(projectDir, outDir), { recursive: true });

  const log = new RunLog(flag(argv, "log", ".hyperframes/run-log.md"));

  const manifest = { totalChunks: chunks.length, chunks: [] };

  for (const chunk of chunks) {
    const chunkDirName = `chunk-${String(chunk.index).padStart(2, "0")}`;
    const chunkDir = join(projectDir, outDir, chunkDirName);
    mkdirSync(join(chunkDir, "compositions/frames"), { recursive: true });
    mkdirSync(join(chunkDir, "assets/audio"), { recursive: true });

    let sourceCount = 0;
    let totalDuration = 0;
    const chunkFrames = chunk.frames.map((f, localIdx) => {
      sourceCount += countSources(projectDir, f.id);
      totalDuration += f.durationSeconds;
      return { ...f, localFrameNum: localIdx + 1 };
    });

    // ---- re-emit STORYBOARD.md with re-indexed frame numbers ----
    // First frame in every chunk gets transition_in: cut (no predecessor to
    // transition from within this standalone sub-project) — every other
    // frame keeps its EXACT original transition_in verbatim, since none of
    // the interior transitions were touched, only the outer boundary was
    // chosen to fall on an already-hard-cut seam.
    let md = `# STORYBOARD — ${chunkDirName} (chunk ${chunk.index + 1}/${chunks.length} of a larger film, split for CI render-concurrency limits — see split-for-chunked-render.mjs header)\n\n`;
    md += `${chunkFrames.length} beats. Original beat range: ${chunk.frames[0].id}-${chunk.frames[chunk.frames.length - 1].id}. Narration slice: same original file, different offsets.\n\n`;
    chunkFrames.forEach((f, i) => {
      const num = String(f.localFrameNum).padStart(2, "0");
      let block = f.rawBlock;
      // Replace the transition_in line only for the chunk's own first frame.
      if (i === 0) {
        block = block.replace(/transition_in: .+/, "transition_in: cut");
      }
      // Re-point src to the local frame number path (files themselves are
      // copied verbatim below, just renamed to match the new numbering).
      block = block.replace(/src: \S+/, `src: compositions/frames/${num}-beat.html`);
      // Fix the frame header's own number too.
      block = block.replace(/^\d+/, num);
      md += `## Frame ${block}`;
    });
    writeFileSync(join(chunkDir, "STORYBOARD.md"), md);

    // ---- copy frame HTML files, renumbered ----
    // The file's OWN internal ids (data-composition-id="<id>-beat",
    // window.__timelines["<id>-beat"], any element id="f-<id>-beat-*") must
    // be rewritten to match the new local frame number too — assemble-
    // index.mjs requires data-composition-id to match the mounting host's
    // expected id (derived from the renamed filename), and a stale internal
    // id fails that check outright (confirmed: caught by a real test run
    // against this exact script before it shipped). Asset PATHS referenced
    // inside the frame (e.g. .media/broll/beat-32.mp4) are NOT touched here
    // — those correctly keep the ORIGINAL beat id, since the media files
    // themselves are copied under their original names below, not renamed.
    chunkFrames.forEach((f) => {
      const srcPath = join(projectDir, "compositions/frames", `${f.id}-beat.html`);
      const num = String(f.localFrameNum).padStart(2, "0");
      const destPath = join(chunkDir, "compositions/frames", `${num}-beat.html`);
      if (!existsSync(srcPath)) {
        console.warn(`⚠ split-for-chunked-render: expected frame file missing: ${srcPath}`);
        return;
      }
      let html = readFileSync(srcPath, "utf8");
      // Rewrite only ID-shaped occurrences of "<originalId>-beat" (composition
      // id, timeline key, element-id prefixes like f-<id>-beat-*) — NOT bare
      // "beat-<id>" asset-path references, which have the hyphen in the
      // opposite order and are excluded by requiring "-beat" as the suffix.
      const idPattern = new RegExp(`(["'\`]|f-)${f.id}-beat\\b`, "g");
      html = html.replace(idPattern, (match, prefix) => `${prefix}${num}-beat`);
      writeFileSync(destPath, html);
    });

    // ---- build this chunk's own audio_meta.json, re-indexed, SAME narration
    // file + SAME real offsets (no re-encode, no physical audio cut) ----
    const chunkVoices = chunkFrames
      .map((f) => {
        const orig = voiceByFrame.get(Number(f.id));
        if (!orig) return null;
        return { ...orig, frame: f.localFrameNum };
      })
      .filter(Boolean);
    writeFileSync(
      join(chunkDir, "audio_meta.json"),
      JSON.stringify({ bgm: audioMeta.bgm ?? null, voices: chunkVoices, sfx: [] }, null, 2),
    );

    // ---- copy each beat's broll CACHE MANIFEST (.hyperframes/broll/*.json),
    // NOT the downloaded media files themselves ----
    // This matches the exact same "commit the decision, rebuild the asset"
    // pattern render.yml already uses for the whole project (see SKILL.md's
    // "Rendering in the cloud, free" section): .media/broll/ is gitignored
    // and unbounded in size, but .hyperframes/broll/beat-<id>.json is small
    // and IS committed, letting replay-media-choices.mjs deterministically
    // rebuild the real media files in CI from each cached `chosen` field.
    // For a chunked render this matters even more — committing full-size
    // .media/broll copies PER CHUNK would duplicate the same footage across
    // every chunk's own copy for beats referenced more than once, and bloat
    // the repo by however many chunks exist. Local manual renders of a
    // chunk (not via render-chunked.yml) need to run replay-media-choices.mjs
    // themselves first — same as any fresh CI checkout would.
    mkdirSync(join(chunkDir, ".hyperframes/broll"), { recursive: true });
    chunkFrames.forEach((f) => {
      for (const suffix of ["", "-cutaway"]) {
        const p = join(projectDir, ".hyperframes/broll", `beat-${f.id}${suffix}.json`);
        if (existsSync(p)) copyFileSync(p, join(chunkDir, ".hyperframes/broll", `beat-${f.id}${suffix}.json`));
      }
    });

    // ---- write a chunk-local .hyperframes/beats.json, filtered to just this
    // chunk's ORIGINAL beat ids (not renumbered) — replay-media-choices.mjs
    // requires beats.json to resolve each cached candidate file's own
    // beat id to a durationSeconds, and cache files keep their original ids
    // (see the .hyperframes/broll copy above) ----
    const chunkBeats = chunkFrames.map((f) => beatById.get(f.id)).filter(Boolean);
    writeFileSync(join(chunkDir, ".hyperframes/beats.json"), JSON.stringify({ beats: chunkBeats }, null, 2));
    // media-choices.json (the ~10-20% override annotations) is copied whole
    // (not filtered per-chunk) — replay-media-choices.mjs only reads the
    // cached beat-<id>.json's own `chosen` field per its own header comment,
    // so an unfiltered copy here is harmless, just slightly redundant.
    const mediaChoicesPath = join(projectDir, ".hyperframes/media-choices.json");
    if (existsSync(mediaChoicesPath)) {
      copyFileSync(mediaChoicesPath, join(chunkDir, ".hyperframes/media-choices.json"));
    }

    // ---- copy the original narration audio file verbatim (untouched,
    // no re-encode) — every chunk needs the WHOLE file since offsets are
    // absolute positions into it, not chunk-relative ----
    const narrationSrc = join(projectDir, "assets/audio", "narration.mp3");
    if (existsSync(narrationSrc)) {
      copyFileSync(narrationSrc, join(chunkDir, "assets/audio/narration.mp3"));
    } else {
      console.warn(`⚠ split-for-chunked-render: narration.mp3 not found at ${narrationSrc} — check the actual extension used in this project.`);
    }

    // ---- copy project scaffolding files needed to run assemble/check/render
    // in this standalone sub-project (hyperframes.json, package.json, meta.json) ----
    for (const f of ["hyperframes.json", "package.json", "meta.json"]) {
      const p = join(projectDir, f);
      if (existsSync(p)) copyFileSync(p, join(chunkDir, f));
    }

    const chunkManifest = {
      index: chunk.index,
      dirName: chunkDirName,
      originalBeatRange: [chunk.frames[0].id, chunk.frames[chunk.frames.length - 1].id],
      frameCount: chunkFrames.length,
      sourceCount,
      totalDurationSeconds: Number(totalDuration.toFixed(3)),
    };
    manifest.chunks.push(chunkManifest);
    writeFileSync(join(chunkDir, "manifest.json"), JSON.stringify(chunkManifest, null, 2));

    console.log(
      `  chunk ${chunk.index}: beats ${chunkManifest.originalBeatRange[0]}-${chunkManifest.originalBeatRange[1]} ` +
        `(${chunkManifest.frameCount} frames, ~${chunkManifest.sourceCount} sources, ${chunkManifest.totalDurationSeconds.toFixed(1)}s) → ${chunkDir}`,
    );
  }

  writeFileSync(join(projectDir, outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  log.event("Chunked render — split", `${chunks.length} chunk(s) created`, {
    chunks: manifest.chunks.map((c) => `${c.dirName}: beats ${c.originalBeatRange.join("-")}, ~${c.sourceCount} sources`).join(" | "),
  });

  console.log(`\n✓ split-for-chunked-render: ${chunks.length} chunk(s) written under ${join(projectDir, outDir)}`);
  console.log(`  Next: render each chunk independently (own lint/check/render or its own CI job), then concatenate with concat-chunked-renders.mjs.`);
}

main();
