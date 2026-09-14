// THE BRAIN (spec section 11): deterministic placement engine. CLI: tsx scripts/ts/brain/index.ts --job <id> [--repair qc-actions.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type {
  Asset, Assets, Beats, BrollItem, Chunk, CreditLine, Grade, JobConfig, MotionGfxItem, MusicManifestEntry, SfxManifestEntry, ShotPlan, Timeline, Transcript, TextItem, Layout,
} from "../types.js";
import { frameToMs, msToFrame, layoutFamily, MIN_SHOT_FRAMES, MAX_SHOT_FRAMES, MAX_Y2_FRAMES } from "../types.js";
import type { Ctx, SectionCtx, WorkShot } from "./model.js";
import { BRAIN_VERSION } from "./model.js";
import { makeRng, sha1, stableStringify } from "./rng.js";
import { PlacementLog } from "./log.js";
import { computeEmphasis } from "./emphasis.js";
import { repairBeats, cutPoints } from "./cuts.js";
import { assignShots, enforceVariety } from "./shots.js";
import { assignTransitions, PUNCHY, DURATION_RANGE } from "./transitions.js";
import { quantiseShots } from "./quantise.js";
import { placeText } from "./text.js";
import { scheduleMotionGfx } from "./motiongfx.js";
import { SfxPack, sfxCandidates, scheduleSfx, MIN_GAP } from "./sfx.js";
import { layoutMusic, parseRms, duckCurve } from "./music.js";
import { routeItems, buildSegments, chunkSegments, hashChunks, assignSegmentIds } from "./route.js";
import { fallbackPlan } from "./planner.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = path.resolve(here, "..", "..", "..");

export interface RepairAction { beatId: string; action: "swap-alternate" | "move-text" | "drop-text" | "change-layout" | "shorten" | "ok"; position?: string; layout?: Layout; alternateIndex?: number }
export interface BrainOptions { repair?: RepairAction[]; write?: boolean; packsDir?: string }
export interface BrainResult {
  timeline: Timeline; chunks: Chunk[]; log: PlacementLog; audioMix: unknown; duckCurve: number[]; credits: { lines: CreditLine[]; y2: unknown[] };
  assets: Assets; changedSegments?: string[];
}

const readJson = <T>(p: string): T => JSON.parse(fs.readFileSync(p, "utf8")) as T;
const exists = (p: string) => fs.existsSync(p);

function loadInputs(jobDir: string, log: PlacementLog, packsDir: string) {
  const transcript = readJson<Transcript>(path.join(jobDir, "transcript.json"));
  const beats = readJson<Beats>(path.join(jobDir, "beats.json"));
  const jobPath = path.join(jobDir, "job.yaml");
  const job = (exists(jobPath) ? yaml.load(fs.readFileSync(jobPath, "utf8")) : {}) as JobConfig;
  const assets = exists(path.join(jobDir, "assets.json")) ? readJson<Assets>(path.join(jobDir, "assets.json")) : {};
  if (!exists(path.join(jobDir, "assets.json"))) log.warn("assets.json missing: every beat falls back to typographic cards / pool");
  const plans = new Map<string, ShotPlan>();
  const plansDir = path.join(jobDir, "plans");
  if (exists(plansDir)) for (const f of fs.readdirSync(plansDir).sort()) {
    if (!f.endsWith(".json") || f.endsWith(".raw.json")) continue;
    try { const p = readJson<ShotPlan>(path.join(plansDir, f)); if (p && Array.isArray(p.shots) && p.sectionId) plans.set(p.sectionId, p); else log.warn(`plans/${f}: not a ShotPlan, ignored`); }
    catch (e) { log.warn(`plans/${f}: unreadable (${(e as Error).message})`); }
  }
  const rmsPath = path.join(jobDir, "rms50ms.txt");
  const rms = exists(rmsPath) ? parseRms(fs.readFileSync(rmsPath, "utf8")) : null;
  if (!rms) log.warn("rms50ms.txt missing: flat duck curve");
  const sfxManifest = path.join(packsDir, "sfx", "manifest.json");
  const musicManifest = path.join(packsDir, "music", "manifest.json");
  const sfxPack = exists(sfxManifest) ? normaliseManifest<SfxManifestEntry>(readJson(sfxManifest)) : (log.warn(`SFX pack manifest missing at ${sfxManifest}: sfx track empty`), []);
  const musicPack = exists(musicManifest) ? normaliseManifest<MusicManifestEntry>(readJson(musicManifest)) : (log.warn(`music pack manifest missing at ${musicManifest}: music track empty`), []);
  return { transcript, beats, job, assets, plans, rms, sfxPack, musicPack };
}
function normaliseManifest<T>(m: unknown): T[] { return Array.isArray(m) ? (m as T[]) : ((m as { entries?: T[]; items?: T[] })?.entries ?? (m as { items?: T[] })?.items ?? []); }

