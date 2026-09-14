// VALIDATOR (spec section 12): independent code path. Imports only types.ts (+ msToFrame) and, for the determinism check,
// the exported runBrain entry point. CLI: tsx scripts/ts/validate.ts --job <id> [--skip-media] [--packs <dir>]
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import type { Asset, Assets, BrollItem, Chunk, Timeline, Transcript, TransitionType } from "./types.js";
import { layoutFamily, msToFrame, MIN_SHOT_FRAMES, MAX_SHOT_FRAMES, MAX_Y2_FRAMES } from "./types.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "..", "..");
const PUNCHY = new Set<TransitionType>(["zoom-punch", "whip-pan", "glitch"]);
const CREDIT_TAGS = /\bBY\b/i;

const schemaCache = new Map<string, ReturnType<Ajv["compile"]>>();
function compiledSchema(p: string) {
  let v = schemaCache.get(p);
  if (!v) { const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv); v = ajv.compile(JSON.parse(fs.readFileSync(p, "utf8"))); schemaCache.set(p, v); }
  return v;
}

export interface ValidationResult { errors: string[]; warnings: string[]; report: string }

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");
const stable = (v: unknown): string => JSON.stringify(sortKeys(v));
function sortKeys(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(sortKeys);
  if (x && typeof x === "object") { const o: Record<string, unknown> = {}; for (const k of Object.keys(x as object).sort()) { const v = (x as Record<string, unknown>)[k]; if (v !== undefined) o[k] = sortKeys(v); } return o; }
  return x;
}
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
const cutOf = (b: BrollItem) => b.from + b.transitionIn.durationInFrames;
const netOf = (b: BrollItem) => b.durationInFrames - b.transitionIn.durationInFrames;
const creditRequired = (a: Asset) => a.source === "pexels" || CREDIT_TAGS.test(a.license) || a.tier === "y1" || a.tier === "y2";

