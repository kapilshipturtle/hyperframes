// P10 music layout and ducking (spec 11.12).
import type { Mood, MusicItem, MusicManifestEntry, MusicTag } from "../types.js";
import { msToFrame } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";

const BASE_VOLUME: Record<Mood, number> = { energetic: 0.16, tech: 0.14, documentary: 0.12, dramatic: 0.12, calm: 0.10 };
const PRE_ROLL = 30, FADE_IN = 30, FADE_OUT = 45, OVERLAP = 60;
const DUCK_FACTOR = 0.45, SPEECH_DB = -40, ATTACK = 12, RELEASE = 24;
const RISER_CAP = 0.08;

export function layoutMusic(ctx: Ctx, shots: WorkShot[]): MusicItem[] {
  if (!ctx.job.music) return [];
  const pack = ctx.musicPack;
  if (!pack.length) { ctx.log.warn("music pack manifest missing or empty: music track left empty"); return []; }
  // section start frames from the first shot of each section
  const secStart = new Map<string, number>();
  for (const s of shots) if (!secStart.has(s.sectionId)) secStart.set(s.sectionId, s.cutFrame);
  const order = ctx.sections.filter((sc) => secStart.has(sc.section.id));
  // runs of consecutive sections sharing a musicTag continue the same track (no restart)
  type Run = { tag: MusicTag; mood: Mood; sectionIds: string[]; from: number; to: number };
  const runs: Run[] = [];
  for (let i = 0; i < order.length; i++) {
    const sc = order[i];
    const start = secStart.get(sc.section.id)!;
    const last = runs[runs.length - 1];
    if (last && last.tag === sc.musicTag) { last.sectionIds.push(sc.section.id); continue; }
    if (last) last.to = start;
    runs.push({ tag: sc.musicTag, mood: sc.mood, sectionIds: [sc.section.id], from: start, to: ctx.totalFrames });
  }
  const items: MusicItem[] = [];
  runs.forEach((r, i) => {
    let cands = pack.filter((e) => e.mood === r.tag);
    if (!cands.length) { ctx.log.warn(`no music track tagged ${r.tag}; using any track`); cands = pack.slice(); }
    const track: MusicManifestEntry = cands.slice().sort((a, b) => a.file.localeCompare(b.file))[ctx.rngFor(`music:${r.tag}:${i}`).int(cands.length)];
    const from = Math.max(0, r.from - PRE_ROLL);
    const end = i + 1 < runs.length ? Math.min(ctx.totalFrames, r.to + OVERLAP - PRE_ROLL) : ctx.totalFrames; // 60 frame crossfade with the next track
    const durationInFrames = end - from;
    const volume = BASE_VOLUME[r.mood] ?? 0.12;
    const item: MusicItem = { id: `m_${r.sectionIds[0]}_${r.tag}`, from, durationInFrames, src: track.file, volume, fadeInFrames: FADE_IN, fadeOutFrames: FADE_OUT, sectionIds: r.sectionIds, tag: r.tag };
    // loop at a bar boundary when the track is shorter than the run; 2 frame crossfade is the renderer's job, never a hard restart
    const trackFrames = msToFrame(track.durationMs);
    if (trackFrames > 0 && trackFrames < durationInFrames) {
      const barFrames = Math.max(1, msToFrame((4 * 60_000) / Math.max(1, track.bpm)));
      const loopLen = Math.max(barFrames, Math.floor(trackFrames / barFrames) * barFrames);
      const pts: number[] = [];
      for (let f = loopLen; f < durationInFrames; f += loopLen) pts.push(f);
      item.loopAtFrames = pts;
    }
    items.push(item);
    ctx.log.log("P10", "music", `${r.tag} -> ${track.file} for ${r.sectionIds.join(",")} at ${volume}${item.loopAtFrames ? `; loops at bar boundaries x${item.loopAtFrames.length}` : ""}`, { from, durationInFrames });
  });
  return items;
}

/** Parse ffmpeg ametadata output (rms50ms.txt) into 50 ms bins of RMS dBFS. */
export function parseRms(text: string): number[] {
  const bins: { t: number; v: number }[] = [];
  let t = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = /pts_time:([\d.]+)/.exec(line);
    if (m) { t = parseFloat(m[1]); continue; }
    const r = /RMS_level=(-?[\d.]+|-inf)/.exec(line);
    if (r) bins.push({ t, v: r[1] === "-inf" ? -120 : parseFloat(r[1]) });
  }
  if (!bins.length) {
    // plain one-number-per-line fallback
    return text.split(/\r?\n/).map((l) => parseFloat(l)).filter((v) => Number.isFinite(v));
  }
  const out: number[] = [];
  for (const b of bins) { const idx = Math.round(b.t / 0.05); while (out.length < idx) out.push(out.length ? out[out.length - 1] : -120); out.push(b.v); }
  return out;
}

/** duck[f] = speech(f) ? base * 0.45 : base, smoothed with 12 frame attack / 24 frame release; 0 where no music plays. */
export function duckCurve(ctx: Ctx, music: MusicItem[], shots: WorkShot[], sfxRiserCards: Set<string>): number[] {
  const total = ctx.totalFrames;
  const base = new Array<number>(total).fill(0);
  for (const m of music) for (let f = m.from; f < Math.min(total, m.from + m.durationInFrames); f++) base[f] = Math.max(base[f], m.volume);
  const bins = ctx.rmsBins;
  const speech = (f: number): boolean => {
    if (!bins) return false;
    const idx = Math.min(bins.length - 1, Math.floor((f / 30) / 0.05));
    return idx >= 0 && bins[idx] > SPEECH_DB;
  };
  const target = new Array<number>(total);
  for (let f = 0; f < total; f++) target[f] = speech(f) ? DUCK_FACTOR : 1;
  // smoothing: ramp down over ATTACK frames, up over RELEASE frames
  const sm = new Array<number>(total);
  let cur = 1;
  for (let f = 0; f < total; f++) {
    const t = target[f];
    if (t < cur) cur = Math.max(t, cur - (1 - DUCK_FACTOR) / ATTACK);
    else if (t > cur) cur = Math.min(t, cur + (1 - DUCK_FACTOR) / RELEASE);
    sm[f] = cur;
  }
  const out = new Array<number>(total);
  for (let f = 0; f < total; f++) out[f] = Math.round(base[f] * sm[f] * 10000) / 10000;
  // music never above 0.08 over a chapter-card riser
  for (const s of shots) if (s.kind === "chapter-card" && sfxRiserCards.has(s.id)) for (let f = Math.max(0, s.cutFrame - 45); f < Math.min(total, s.cutFrame + s.netFrames); f++) out[f] = Math.min(out[f], RISER_CAP);
  return out;
}