function applyRepairs(inputs: ReturnType<typeof loadInputs>, repairs: RepairAction[], log: PlacementLog) {
  for (const r of repairs) {
    const ba = inputs.assets[r.beatId];
    const plan = [...inputs.plans.values()].flatMap((p) => p.shots).find((s) => s.beatId === r.beatId);
    switch (r.action) {
      case "swap-alternate": {
        if (!ba || !ba.alternates?.length) { log.warn(`repair swap-alternate ${r.beatId}: no alternates`); break; }
        const idx = Math.min(r.alternateIndex ?? 0, ba.alternates.length - 1);
        const next = ba.alternates[idx];
        ba.alternates = [...(ba.chosen ? [ba.chosen] : []), ...ba.alternates.filter((_, i) => i !== idx)];
        ba.chosen = next;
        log.log("repair", "swap-alternate", `${r.beatId}: chosen -> ${next.assetId}`, { beatId: r.beatId });
        break;
      }
      case "drop-text": if (plan) { plan.text = null; log.log("repair", "drop-text", r.beatId, { beatId: r.beatId }); } break;
      case "move-text": if (plan?.text && r.position) { plan.text.position = r.position as typeof plan.text.position; log.log("repair", "move-text", `${r.beatId} -> ${r.position}`, { beatId: r.beatId }); } break;
      case "change-layout": if (plan && r.layout) { plan.layoutPreference = r.layout; log.log("repair", "change-layout", `${r.beatId} -> ${r.layout}`, { beatId: r.beatId }); } break;
      case "shorten": log.log("repair", "shorten", `${r.beatId}: cuts already sit on word starts; nearest word start kept (no-op)`, { beatId: r.beatId }); break;
      default: break;
    }
  }
}

function buildCtx(jobDir: string, inputs: ReturnType<typeof loadInputs>, log: PlacementLog): Ctx {
  const { transcript, beats, job, assets } = inputs;
  const jobId = job.job_id ?? path.basename(jobDir);
  const seed = (job as JobConfig & { seed?: string }).seed ?? sha1(jobId);
  const words = transcript.words.slice().sort((a, b) => a.id - b.id);
  const wordById = new Map(words.map((w) => [w.id, w]));
  const beatById = new Map(beats.beats.map((b) => [b.id, b]));
  const grade: Grade = job.grade ?? "muted-documentary";
  const sections: SectionCtx[] = beats.sections.map((section) => {
    let plan = inputs.plans.get(section.id);
    let fallback = false;
    if (!plan) {
      fallback = true;
      plan = fallbackPlan(section, section.beatIds.map((id) => beatById.get(id)!).filter(Boolean), wordById, new Map(), grade, seed);
      log.warn(`no shot plan for ${section.id}: rule-based planner fallback`);
    }
    return { section, plan, planByBeat: new Map(plan.shots.map((s) => [s.beatId, s])), fallback, mood: plan.mood ?? "documentary", grade: plan.grade ?? grade, musicTag: plan.musicTag ?? "documentary-ambient" };
  });
  const ctx: Ctx = {
    jobDir, job, seed, rng: makeRng(seed), rngFor: (key: string) => makeRng(`${seed}:${key}`), log, transcript, words, wordById, beats, beatById, sections, sectionById: new Map(sections.map((s) => [s.section.id, s])),
    assets: structuredClone(assets) as Assets,  // the run mutates headPadFrames; keep inputs pristine for I12 re-runs
    prepared: loadPrepared(jobDir),
    sfxPack: inputs.sfxPack, musicPack: inputs.musicPack, rmsBins: inputs.rms,
    leadMs: job.brain?.lead_ms ?? 100, clipThreshold: job.brain?.clip_threshold ?? 0.26, heroThreshold: job.brain?.hero_threshold ?? 0.30, typographicCap: job.brain?.typographic_cap ?? 0.15,
    totalFrames: msToFrame(transcript.durationMs), emphasis: new Map(),
  };
  if (ctx.leadMs < 80 || ctx.leadMs > 120) { log.warn(`lead_ms ${ctx.leadMs} outside 80..120; clamped`); ctx.leadMs = Math.max(80, Math.min(120, ctx.leadMs)); }
  return ctx;
}