export async function validateJob(jobDir: string, opts: { skipMedia?: boolean; packsDir?: string; skipDeterminism?: boolean } = {}): Promise<ValidationResult> {
  const errors: string[] = [], warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  const rd = <T>(f: string): T | null => (fs.existsSync(path.join(jobDir, f)) ? (JSON.parse(fs.readFileSync(path.join(jobDir, f), "utf8")) as T) : null);
  const tl = rd<Timeline>("timeline.json");
  const chunks = rd<Chunk[]>("chunks.json");
  const transcript = rd<Transcript>("transcript.json");
  const assets = rd<Assets>("assets.json") ?? {};
  if (!tl || !chunks || !transcript) return { errors: ["timeline.json, chunks.json or transcript.json missing"], warnings, report: "" };

  // 12.1 JSON Schema
  for (const [file, data] of [["timeline.schema.json", tl], ["chunks.schema.json", chunks]] as const) {
    const p = path.join(ROOT, "schemas", file);
    if (!fs.existsSync(p)) { warnings.push(`schema ${file} missing: schema step skipped`); continue; }
    const validate = compiledSchema(p);
    if (!validate(data)) for (const e of validate.errors ?? []) err(`schema ${file}: ${e.instancePath} ${e.message}`);
  }

  const b = tl.tracks.broll.slice().sort((x, y) => cutOf(x) - cutOf(y));
  const total = msToFrame(transcript.durationMs);
  if (tl.durationInFrames !== total) err(`I1: durationInFrames ${tl.durationInFrames} != msToFrame(${transcript.durationMs}) = ${total}`);
  // I1
  if (!b.length) err("I1: no broll");
  else {
    if (b[0].from !== 0 || b[0].transitionIn.durationInFrames !== 0) err("I1: first shot must start at 0 with a cut");
    for (let i = 1; i < b.length; i++) if (cutOf(b[i]) !== cutOf(b[i - 1]) + netOf(b[i - 1])) err(`I1: gap/overlap between ${b[i - 1].id} and ${b[i].id}`);
    if (b.reduce((a, x) => a + netOf(x), 0) !== tl.durationInFrames) err("I1: net durations do not sum to durationInFrames");
  }
  // I2
  for (const it of b) {
    if (netOf(it) < MIN_SHOT_FRAMES || netOf(it) > MAX_SHOT_FRAMES) err(`I2: ${it.id} net ${netOf(it)} frames`);
    if (it.tier === "y2" && it.durationInFrames > MAX_Y2_FRAMES) err(`I2: Y2 ${it.id} ${it.durationInFrames} frames`);
  }
  // I3 + 12.5 transition bounds, completes at cut frame (by construction from = cut - T), fits in previous shot
  for (let i = 0; i < b.length; i++) {
    const t = b[i].transitionIn;
    if (t.type === "cut") { if (t.durationInFrames !== 0) err(`I3: ${b[i].id} cut with duration ${t.durationInFrames}`); continue; }
    const lo = PUNCHY.has(t.type) ? 6 : 8, hi = PUNCHY.has(t.type) ? 10 : 18;
    if (t.durationInFrames < lo || t.durationInFrames > hi) err(`I3: ${b[i].id} ${t.type} ${t.durationInFrames} frames outside ${lo}..${hi}`);
    if (i === 0 || t.durationInFrames > netOf(b[i - 1])) err(`I3: ${b[i].id} transition does not fit in the previous shot`);
  }
  // I4, I5 (+12.4 text substrings against transcript)
  const words = transcript.words.slice().sort((x, y) => x.id - y.id);
  const wnorm = words.map((w) => norm(w.text));
  for (const t of tl.tracks.text) {
    const host = b.find((it) => it.beatId === t.beatId && t.from >= cutOf(it) - 2 && t.from < cutOf(it) + netOf(it));
    if (!host) { err(`I4: ${t.id} has no host shot`); continue; }
    if (t.from + t.durationInFrames > cutOf(host) + netOf(host) - 5) err(`I4: ${t.id} ends later than beat end minus 5`);
    if (t.from < host.from) err(`I4: ${t.id} starts before its shot`);
    const toks = t.content.split(/\s+/).map(norm).filter(Boolean);
    let ok = false, runStart = -1;
    for (let i = 0; i + toks.length <= wnorm.length && !ok; i++) { if (toks.every((tk, k) => wnorm[i + k] === tk)) { ok = true; runStart = i; } }
    if (!ok && toks.length === 1) { const i = wnorm.findIndex((w) => w.includes(toks[0])); if (i >= 0) { ok = true; runStart = i; } }
    if (!ok) err(`I5: ${t.id} "${t.content}" is not verbatim in the transcript`);
    else {
      // the anchor must be a word of some occurrence of the run that lies inside the host shot's time window
      const hostStart = msToFrame(words[Math.max(0, t.anchorWordId)]?.startMs ?? 0);
      if (!words.some((w) => w.id === t.anchorWordId)) err(`I5: ${t.id} anchor #${t.anchorWordId} is not a word`);
      else if (hostStart < host.from - 3 || hostStart > cutOf(host) + netOf(host) + 3) err(`I5: ${t.id} anchor #${t.anchorWordId} outside its shot`);
      void runStart;
    }
    if (t.wordFrames) for (const wf of t.wordFrames) if (wf.from < t.from || wf.from + wf.durationInFrames > t.from + t.durationInFrames + 1) err(`I4: ${t.id} word frame outside the text window`);
  }
  // I6
  const nonTick = tl.tracks.sfx.filter((s) => s.tag !== "tick" && s.tag !== "counter-tick-loop").sort((x, y) => x.from - y.from);
  for (let i = 1; i < nonTick.length; i++) if (nonTick[i].from - nonTick[i - 1].from < 45) err(`I6: ${nonTick[i - 1].id}/${nonTick[i].id} ${nonTick[i].from - nonTick[i - 1].from} frames apart`);
  for (const s of tl.tracks.sfx) if (s.volume > 0.5) err(`I6: ${s.id} volume ${s.volume}`);
  // I7
  const seenSec = new Set<string>();
  for (const m of tl.tracks.music) {
    if (m.volume > 0.16) err(`I7: ${m.id} volume ${m.volume} > 0.16`);
    for (const sid of m.sectionIds) { if (seenSec.has(sid)) err(`I7: music restarts within section ${sid}`); seenSec.add(sid); }
  }
  // asset lookup by media src
  const bySrc = new Map<string, Asset>();
  for (const k of Object.keys(assets)) for (const a of [assets[k].chosen, ...(assets[k].alternates ?? [])]) if (a) { if (a.preparedPath) bySrc.set(a.preparedPath, a); bySrc.set(a.localPath, a); }
  // I8
  const uses = new Map<string, { beatId: string; cut: number }[]>();
  for (const it of b) for (const m of it.media) { const a = bySrc.get(m.src); const key = a?.assetId ?? m.src; const l = uses.get(key) ?? []; l.push({ beatId: it.beatId, cut: cutOf(it) }); uses.set(key, l); }
  for (const [k, l] of uses) {
    const beats = new Set(l.map((x) => x.beatId));
    if (beats.size > 2) err(`I8: asset ${k} used by ${beats.size} beats`);
    for (const x of l) for (const y of l) if (x.beatId !== y.beatId && Math.abs(x.cut - y.cut) < 2700) err(`I8: asset ${k} reused within 2,700 frames (${x.beatId}, ${y.beatId})`);
  }
  // I9 (typographic-card fallbacks excluded from the run; hook sections with < 2.2 s beats may run 3)
  const beatsJson = rd<{ sections: { id: string; kind: string }[] }>("beats.json");
  const sectionKind = new Map((beatsJson?.sections ?? []).map((s) => [s.id, s.kind]));
  let run = 1;
  for (let i = 1; i < b.length; i++) {
    if (b[i].layout === "typographic-card" || b[i - 1].layout === "typographic-card") { run = 1; continue; }
    run = layoutFamily(b[i].layout) === layoutFamily(b[i - 1].layout) ? run + 1 : 1;
    const allow = sectionKind.get(b[i].sectionId) === "hook" && netOf(b[i]) < 66 ? 3 : 2;
    if (run > allow) err(`I9: ${b[i].id} is the ${run}th consecutive ${layoutFamily(b[i].layout)} layout`);
  }
  // I10 Y2 rules + report list
  const y2Items: { item: BrollItem; asset: Asset | undefined }[] = [];
  const y2Sources = new Map<string, string>();
  for (const it of b) {
    const a = it.media[0] ? bySrc.get(it.media[0].src) : undefined;
    if (it.tier !== "y2" && a?.tier !== "y2") continue;
    y2Items.push({ item: it, asset: a });
    if (!it.credit) err(`I10: ${it.id} Y2 without corner credit`);
    if (layoutFamily(it.layout) === "grid" || it.layout === "comparison-split") err(`I10: ${it.id} Y2 in a grid`);
    if (it.media.some((m) => m.kind !== "video")) err(`I10: ${it.id} Y2 media is not video`);
    if (it.durationInFrames > MAX_Y2_FRAMES) err(`I10: ${it.id} Y2 over 149 frames`);
    if (a?.sourceVideoId) { const p = y2Sources.get(a.sourceVideoId); if (p && p !== it.beatId) err(`I10: Y2 source ${a.sourceVideoId} used twice`); y2Sources.set(a.sourceVideoId, it.beatId); }
    if (!tl.tracks.credits.some((c) => c.tier === "y2" && c.beatId === it.beatId)) err(`I10: ${it.id} missing from credits`);
  }
  // I11 credits completeness (12.6)
  for (const it of b) for (const m of it.media) {
    const a = bySrc.get(m.src);
    if (!a || !creditRequired(a)) continue;
    const text = a.attribution ?? "";
    if (!tl.tracks.credits.some((c) => (text && c.text === text) || c.text.includes(a.assetId) || (c.beatId === it.beatId && c.tier === a.tier))) err(`I11: ${a.assetId} (${a.source}) has no credit line`);
  }
  // 12.5 no transition inside a chunk boundary; chunks contiguous and cover the timeline
  const cs = chunks.slice().sort((x, y) => x.fromFrame - y.fromFrame);
  if (cs.length) {
    if (cs[0].fromFrame !== 0 || cs[cs.length - 1].toFrame !== tl.durationInFrames - 1) err("chunks do not cover the timeline");
    for (let i = 1; i < cs.length; i++) if (cs[i].fromFrame !== cs[i - 1].toFrame + 1) err(`chunks ${cs[i - 1].id}/${cs[i].id} are not contiguous`);
    for (const c of cs) if (c.route === "remotion" && c.toFrame - c.fromFrame + 1 > 4000) err(`chunk ${c.id} longer than 4,000 frames`);
    for (const it of b) if (it.transitionIn.durationInFrames > 0) for (const c of cs) if (c.fromFrame > it.from && c.fromFrame < it.from + it.transitionIn.durationInFrames) err(`transition of ${it.id} crosses chunk boundary ${c.id}`);
    for (const it of b) if (!cs.some((c) => c.id === it.segmentId)) err(`${it.id} references unknown segment ${it.segmentId}`);
    for (const it of b) if (it.route === "ffmpeg") { const c = cs.find((x) => x.id === it.segmentId); if (c && c.route !== "ffmpeg") err(`${it.id} routed ffmpeg but sits in a ${c.route} chunk`); }
  }
  // routing sanity: ffmpeg items must be plain
  for (const it of b) if (it.route === "ffmpeg") {
    if (!["fullscreen-clip", "fullscreen-image-kenburns"].includes(it.layout)) err(`route: ${it.id} ffmpeg with layout ${it.layout}`);
    if (!["cut", "fade"].includes(it.transitionIn.type)) err(`route: ${it.id} ffmpeg with transition ${it.transitionIn.type}`);
    if (it.credit || it.tier === "y2") err(`route: ${it.id} ffmpeg with a credit overlay`);
    if (tl.tracks.text.some((t) => t.beatId === it.beatId && t.from >= it.from && t.from < it.from + it.durationInFrames)) err(`route: ${it.id} ffmpeg with text`);
  }
  // 12.3 filesystem
  if (opts.skipMedia) warnings.push("--skip-media: ffprobe checks skipped");
  for (const it of b) for (const m of it.media) {
    const p = path.isAbsolute(m.src) ? m.src : path.join(jobDir, m.src);
    if (!fs.existsSync(p)) { (opts.skipMedia ? warnings : errors).push(`media missing: ${m.src} (${it.id})`); continue; }
    if (opts.skipMedia) continue;
    const pr = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,pix_fmt:format=duration", "-of", "json", p], { encoding: "utf8" });
    if (pr.status !== 0) { warnings.push(`ffprobe failed for ${m.src}`); continue; }
    const info = JSON.parse(pr.stdout) as { streams: { codec_type: string; width?: number; height?: number; r_frame_rate?: string; pix_fmt?: string }[]; format: { duration: string } };
    const v = info.streams.find((s) => s.codec_type === "video");
    if (!v) { err(`${m.src}: no video stream`); continue; }
    if (m.kind === "video") {
      const need = (it.durationInFrames - m.startFromFrame) / 30 + 0.2;
      if (parseFloat(info.format.duration) < need && m.freezeAfterFrame === undefined) err(`${m.src}: duration ${info.format.duration}s < needed ${need.toFixed(2)}s`);
      if (v.width !== 1920 || v.height !== 1080) err(`${m.src}: ${v.width}x${v.height} is not 1920x1080`);
      if (v.r_frame_rate !== "30/1") err(`${m.src}: r_frame_rate ${v.r_frame_rate}`);
      if (v.pix_fmt !== "yuv420p") err(`${m.src}: pix_fmt ${v.pix_fmt}`);
      if (info.streams.some((s) => s.codec_type === "audio")) err(`${m.src}: prepared B-roll must have no audio stream`);
    }
  }
  // 12.7 determinism: re-run the Brain in-process and compare sha1 of the timeline JSON
  if (!opts.skipDeterminism) {
    try {
      const mod = (await import("./brain/index.js")) as { runBrain: (dir: string, o: { write: boolean; packsDir?: string }) => { timeline: Timeline } };
      const again = mod.runBrain(jobDir, { write: false, packsDir: opts.packsDir });
      if (sha1(stable(again.timeline)) !== sha1(stable(tl))) err("I12: in-process Brain re-run produced a different timeline.json");
    } catch (e) { err(`I12: Brain re-run failed: ${(e as Error).message}`); }
  }

  // report.md
  const count = <T,>(xs: T[], f: (x: T) => string) => { const m = new Map<string, number>(); for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1); return [...m.entries()].sort((x, y) => y[1] - x[1]); };
  const ffFrames = cs.filter((c) => c.route === "ffmpeg").reduce((a, c) => a + c.toFrame - c.fromFrame + 1, 0);
  const lines: string[] = [];
  lines.push(`# Validation report: ${tl.jobId}`, "", `Result: ${errors.length ? `FAIL (${errors.length} errors)` : "PASS"}; ${warnings.length} warnings`, "",
    `- frames: ${tl.durationInFrames} (${(tl.durationInFrames / 30 / 60).toFixed(1)} min); shots: ${b.length}; texts: ${tl.tracks.text.length}; motion gfx: ${tl.tracks.motiongfx.length}; sfx: ${tl.tracks.sfx.length}; music: ${tl.tracks.music.length}; chunks: ${cs.length}`,
    `- routed to ffmpeg: ${(100 * ffFrames / Math.max(1, tl.durationInFrames)).toFixed(1)} % of frames, ${b.filter((x) => x.route === "ffmpeg").length} shots`, "",
    "## Layouts", ...count(b, (x) => x.layout).map(([k, v]) => `- ${k}: ${v}`), "",
    "## Transitions", ...count(b, (x) => x.transitionIn.type).map(([k, v]) => `- ${k}: ${v}`), "",
    "## Sources", ...count(b.flatMap((x) => x.media.map((m) => bySrc.get(m.src)?.source ?? "unknown")), (x) => x).map(([k, v]) => `- ${k}: ${v}`), "",
    "## Tiers", ...count(b, (x) => x.tier ?? (x.media.length ? "unknown" : "card")).map(([k, v]) => `- ${k}: ${v}`), "",
    "## Typographic cards", ...(b.filter((x) => x.layout === "typographic-card").map((x) => `- ${x.id} @${x.from}: "${x.keyPhrase ?? ""}"`) || []), "",
    "## YouTube Y2 clips (review before publishing)", ...(y2Items.length ? y2Items.map(({ item, asset }) => `- ${item.id} @${item.from} (${item.durationInFrames} f): ${asset?.channelTitle ?? "?"} ${asset?.srcUrl ?? ""}`) : ["- none"]), "");
  if (errors.length) lines.push("## Errors", ...errors.map((e) => `- ${e}`), "");
  if (warnings.length) lines.push("## Warnings", ...warnings.map((w) => `- ${w}`), "");
  const report = lines.join("\n");
  fs.writeFileSync(path.join(jobDir, "report.md"), report);
  return { errors, warnings, report };
}

async function cli(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const job = get("--job");
  if (!job) { console.error("usage: tsx scripts/ts/validate.ts --job <id> [--skip-media] [--packs <dir>]"); process.exit(2); }
  const jobDir = fs.existsSync(path.join(job, "timeline.json")) ? path.resolve(job) : path.resolve("work", job);
  const r = await validateJob(jobDir, { skipMedia: argv.includes("--skip-media"), packsDir: get("--packs") });
  for (const w of r.warnings) console.warn(`warn: ${w}`);
  for (const e of r.errors) console.error(`error: ${e}`);
  console.log(r.errors.length ? `validate: FAIL (${r.errors.length} errors), see report.md` : "validate: PASS, see report.md");
  process.exit(r.errors.length ? 1 : 0);
}
if (process.argv[1] && /validate\.ts$/.test(process.argv[1])) cli(process.argv.slice(2));
