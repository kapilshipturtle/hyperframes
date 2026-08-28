#!/usr/bin/env node
// run-log.mjs — shared append-only Markdown event logger for the
// documentary-broll pipeline. One log file per project run, so a completed
// (or failed) run can be handed back and analyzed beat-by-beat, step-by-step,
// without re-running anything.
//
// Design constraints:
//   - Append-only, one call = one small Markdown block. No read-modify-write
//     of the whole file, so N scripts writing across a long run stays O(N)
//     cheap, not O(N^2).
//   - Compact by construction: every logger truncates/summarizes large
//     payloads (e.g. only a candidate's score/source/id, never a full raw API
//     response) so the file stays readable and small even on a 100+ beat run.
//   - Plain Markdown, not JSON/NDJSON — this file is meant to be READ (by a
//     human or by Claude re-analyzing a run), not machine-parsed. Headings
//     make it trivially greppable/skimmable by beat id or step name.
//   - Every event is timestamped with a caller-supplied ISO string (never
//     `Date.now()`/`new Date()` internally — some callers run inside
//     HyperFrames workflow scripts where those throw; accepting a timestamp
//     as a parameter keeps this module usable everywhere).
//
// Usage (from any script):
//   import { RunLog } from "./lib/run-log.mjs";
//   const log = new RunLog(flag(argv, "log", ".hyperframes/run-log.md"));
//   log.step("Step 3 — fetch-clips", `beat 05: query "senior couple reviewing paperwork"`, {
//     "candidates found": 14,
//     "chosen": "pexels/pexels-v10423 (video, 1920x1080, 8.2s)",
//     "anomalies": "none",
//   });
//   log.error("Step 3 — fetch-clips", "beat 07: no usable candidate", { query: "..." });
//
// The log file is created (with a run header) on first write if it doesn't
// exist yet; every subsequent write for the same run just appends.

import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

function fmtDetails(details) {
  if (!details || typeof details !== "object") return "";
  const lines = Object.entries(details)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `  - **${k}:** ${summarize(v)}`);
  return lines.length ? lines.join("\n") + "\n" : "";
}

// Keeps any single detail value short — a raw candidate array, full JSON
// payload, or long string would blow up file size across a 100+ beat run.
// Callers should already be passing summaries, not raw objects, but this is
// a hard backstop so one careless call site can't balloon the log.
function summarize(v) {
  let s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length > 300) s = s.slice(0, 300) + "…(truncated)";
  return s;
}

export class RunLog {
  constructor(path = ".hyperframes/run-log.md", { timestamp } = {}) {
    this.path = resolve(path);
    mkdirSync(dirname(this.path), { recursive: true });
    if (!existsSync(this.path)) {
      writeFileSync(
        this.path,
        `# documentary-broll run log\n\nStarted: ${timestamp ?? "(unknown)"}\n\n` +
          `Every pipeline event (script output + editorial decisions) is appended here as it happens. ` +
          `Read top-to-bottom for the full run, or search for a beat id (e.g. \`beat 05\`) or a step ` +
          `heading (e.g. \`## Step 5\`) to jump to one part.\n\n---\n`,
      );
    }
  }

  _write(block) {
    appendFileSync(this.path, block);
  }

  // A normal, successful event within a step — e.g. one beat's fetch result,
  // one beat's overlay decision, a script's own summary line.
  event(step, summary, details) {
    this._write(`\n### ${step}\n${summary}\n${fmtDetails(details)}`);
  }

  // A real problem — script exited non-zero, a gate failed, a check flagged
  // something. Rendered distinctly (⚠) so scanning the file for issues is a
  // single visual grep, not a full read.
  error(step, summary, details) {
    this._write(`\n### ⚠ ${step}\n${summary}\n${fmtDetails(details)}`);
  }

  // A section break for a new pipeline step — keeps the file skimmable by
  // heading (## Step 3 — Fetch candidates) rather than a flat event list.
  section(title) {
    this._write(`\n---\n\n## ${title}\n`);
  }
}

// CLI helper so a script can add logging with one extra flag instead of a
// full import + wire-up when it only needs a single summary line — e.g.:
//   node some-script.mjs ... --log .hyperframes/run-log.md
// Scripts that log multiple events per run (fetch-clips, build-frame, the
// orchestrator's own editorial passes) should use the RunLog class directly
// instead, for step/section grouping.
export function logIfRequested(argv, step, summary, details, { timestamp } = {}) {
  const i = argv.indexOf("--log");
  const path = i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
  if (!path) return;
  new RunLog(path, { timestamp }).event(step, summary, details);
}