const creditRequired = (a: Asset): boolean => a.source === "pexels" || /\bBY\b/i.test(a.license) || a.tier === "y1" || a.tier === "y2";
const prettySource = (a: Asset): string => ({ pexels: "Pexels", openverse: "Openverse", wikimedia: "Wikimedia Commons", nasa: "NASA", archiveorg: "Internet Archive", youtube: "YouTube", user: "User" } as Record<string, string>)[a.source] ?? a.source;
const creditText = (a: Asset): string => a.attribution ?? (a.tier === "y2" || a.tier === "y1" ? `Clip: ${a.channelTitle ?? "YouTube"}` : `${prettySource(a)} ${a.assetId}`);

/** The whole deterministic pipeline P0..P11 on already-loaded inputs. */
/** prepared/manifest.json written by scripts/py/prepare_assets.py: {"<beatId>" | "<beatId>:<assetId>": {assetId, path, ...}} */
function loadPrepared(jobDir: string): Record<string, { assetId: string; path: string }> {
  const p = path.join(jobDir, "prepared", "manifest.json");
  if (!exists(p)) return {};
  const raw = readJson<Record<string, { assetId?: string; path?: string }>>(p) ?? {};
  const out: Record<string, { assetId: string; path: string }> = {};
  for (const k of Object.keys(raw).sort()) { const r = raw[k]; if (r && r.assetId && r.path) out[k] = { assetId: r.assetId, path: r.path }; }
  return out;
}

