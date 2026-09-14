// Turn a filled vision review into the Brain's repair input.
//   tsx scripts/ts/qc_apply.ts --job <id> [--review work/<id>/qc/review.json]
// Reads {reviews:[{beatId, issue, action}]} (or a bare array), validates the enums and beat ids,
// writes work/<id>/qc-actions.json = {jobId, actions:[{beatId, issue, action}]} with only the non-ok entries.
import { join } from "node:path";
import { CliError, flagString, main, parseArgs, readJson, requireJob, writeJson } from "./lib/common.js";
import { QC_ACTIONS, QC_ISSUES } from "./lib/qc.js";
import type { Timeline } from "./types.js";

interface Review { beatId: string; issue: string; action: string; note?: string }

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  const reviewPath = flagString(args, "review") ?? join(jobDir, "qc", "review.json");
  const raw = readJson<{ reviews?: Review[] } | Review[]>(reviewPath, "review JSON");
  const reviews = Array.isArray(raw) ? raw : raw.reviews;
  if (!Array.isArray(reviews)) throw new CliError(`${reviewPath}: expected {reviews:[...]} or an array`);
  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const known = new Set(timeline.tracks.broll.map((b) => b.beatId));
  const errs: string[] = [];
  reviews.forEach((r, i) => {
    if (!known.has(r.beatId)) errs.push(`reviews[${i}]: unknown beatId "${r.beatId}"`);
    if (!(QC_ISSUES as readonly string[]).includes(r.issue)) errs.push(`reviews[${i}] (${r.beatId}): issue "${r.issue}" not in ${QC_ISSUES.join("|")}`);
    if (!(QC_ACTIONS as readonly string[]).includes(r.action)) errs.push(`reviews[${i}] (${r.beatId}): action "${r.action}" not in ${QC_ACTIONS.join("|")}`);
    if (r.action === "ok" && r.issue !== "none") errs.push(`reviews[${i}] (${r.beatId}): issue "${r.issue}" with action ok; pick an action or set issue none`);
  });
  if (errs.length) throw new CliError(`review invalid:\n  ${errs.join("\n  ")}`);
  const actions = reviews.filter((r) => r.action !== "ok").map(({ beatId, issue, action, note }) => ({ beatId, issue, action, ...(note ? { note } : {}) }));
  const dest = join(jobDir, "qc-actions.json");
  writeJson(dest, { jobId, source: reviewPath, actions });
  console.log(`[qc_apply ${jobId}] ${actions.length} repair action(s) from ${reviews.length} review(s) -> ${dest}`);
  if (!actions.length) console.log("  nothing to repair; the Brain's --repair is a no-op");
});
