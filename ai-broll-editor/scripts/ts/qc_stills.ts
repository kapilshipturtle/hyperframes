// Spec 15 items 1-2: QC stills + contact sheets + index for the vision review.
//   tsx scripts/ts/qc_stills.ts --job <id>
// broll item -> 2 stills (from+8, midpoint); text item -> 1 still (from+10); 640 px wide, from final.mp4
// or, when final.mp4 is absent, from the segment file that owns the frame. Writes qc/<sec>/*.jpg,
// qc/<sec>.sheet.jpg, qc/index.json and qc/review-template.json (spec 15.3 shape).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError, main, parseArgs, readJson, requireJob, run, whichOrDie, writeJson } from "./lib/common.js";
import type { Beats, Chunk, Timeline } from "./types.js";

import { QC_ACTIONS, QC_ISSUES } from "./lib/qc.js";

export interface StillSpec { file: string; frame: number; kind: "broll" | "text"; itemId: string; beatId: string; sectionId: string; text?: string; beatText?: string; layout?: string }

export function planStills(t: Timeline, beatText: Map<string, string>, beatSection: Map<string, string>): StillSpec[] {
  const out: StillSpec[] = [];
  const last = t.durationInFrames - 1;
  for (const b of t.tracks.broll) {
    const end = b.from + b.durationInFrames - 1;
    const a = Math.min(end, b.from + 8), m = Math.min(end, b.from + Math.floor(b.durationInFrames / 2));
    const sec = b.sectionId || beatSection.get(b.beatId) || "sec_00";
    out.push({ file: `${sec}/${b.id}_a.jpg`, frame: Math.min(last, a), kind: "broll", itemId: b.id, beatId: b.beatId, sectionId: sec, beatText: beatText.get(b.beatId), layout: b.layout });
    if (m !== a) out.push({ file: `${sec}/${b.id}_m.jpg`, frame: Math.min(last, m), kind: "broll", itemId: b.id, beatId: b.beatId, sectionId: sec, beatText: beatText.get(b.beatId), layout: b.layout });
  }
  for (const x of t.tracks.text) {
    const end = x.from + x.durationInFrames - 1;
    const sec = beatSection.get(x.beatId) || t.tracks.broll.find((b) => b.beatId === x.beatId)?.sectionId || "sec_00";
    out.push({ file: `${sec}/${x.id}_t.jpg`, frame: Math.min(last, end, x.from + 10), kind: "text", itemId: x.id, beatId: x.beatId, sectionId: sec, text: x.content, beatText: beatText.get(x.beatId) });
  }
  return out;
}

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  whichOrDie("ffmpeg");
  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const beatsPath = join(jobDir, "beats.json");
  const beats = existsSync(beatsPath) ? readJson<Beats>(beatsPath) : null;
  const beatText = new Map((beats?.beats ?? []).map((b) => [b.id, b.text]));
  const beatSection = new Map((beats?.beats ?? []).map((b) => [b.id, b.sectionId]));

  const final = join(jobDir, "final.mp4");
  let source: (frame: number) => { file: string; localFrame: number };
  if (existsSync(final)) source = (f) => ({ file: final, localFrame: f });
  else {
    const chunks = readJson<Chunk[]>(join(jobDir, "chunks.json"), "chunks.json (needed when final.mp4 is absent)");
    source = (f) => {
      const c = chunks.find((x) => f >= x.fromFrame && f <= x.toFrame);
      if (!c) throw new CliError(`frame ${f} is in no chunk`);
      const file = join(jobDir, "segments", `${c.id}.mp4`);
      if (!existsSync(file)) throw new CliError(`segment for frame ${f} not rendered: ${file}`);
      return { file, localFrame: f - c.fromFrame };
    };
    console.log(`[qc_stills ${jobId}] final.mp4 absent; extracting from per-segment files`);
  }

  const stills = planStills(timeline, beatText, beatSection);
  const qcDir = join(jobDir, "qc");
  const bySection = new Map<string, StillSpec[]>();
  for (const s of stills) { mkdirSync(join(qcDir, s.sectionId), { recursive: true }); (bySection.get(s.sectionId) ?? bySection.set(s.sectionId, []).get(s.sectionId)!).push(s); }
  console.log(`[qc_stills ${jobId}] ${stills.length} stills across ${bySection.size} section(s)`);
  for (const s of stills) {
    const { file, localFrame } = source(s.frame);
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-ss", (localFrame / 30).toFixed(4), "-i", file, "-frames:v", "1", "-vf", "scale=640:-2", "-q:v", "3", join(qcDir, s.file)]);
  }
  for (const [sec, list] of bySection) {
    const listFile = join(qcDir, `${sec}.list.txt`);
    writeFileSync(listFile, list.map((s) => `file '${join(qcDir, s.file)}'\nduration 1`).join("\n") + "\n");
    const cols = 6, rows = Math.max(1, Math.ceil(list.length / cols));
    run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-vf", `scale=640:360,tile=${cols}x${rows}`, "-frames:v", "1", "-q:v", "4", join(qcDir, `${sec}.sheet.jpg`)]);
  }
  writeJson(join(qcDir, "index.json"), { jobId, source: existsSync(final) ? "final.mp4" : "segments", sheets: [...bySection.keys()].map((s) => `${s}.sheet.jpg`), stills });

  const beatIds = [...new Set(timeline.tracks.broll.map((b) => b.beatId))];
  writeJson(join(qcDir, "review-template.json"), {
    $doc: "Spec 15.3 vision review. One entry per beat. issue: none|off-topic|watermark|text-cut|unreadable|black|duplicate|letterbox|credit-missing. action: ok|swap-alternate|move-text|drop-text|change-layout. Fill it in, save as qc/review.json, then run qc_apply.ts --job <id> to produce qc-actions.json for the Brain's --repair.",
    allowed: { issue: QC_ISSUES, action: QC_ACTIONS },
    reviews: beatIds.map((beatId) => ({ beatId, issue: "none", action: "ok" })),
  });
  console.log(`[qc_stills ${jobId}] wrote qc/index.json, qc/review-template.json, ${bySection.size} contact sheet(s)`);
});