function compute(jobDir: string, inputs: ReturnType<typeof loadInputs>, log: PlacementLog) {
  // P0 normalise + seed
  const ctx = buildCtx(jobDir, inputs, log);
  log.log("P0", "seed", `seed ${ctx.seed}; ${ctx.words.length} words; ${ctx.beats.beats.length} beats; ${ctx.sections.length} sections; ${ctx.totalFrames} frames`);
  // P3 emphasis (computed first: P1 prefers splitting before strong words, 11.4 a)
  ctx.emphasis = computeEmphasis({ words: ctx.words, beats: ctx.beats.beats, sections: ctx.beats.sections, shots: [...inputs.plans.values()].flatMap((p) => p.shots) });
  const strong = [...ctx.emphasis.values()].filter((v) => v >= 1).length;
  log.log("P3", "emphasis", `${strong} strong words, ${[...ctx.emphasis.values()].filter((v) => v >= 0.5 && v < 1).length} medium`);
  // re-plan fallback sections now that emphasis exists (key phrases for text)
  for (const sc of ctx.sections) if (sc.fallback) {
    sc.plan = fallbackPlan(sc.section, sc.section.beatIds.map((id) => ctx.beatById.get(id)!).filter(Boolean), ctx.wordById, ctx.emphasis, sc.grade, ctx.seed);
    sc.planByBeat = new Map(sc.plan.shots.map((s) => [s.beatId, s]));
  }
  // P1 beat repair
  const { beats, parts } = repairBeats(ctx);
  // P2 cut points
  const cuts = cutPoints(ctx, beats);
  // P4 shots
  const shots = assignShots(ctx, cuts, parts);
  // P5 transitions
  assignTransitions(ctx, shots);
  // P6 quantise
  quantiseShots(ctx, shots);
  enforceVariety(ctx, shots); // rule 5 after frame-domain splits/merges
  // P7 text
  const texts = placeText(ctx, shots);
  // P8 motion graphics
  const { gfx, sfx: gfxSfx } = scheduleMotionGfx(ctx, shots, texts);
  // P9 sfx
  const pack = new SfxPack(ctx.sfxPack);
  const sfxItems = ctx.job.sfx === false ? [] : scheduleSfx(ctx, [...sfxCandidates(ctx, shots, texts), ...gfxSfx], pack);
  if (ctx.job.sfx !== false && !ctx.sfxPack.length) log.warn("no SFX pack: sfx track empty");
  // P10 music + duck curve
  const music = layoutMusic(ctx, shots);
  const riserCards = new Set<string>();
  for (const s of sfxItems) if (s.tag === "riser-short") { const m = /chapter-card (\S+)/.exec(s.reason); if (m) riserCards.add(m[1]); }
  const duck = duckCurve(ctx, music, shots, riserCards);
  // build broll items
  const broll: BrollItem[] = shots.map((s) => toItem(ctx, s));
  // P11 routing
  routeItems(broll, texts, gfx, log);
  const segments = chunkSegments(buildSegments(broll, ctx.totalFrames), broll);
  const tracks = { broll, text: texts, motiongfx: gfx, sfx: sfxItems, music };
  const chunks = hashChunks(segments, tracks, ctx.job.grade ?? "muted-documentary");
  assignSegmentIds(broll, chunks);
  // credits (I11)
  const lines: CreditLine[] = [];
  const y2: unknown[] = [];
  const seen = new Set<string>();
  for (const s of shots) for (const a of [s.asset, ...s.extraAssets]) {
    if (!a) continue;
    if (a.tier === "y2") y2.push({ beatId: s.beatId, itemId: s.id, assetId: a.assetId, channelTitle: a.channelTitle ?? null, srcUrl: a.srcUrl, from: s.from, durationInFrames: s.durationInFrames });
    if (!creditRequired(a)) continue;
    const text = creditText(a);
    if (seen.has(text)) continue; seen.add(text);
    lines.push({ source: prettySource(a), text, beatId: s.beatId, tier: a.tier });
  }
  for (const m of music) { const e = ctx.musicPack.find((x) => x.file === m.src); if (e && /\bBY\b/i.test(e.license) && !seen.has(`Music: ${e.file}`)) { seen.add(`Music: ${e.file}`); lines.push({ source: e.source, text: `Music: ${e.file} (${e.license})` }); } }
  const timeline: Timeline = {
    fps: 30, width: 1920, height: 1080, durationInFrames: ctx.totalFrames, jobId: ctx.job.job_id ?? path.basename(jobDir), seed: ctx.seed,
    narration: { src: ctx.transcript.audioPath, startFrame: 0 }, grade: ctx.job.grade ?? "muted-documentary", duckCurve: "duckCurve.json",
    tracks: { ...tracks, captions: { enabled: !!ctx.job.captions, style: "karaoke-bottom", pages: [] }, credits: lines },
    placementLog: path.join("work", path.basename(jobDir), "placement.log.jsonl").split(path.sep).join("/"),
  };
  const audioMix = {
    narration: { src: ctx.transcript.audioPath, delayMs: 0 },
    music: music.map((m) => ({ id: m.id, src: m.src, delayMs: frameToMs(m.from), durationMs: frameToMs(m.durationInFrames), volume: m.volume, fadeInMs: frameToMs(m.fadeInFrames), fadeOutMs: frameToMs(m.fadeOutFrames), loopAtMs: (m.loopAtFrames ?? []).map(frameToMs) })),
    sfx: sfxItems.map((s) => ({ id: s.id, src: s.src, delayMs: frameToMs(s.from), volume: s.volume, tag: s.tag })),
    duckCurve: "duckCurve.json", fps: 30,
  };
  assertInvariants(ctx, timeline, shots);
  return { timeline, chunks, audioMix, duck, credits: { lines, y2 }, shots, assets: ctx.assets };
}

function toItem(ctx: Ctx, s: WorkShot): BrollItem {
  const sc = ctx.sectionById.get(s.sectionId);
  const grade: Grade = s.overrides.some((o) => o === "grade: vintage") ? "vintage" : sc?.grade ?? ctx.job.grade;
  const ext = s as WorkShot & { statCountFrames?: number; gridStaggerFrames?: number; listLinesTimed?: { text: string; atFrame: number }[] };
  const item: BrollItem = {
    id: s.id, beatId: s.beatId, sectionId: s.sectionId, from: s.from, durationInFrames: s.durationInFrames, route: "remotion", segmentId: "", layout: s.layout,
    media: s.media.map((m) => ({ ...m })), motion: s.motion, transitionIn: s.transitionIn, credit: s.credit, grade,
  };
  if (s.gridLabels) item.gridLabels = s.gridLabels;
  if (ext.gridStaggerFrames !== undefined) item.gridStaggerFrames = ext.gridStaggerFrames;
  if (s.stat && s.layout === "stat-counter") item.stat = { ...s.stat, countFrames: ext.statCountFrames ?? Math.max(1, Math.min(60, s.netFrames - 20)) };
  if (s.quote) item.quote = s.quote;
  if (ext.listLinesTimed) item.listLines = ext.listLinesTimed;
  if (s.cardTitle) item.cardTitle = s.cardTitle;
  if (s.cardSubtitle) item.cardSubtitle = s.cardSubtitle;
  if (s.keyPhrase) item.keyPhrase = s.keyPhrase;
  if (s.tier) item.tier = s.tier;
  return item;
}

