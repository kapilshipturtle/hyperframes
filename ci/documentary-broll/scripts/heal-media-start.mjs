#!/usr/bin/env node
// heal-media-start.mjs — self-healing patch for a known, recurring bug in the
// SHARED assemble-index.mjs (faceless-explainer/pr-to-video/product-launch-video):
// its per-frame voice <audio> emit never reads audio_meta.json's `mediaStart`
// field, so every beat's <audio> silently plays the shared narration file
// from second 0 instead of seeking to its own real slice — the same few
// seconds of audio repeating on every beat of the finished video.
//
// This has been fixed directly in assemble-index.mjs's source before, but
// that fix does NOT survive `npx hyperframes skills update` (run automatically
// by the /hyperframes router before every workflow) — the registry reinstalls
// a fresh, unpatched copy with no warning, silently reverting local edits.
// documentary-broll depends on assemble-index.mjs (a shared script it does not
// own) for Step 6 assembly, so rather than forking 600+ lines of shared logic
// (and losing every future upstream fix), this script runs immediately AFTER
// assemble-index.mjs and repairs the ONE known gap directly in index.html —
// durable regardless of whether the upstream script itself is currently fixed.
//
// If assemble-index.mjs's own fix is present and working, this script finds
// nothing to patch and is a fast no-op (still worth running every time, since
// there's no cheap way to know in advance which state the shared script is in).
//
// Usage:
//   node heal-media-start.mjs --index ./index.html --audio-meta ./audio_meta.json
//     [--log .hyperframes/run-log.md]

import { readFileSync, writeFileSync } from "node:fs";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

function main() {
  const argv = process.argv.slice(2);
  const indexPath = flag(argv, "index", "./index.html");
  const audioMetaPath = flag(argv, "audio-meta", "./audio_meta.json");

  const html = readFileSync(indexPath, "utf8");
  const meta = JSON.parse(readFileSync(audioMetaPath, "utf8"));
  const voiceByFrame = new Map();
  for (const v of meta.voices ?? []) if (v.frame != null && v.mediaStart != null) voiceByFrame.set(v.frame, v);

  // Match each per-frame voice <audio ... id="el-<frame_id>-voice" ...>...</audio>
  // block. frame_id is typically "<NN>-beat" (documentary-broll's convention) —
  // extract the leading numeric beat number to look up audio_meta.json's `frame` key.
  const AUDIO_BLOCK = /<audio\b[^>]*\bid="el-(\d+)[^"]*-voice"[^>]*>/g;

  let patched = 0;
  let alreadyOk = 0;
  let noMatch = 0;
  const patchedIds = [];

  const newHtml = html.replace(AUDIO_BLOCK, (block, frameNumStr) => {
    const frameNum = Number(frameNumStr);
    if (/\sdata-media-start\s*=/.test(block)) {
      alreadyOk++;
      return block; // already correct — assemble-index.mjs's own fix is present and working
    }
    const v = voiceByFrame.get(frameNum);
    if (!v) {
      noMatch++;
      return block; // no mediaStart on record for this frame — nothing to patch with
    }
    patched++;
    patchedIds.push(String(frameNum));
    // Insert right before the closing `>` of the opening tag, matching the
    // attribute style assemble-index.mjs itself uses.
    return block.replace(/\s*>$/, `\n        data-media-start="${v.mediaStart}">`);
  });

  if (patched > 0) {
    writeFileSync(indexPath, newHtml);
  }

  const summary = `${patched} patched, ${alreadyOk} already correct, ${noMatch} had no mediaStart on record`;
  console.log(`✓ heal-media-start: ${summary} → ${indexPath}`);
  if (patched > 0) {
    console.log(`  patched frame(s): ${patchedIds.join(", ")}`);
    console.log(`  (assemble-index.mjs's own data-media-start emit did not run — likely reverted by a skills update; this patch is a durable workaround, not a substitute for re-fixing the shared script)`);
  }

  logIfRequested(argv, "Step 6 — heal-media-start", summary, {
    "patched frame ids": patchedIds.join(", ") || "none",
    note: patched > 0 ? "assemble-index.mjs's own fix was missing this run — self-heal applied" : "no patch needed",
  });
}

main();
