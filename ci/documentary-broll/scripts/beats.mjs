#!/usr/bin/env node
// beats.mjs — segment a word-timestamp transcript into 3-6s clause-level beats.
// Pure heuristic, zero LLM calls (keeps this stage free and instant). Splits on
// sentence-ending punctuation and clause commas, merging runs that would
// otherwise produce a beat shorter than MIN_BEAT_S.
//
// Usage:
//   node beats.mjs --transcript ./assets/audio/transcript.json --out ./beats.json
//     [--min-duration 3] [--max-duration 6.5]
//
// Input shape: [{ text, start, end }, ...] (hyperframes transcribe output)
// Output shape: { beats: [{ id, text, start, end, durationSeconds, words: [...] }] }

import { writeFileSync, readFileSync } from "node:fs";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

const CLAUSE_END = /[.!?]$/;
const SOFT_BREAK = /[,;:]$/;

function segment(words, { minDuration, maxDuration }) {
  const beats = [];
  let cur = [];

  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((w) => w.text).join(" ");
    beats.push({
      text,
      start: cur[0].start,
      end: cur[cur.length - 1].end,
      words: cur.slice(),
    });
    cur = [];
  };

  for (const w of words) {
    cur.push(w);
    const span = cur[cur.length - 1].end - cur[0].start;
    const atSentenceEnd = CLAUSE_END.test(w.text);
    const atSoftBreak = SOFT_BREAK.test(w.text);

    if (atSentenceEnd && span >= minDuration) {
      flush();
    } else if (span >= maxDuration && (atSoftBreak || atSentenceEnd)) {
      flush();
    } else if (span >= maxDuration * 1.4) {
      // Hard cap even mid-word-run — never let one beat run away past ~1.4x max.
      flush();
    }
  }
  flush();

  // Merge any beat that came out shorter than minDuration into its neighbor
  // (short trailing fragments after the last punctuation, e.g. a dangling "so.").
  const merged = [];
  for (const b of beats) {
    const dur = b.end - b.start;
    if (merged.length && dur < minDuration * 0.6) {
      const prev = merged[merged.length - 1];
      prev.text += " " + b.text;
      prev.end = b.end;
      prev.words.push(...b.words);
    } else {
      merged.push(b);
    }
  }

  return merged.map((b, i) => ({
    id: String(i + 1).padStart(2, "0"),
    text: b.text,
    start: Number(b.start.toFixed(3)),
    end: Number(b.end.toFixed(3)),
    durationSeconds: Number((b.end - b.start).toFixed(3)),
    words: b.words,
  }));
}

async function main() {
  const argv = process.argv.slice(2);
  const transcriptPath = flag(argv, "transcript", null);
  const outPath = flag(argv, "out", null);
  // --profile <name> (references/style-profiles.json) sets the min/max from the
  // MEASURED shot-length distribution of the chosen editing profile (e.g.
  // explainer-fast: 1.6-4.5 s, median target 2-4 s; explainer-list: 3-7 s).
  // Explicit --min-duration/--max-duration still win. No --profile (or
  // documentary) keeps the original 3 / 6.5 defaults exactly.
  const profileName = flag(argv, "profile", null);
  let pMin = null, pMax = null;
  if (profileName && profileName !== "documentary") {
    const { loadProfile } = await import("./lib/style-profile.mjs");
    const prof = loadProfile(profileName);
    pMin = prof.beats.min_s; pMax = prof.beats.max_s;
  }
  const minDuration = Number(flag(argv, "min-duration", pMin != null ? String(pMin) : "3"));
  const maxDuration = Number(flag(argv, "max-duration", pMax != null ? String(pMax) : "6.5"));

  if (!transcriptPath || !outPath) {
    console.error("Usage: beats.mjs --transcript <path> --out <path> [--profile <style profile>] [--min-duration N] [--max-duration N] [--log <path>]");
    process.exit(1);
  }

  const words = JSON.parse(readFileSync(transcriptPath, "utf8"));
  if (!Array.isArray(words) || !words.length) {
    console.error("✗ beats: transcript is empty or not a word array");
    process.exit(1);
  }

  const beats = segment(words, { minDuration, maxDuration });

  // ── SNAP EVERY BOUNDARY TO A WHOLE FRAME (ISS-0050, measured 2026-09-13) ──
  // The engine extracts exactly ceil/round(duration * fps) frames for a clip,
  // but the timeline samples a frame at the END of a fractional duration that
  // the extraction never produced — so the tail of the shot renders BLACK.
  //
  // Measured on a real 321-beat film: 19 black runs totalling 57.4s, several
  // 5-6s long. Every one was a beat whose duration was NOT a whole number of
  // frames, and CI's own extraction checkpoints show the shortfall exactly:
  //     beat 66  needs 5.38s = 161.4 frames -> chunk extracted max 161
  //     beat 138 needs 6.71s = 201.3 frames -> chunk extracted max 201
  //     beat 214 needs 6.48s = 194.4 frames -> chunk extracted max 194
  // The clips on disk had 23 SPARE frames each, so this is not a media-length
  // problem (an earlier fix added a 0.75s tail margin and changed nothing) —
  // the deficit is at the extraction/sampling layer and only a whole-frame
  // duration removes it.
  //
  // Cost: 40ms of drift across a 23-minute film. Narration timing is unaffected
  // because each beat's audio is referenced by mediaStart, not re-cut.
  const FPS = 30;
  {
    const snap = (v) => Math.round(v * FPS) / FPS;
    let t = beats.length ? beats[0].start : 0;
    for (const b of beats) {
      // Work in whole FRAME COUNTS, not seconds: rounding a second-value to 6
      // decimals can land at 117.99999 frames, which floors to 117 and loses
      // the very frame this snap exists to guarantee. Integers cannot drift.
      const frames = Math.max(1, Math.round(b.durationSeconds * FPS));
      const startFrames = Math.round(t * FPS);
      b.start = Number((startFrames / FPS).toFixed(6));
      b.durationSeconds = Number((frames / FPS).toFixed(6));
      b.end = Number(((startFrames + frames) / FPS).toFixed(6));
      b.frames = frames;
      t = (startFrames + frames) / FPS;
    }
  }
  const totalDuration = words[words.length - 1].end;

  writeFileSync(outPath, JSON.stringify({ beats, totalDuration, wordCount: words.length }, null, 2));
  console.log(`✓ beats: ${beats.length} beat(s) from ${words.length} words, ${totalDuration.toFixed(1)}s total → ${outPath}`);

  logIfRequested(argv, "Step 2 — beats.mjs", `Segmented transcript into ${beats.length} beat(s)`, {
    "words in": words.length,
    "total duration": `${totalDuration.toFixed(1)}s`,
    "min/max beat duration": `${minDuration}s / ${maxDuration}s`,
    "style profile": profileName || "none (legacy defaults)",
    "shortest beat": `${Math.min(...beats.map((b) => b.durationSeconds)).toFixed(1)}s`,
    "longest beat": `${Math.max(...beats.map((b) => b.durationSeconds)).toFixed(1)}s`,
  });
}

await main();