class InvariantError extends Error {}
function assertInvariants(ctx: Ctx, tl: Timeline, shots: WorkShot[]): void {
  const fail = (code: string, msg: string) => { throw new InvariantError(`${code} violated: ${msg}`); };
  const b = tl.tracks.broll;
  const cut = (it: BrollItem) => it.from + it.transitionIn.durationInFrames;
  const net = (it: BrollItem) => it.durationInFrames - it.transitionIn.durationInFrames;
  // I1 contiguity and total
  if (!b.length) fail("I1", "no broll items");
  if (b[0].from !== 0 || b[0].transitionIn.durationInFrames !== 0) fail("I1", "first item must start at frame 0 with a cut");
  for (let i = 1; i < b.length; i++) if (cut(b[i]) !== cut(b[i - 1]) + net(b[i - 1])) fail("I1", `gap/overlap between ${b[i - 1].id} and ${b[i].id}`);
  if (b.reduce((a, it) => a + net(it), 0) !== tl.durationInFrames) fail("I1", "sum of net durations != durationInFrames");
  // I2 bounds
  for (const it of b) {
    if (net(it) < MIN_SHOT_FRAMES || net(it) > MAX_SHOT_FRAMES) fail("I2", `${it.id} net ${net(it)} frames`);
    if (it.tier === "y2" && it.durationInFrames > MAX_Y2_FRAMES) fail("I2", `${it.id} Y2 ${it.durationInFrames} frames > ${MAX_Y2_FRAMES}`);
  }
  // I3 transition completes at the cut frame; durations within family range; overlap fits in the previous shot
  for (let i = 0; i < b.length; i++) {
    const t = b[i].transitionIn;
    if (t.type === "cut") { if (t.durationInFrames !== 0) fail("I3", `${b[i].id} cut with duration`); continue; }
    const [lo] = DURATION_RANGE[t.type];
    const hi = PUNCHY.includes(t.type) ? 10 : 18;
    if (t.durationInFrames < Math.min(lo, 6) || t.durationInFrames > hi) fail("I3", `${b[i].id} ${t.type} ${t.durationInFrames} frames`);
    if (i === 0 || t.durationInFrames > net(b[i - 1])) fail("I3", `${b[i].id} transition overlaps beyond the previous shot`);
  }
  // I4 text ends 5+ frames before its shot ends; I5 verbatim
  for (const t of tl.tracks.text) {
    const host = b.find((it) => it.beatId === t.beatId && t.from >= cut(it) - 2 && t.from < cut(it) + net(it));
    if (!host) fail("I4", `${t.id} has no host shot`);
    if (t.from + t.durationInFrames > cut(host!) + net(host!) - 5) fail("I4", `${t.id} ends after its beat end minus 5`);
    const toks = t.content.split(/\s+/).map((x) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")).filter(Boolean);
    const shot = shots.find((s) => s.id === host!.id)!;
    const ws = shot.wordIds.map((id) => ctx.wordById.get(id)!.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""));
    let ok = false;
    for (let i = 0; i + toks.length <= ws.length && !ok; i++) ok = toks.every((tk, k) => ws[i + k] === tk);
    if (!ok && !(toks.length === 1 && ws.some((w) => w.includes(toks[0])))) fail("I5", `${t.id} "${t.content}" not verbatim in ${host!.id}`);
    if (!shot.wordIds.includes(t.anchorWordId)) fail("I5", `${t.id} anchor outside its shot`);
  }
  // I6 SFX spacing (tick trains exempt)
  const nonTick = tl.tracks.sfx.filter((s) => s.tag !== "tick" && s.tag !== "counter-tick-loop").sort((a, c) => a.from - c.from);
  for (let i = 1; i < nonTick.length; i++) if (nonTick[i].from - nonTick[i - 1].from < MIN_GAP) fail("I6", `${nonTick[i - 1].id} and ${nonTick[i].id} are ${nonTick[i].from - nonTick[i - 1].from} frames apart`);
  for (const s of tl.tracks.sfx) if (s.volume > 0.5) fail("I6", `${s.id} volume ${s.volume} > 0.5`);
  // I7 music volume cap, no restart within a section
  const secSeen = new Set<string>();
  for (const m of tl.tracks.music) {
    if (m.volume > 0.16) fail("I7", `${m.id} volume ${m.volume}`);
    for (const sid of m.sectionIds) { if (secSeen.has(sid)) fail("I7", `section ${sid} has two music items`); secSeen.add(sid); }
  }
  // I8 asset reuse: max 2 beats per asset, never within 2,700 frames
  const uses = new Map<string, { beatId: string; cut: number }[]>();
  for (const s of shots) for (const a of [s.asset, ...s.extraAssets]) if (a) { const l = uses.get(a.assetId) ?? []; l.push({ beatId: s.beatId, cut: s.cutFrame }); uses.set(a.assetId, l); }
  for (const [id, l] of uses) {
    const beats = new Set(l.map((x) => x.beatId));
    if (beats.size > 2) fail("I8", `asset ${id} used by ${beats.size} beats`);
    for (const x of l) for (const y of l) if (x.beatId !== y.beatId && Math.abs(x.cut - y.cut) < 2700) fail("I8", `asset ${id} reused within 2,700 frames (${x.beatId}, ${y.beatId})`);
  }
  // I9 layout family run length <= 2 (typographic-card fallbacks excluded; 3 allowed in hook sections with < 2.2 s beats)
  let run = 1;
  for (let i = 1; i < b.length; i++) {
    if (b[i].layout === "typographic-card" || b[i - 1].layout === "typographic-card") { run = 1; continue; }
    if (layoutFamily(b[i].layout) === layoutFamily(b[i - 1].layout)) run++; else run = 1;
    const hookShort = ctx.sectionById.get(b[i].sectionId)?.section.kind === "hook" && net(b[i]) < 66;
    if (run > (hookShort ? 3 : 2)) fail("I9", `${b[i].id}: ${run} consecutive ${layoutFamily(b[i].layout)} layouts`);
  }
  // I10 Y2 rules
  const y2Sources = new Map<string, string>();
  for (const s of shots) {
    const a = s.asset;
    if (!a || a.tier !== "y2") continue;
    const it = b.find((x) => x.id === s.id)!;
    if (!it.credit) fail("I10", `${s.id} Y2 without corner credit`);
    if (layoutFamily(it.layout) === "grid" || it.layout === "comparison-split") fail("I10", `${s.id} Y2 in a grid`);
    if (a.sourceVideoId) { const prev = y2Sources.get(a.sourceVideoId); if (prev && prev !== s.beatId) fail("I10", `Y2 source ${a.sourceVideoId} used twice`); y2Sources.set(a.sourceVideoId, s.beatId); }
    if (!tl.tracks.credits.some((c) => c.tier === "y2" && c.beatId === s.beatId)) fail("I10", `${s.id} Y2 missing from credits`);
  }
  // I11 credits completeness
  for (const s of shots) for (const a of [s.asset, ...s.extraAssets]) if (a && creditRequired(a) && !tl.tracks.credits.some((c) => c.text === creditText(a))) fail("I11", `${a.assetId} needs a credit line`);
  // I12 determinism is asserted by runBrain (second in-process run)
}

