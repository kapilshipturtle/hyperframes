#!/usr/bin/env node
// verify-ci-parity.mjs — a hard, scriptable gate that catches the exact
// failure class that broke a real CI render: a beat that exists in
// STORYBOARD.md / .hyperframes/broll/*.json (built locally, e.g. via a
// direct build-frame.mjs call for a synthetic cold-open/title frame) but was
// never registered in .hyperframes/beats.json. CI's replay-media-choices.mjs
// cross-checks every cached candidate file against beats.json and correctly
// ABORTS THE WHOLE RENDER JOB the moment it finds one orphaned entry — so a
// single un-registered beat (e.g. a hand-built "beat 00" news cold open)
// wastes a full ~7min CI run and blocks the render entirely, discovered only
// after a push, only by reading Actions logs.
//
// This script is the local, pre-push version of that same check, plus two
// more checks covering the other ways a locally-built frame can be invisible
// to CI's replay path — run it BEFORE committing/pushing any Step 5+ change,
// every time, no exceptions for "it's just one extra synthetic frame."
//
// This does NOT decide anything or fix anything — it only reports concrete,
// actionable mismatches. Exit code 1 on any failure.
//
// Usage:
//   node verify-ci-parity.mjs --beats .hyperframes/beats.json \
//     --storyboard STORYBOARD.md --broll-dir .hyperframes/broll \
//     --scene-choices .hyperframes/scene-choices.json [--log <path>]
//
// Checks:
//   1. Every .hyperframes/broll/beat-<id>.json has a matching id in
//      beats.json — this is the exact check replay-media-choices.mjs runs in
//      CI; failing it here means CI will fail identically, just slower and
//      after a push.
//   2. Every "## Frame <id>" heading in STORYBOARD.md has a matching id in
//      beats.json, UNLESS that id is marked invented-scene in
//      scene-choices.json (those never get a broll cache file or a
//      beats.json entry — build-frame.mjs isn't even called for them, see
//      SKILL.md Step 5 — so they're legitimately exempt from check 1, but
//      not from this one, since STORYBOARD.md's frame numbering must still
//      line up with something real for assemble-index.mjs's frame/duration
//      matching to work).
//   3. Every beats.json id has a corresponding "## Frame <id>" heading in
//      STORYBOARD.md (the reverse direction — a beat with no frame at all).

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { logIfRequested } from "./lib/run-log.mjs";

function flag(argv, name, def) {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? def : argv[i + 1];
}

function pad2(id) {
  // beats.json / broll cache / STORYBOARD.md frame ids are all zero-padded
  // strings ("00", "01", ..."93") in every real project seen so far, but
  // don't assume — compare as given, on the raw string id.
  return String(id);
}

async function main() {
  const argv = process.argv.slice(2);
  const beatsPath = flag(argv, "beats", ".hyperframes/beats.json");
  const storyboardPath = flag(argv, "storyboard", "STORYBOARD.md");
  const brollDir = flag(argv, "broll-dir", ".hyperframes/broll");
  const sceneChoicesPath = flag(argv, "scene-choices", ".hyperframes/scene-choices.json");

  if (!existsSync(beatsPath)) {
    console.error(`✗ verify-ci-parity: not found: ${beatsPath}`);
    process.exit(1);
  }
  if (!existsSync(storyboardPath)) {
    console.error(`✗ verify-ci-parity: not found: ${storyboardPath}`);
    process.exit(1);
  }

  const beats = JSON.parse(readFileSync(beatsPath, "utf8")).beats;
  const beatIds = new Set(beats.map((b) => pad2(b.id)));

  const sceneChoices = existsSync(sceneChoicesPath)
    ? JSON.parse(readFileSync(sceneChoicesPath, "utf8"))
    : {};
  const inventedIds = new Set(Object.keys(sceneChoices).map(pad2));

  const storyboard = readFileSync(storyboardPath, "utf8");
  const frameIds = [...storyboard.matchAll(/^##\s+Frame\s+(\S+)/gm)].map((m) => pad2(m[1]));

  const problems = [];

  // Check 1: broll cache files vs beats.json (mirrors replay-media-choices.mjs exactly)
  if (existsSync(brollDir)) {
    const cacheFiles = readdirSync(brollDir).filter((f) => /^beat-.+\.json$/.test(f));
    for (const file of cacheFiles) {
      const id = pad2(file.replace(/^beat-/, "").replace(/\.json$/, ""));
      if (!beatIds.has(id)) {
        problems.push(
          `beat ${id}: has ${brollDir}/${file} but NO matching entry in ${beatsPath} — ` +
          `CI's replay-media-choices.mjs will reject this exact file and abort the whole render job. ` +
          `Fix: add a real entry {"id":"${id}", "durationSeconds":<N>, ...} to beats.json's beats[] array ` +
          `matching this frame's actual duration in STORYBOARD.md.`
        );
      }
    }
  }

  // Check 2: STORYBOARD.md frames vs beats.json (allowing invented-scene exemption)
  for (const id of frameIds) {
    if (!beatIds.has(id) && !inventedIds.has(id)) {
      problems.push(
        `Frame ${id} in ${storyboardPath} has no matching entry in ${beatsPath} and is not marked ` +
        `invented-scene in ${sceneChoicesPath} — assemble-index.mjs's frame/duration matching may break, ` +
        `and if it also has a broll cache file, check 1 above already covers the CI failure mode.`
      );
    }
  }

  // Check 3: beats.json ids with no corresponding frame at all
  const frameIdSet = new Set(frameIds);
  for (const id of beatIds) {
    if (!frameIdSet.has(id)) {
      problems.push(
        `beat ${id} exists in ${beatsPath} but has no "## Frame ${id}" heading in ${storyboardPath} — ` +
        `this beat will be silently missing from the assembled video.`
      );
    }
  }

  const summary = {
    beatsJsonCount: beatIds.size,
    storyboardFrameCount: frameIds.length,
    inventedSceneCount: inventedIds.size,
    problemCount: problems.length,
  };

  if (problems.length > 0) {
    console.error(`✗ verify-ci-parity: ${problems.length} mismatch(es) found — CI will fail on these exact beats:`);
    for (const p of problems) console.error(`  - ${p}`);
  } else {
    console.log(
      `✓ verify-ci-parity: clean — ${summary.beatsJsonCount} beats.json entries, ` +
      `${summary.storyboardFrameCount} STORYBOARD.md frames, ${summary.inventedSceneCount} invented-scene, all consistent.`
    );
  }

  logIfRequested(argv, "verify-ci-parity", summary, { problems });

  process.exit(problems.length > 0 ? 1 : 0);
}

main();