/** Run the Brain on a job directory. Returns everything; writes outputs unless opts.write === false. */
export function runBrain(jobDir: string, opts: BrainOptions = {}): BrainResult {
  const packsDir = opts.packsDir ?? path.join(PACKAGE_ROOT, "assets");
  const log = new PlacementLog();
  const inputs = loadInputs(jobDir, log, packsDir);
  if (opts.repair?.length) applyRepairs(inputs, opts.repair, log);
  const first = compute(jobDir, inputs, log);
  // I12: a second run on freshly loaded inputs must be byte-identical
  const inputs2 = loadInputs(jobDir, new PlacementLog(), packsDir);
  if (opts.repair?.length) applyRepairs(inputs2, opts.repair, new PlacementLog());
  const second = compute(jobDir, inputs2, new PlacementLog());
  if (stableStringify(first.timeline) !== stableStringify(second.timeline)) throw new InvariantError("I12 violated: two runs produced different timelines");

  let changedSegments: string[] | undefined;
  const chunksPath = path.join(jobDir, "chunks.json");
  if (opts.repair?.length && exists(chunksPath)) {
    const prev = readJson<Chunk[]>(chunksPath);
    // a segment is unchanged when a previous segment covers the same frames with the same hash (ids may renumber)
    const prevKeys = new Set(prev.map((c) => `${c.fromFrame}-${c.toFrame}-${c.route}-${c.hash}`));
    changedSegments = first.chunks.filter((c) => !prevKeys.has(`${c.fromFrame}-${c.toFrame}-${c.route}-${c.hash}`)).map((c) => c.id);
    log.log("repair", "changed-segments", changedSegments.length ? changedSegments.join(",") : "none");
  }
  // 11.7 headPadFrames written back into assets.json (only when it changes something)
  const assetsOut = first.assets;
  if (opts.write !== false) {
    fs.writeFileSync(path.join(jobDir, "timeline.json"), stableStringify(first.timeline, 2) + "\n");
    fs.writeFileSync(path.join(jobDir, "chunks.json"), stableStringify(first.chunks, 2) + "\n");
    fs.writeFileSync(path.join(jobDir, "audio-mix.json"), stableStringify(first.audioMix, 2) + "\n");
    fs.writeFileSync(path.join(jobDir, "duckCurve.json"), JSON.stringify(first.duck) + "\n");
    fs.writeFileSync(path.join(jobDir, "credits.json"), stableStringify(first.credits, 2) + "\n");
    fs.writeFileSync(path.join(jobDir, "placement.log.jsonl"), log.toJsonl());
    if (exists(path.join(jobDir, "assets.json"))) {
      const before = fs.readFileSync(path.join(jobDir, "assets.json"), "utf8");
      const after = JSON.stringify(assetsOut, null, 2) + "\n";
      if (JSON.parse(before) && stableStringify(JSON.parse(before)) !== stableStringify(assetsOut)) fs.writeFileSync(path.join(jobDir, "assets.json"), after);
    }
    if (changedSegments) fs.writeFileSync(path.join(jobDir, "repair-changed-segments.json"), JSON.stringify(changedSegments) + "\n");
  }
  return { timeline: first.timeline, chunks: first.chunks, log, audioMix: first.audioMix, duckCurve: first.duck, credits: first.credits, assets: assetsOut, changedSegments };
}

export { BRAIN_VERSION };

function cli(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const job = get("--job");
  if (!job) { console.error("usage: tsx scripts/ts/brain/index.ts --job <id> [--repair qc-actions.json] [--packs <dir>]"); process.exit(2); }
  const jobDir = path.isAbsolute(job) || exists(path.join(job, "transcript.json")) ? path.resolve(job) : path.resolve("work", job);
  const repairPath = get("--repair");
  const repair = repairPath ? readJson<RepairAction[]>(path.resolve(repairPath)) : undefined;
  try {
    const r = runBrain(jobDir, { repair, packsDir: get("--packs") });
    const tl = r.timeline;
    const ff = tl.tracks.broll.filter((b) => b.route === "ffmpeg").length;
    console.log(`timeline.json: ${tl.durationInFrames} frames, ${tl.tracks.broll.length} shots (${ff} ffmpeg-routable), ${tl.tracks.text.length} texts, ${tl.tracks.sfx.length} sfx, ${tl.tracks.music.length} music, ${r.chunks.length} chunks`);
    for (const w of r.log.warnings) console.warn(`warn: ${w}`);
    if (r.changedSegments) console.log(`repair: segments to re-render: ${r.changedSegments.length ? r.changedSegments.join(", ") : "none"}`);
  } catch (e) {
    console.error(`brain failed: ${(e as Error).message}`);
    process.exit(1);
  }
}
if (process.argv[1] && /brain[\\/]index\.ts$/.test(process.argv[1])) cli(process.argv.slice(2));
