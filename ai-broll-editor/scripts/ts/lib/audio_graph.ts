// Pure builder for the spec-14 audio mix graph. No I/O; unit-tested.
import type { MusicItem, SfxItem, Timeline } from "../types.js";

export const FPS = 30;
export const SR = 48000;
export const SFX_BATCH = 60; // ffmpeg input-count comfort limit per invocation

export const framesToMs = (f: number): number => Math.round((f / FPS) * 1000);
const sec = (f: number): string => (f / FPS).toFixed(6).replace(/0+$/, "").replace(/\.$/, ".0");

export interface Stage { inputs: string[][]; filterComplex: string; outputLabel: string; kind: "sfx-stem" | "premix" }

/** The Brain's optional audio-mix.json: any subset of these overrides the timeline tracks. */
export interface AudioMixOverride { narration?: Timeline["narration"]; music?: MusicItem[]; sfx?: SfxItem[]; duckThreshold?: number; duckRatio?: number }

export interface ResolvedAudio { narration: Timeline["narration"]; music: MusicItem[]; sfx: SfxItem[]; duckThreshold: number; duckRatio: number }

export function resolveAudioTracks(t: Timeline, o: AudioMixOverride | null): ResolvedAudio {
  return {
    narration: o?.narration ?? t.narration,
    music: o?.music ?? t.tracks.music,
    sfx: o?.sfx ?? t.tracks.sfx,
    duckThreshold: o?.duckThreshold ?? 0.02,
    duckRatio: o?.duckRatio ?? 8,
  };
}

/** `[i:a]aresample=48000,adelay=ms|ms,volume=v[sK]` for one sfx item. */
export function sfxFilter(item: SfxItem, inputIndex: number, label: string): string {
  const ms = framesToMs(item.from);
  return `[${inputIndex}:a]aresample=${SR},aformat=channel_layouts=stereo,adelay=${ms}|${ms},volume=${item.volume}${label}`;
}

/** One stem per batch of <= 60 sfx: inputs are the sfx files (already resolved to paths). */
export function buildSfxStems(sfx: SfxItem[], resolve: (src: string) => string, totalFrames: number): Stage[] {
  const stages: Stage[] = [];
  for (let b = 0; b < sfx.length; b += SFX_BATCH) {
    const batch = sfx.slice(b, b + SFX_BATCH);
    const inputs = batch.map((s) => ["-i", resolve(s.src)]);
    const labels = batch.map((_, i) => `[s${i}]`);
    const filters = batch.map((s, i) => sfxFilter(s, i, labels[i]));
    const mix = batch.length === 1
      ? `${labels[0]}apad=whole_len=${Math.round((totalFrames / FPS) * SR)},atrim=end_sample=${Math.round((totalFrames / FPS) * SR)}[stem]`
      : `${labels.join("")}amix=inputs=${batch.length}:normalize=0:dropout_transition=0,apad=whole_len=${Math.round((totalFrames / FPS) * SR)},atrim=end_sample=${Math.round((totalFrames / FPS) * SR)}[stem]`;
    stages.push({ inputs, filterComplex: [...filters, mix].join(";\n"), outputLabel: "[stem]", kind: "sfx-stem" });
  }
  return stages;
}

/** Music item -> input args + filter. Handles negative `from` (starts under the previous section), loops, fades. */
export function musicFilter(m: MusicItem, inputIndex: number, label: string): string {
  const parts: string[] = [`aresample=${SR}`, "aformat=channel_layouts=stereo"];
  const durS = sec(m.durationInFrames);
  if (m.loopAtFrames && m.loopAtFrames.length) {
    // aloop repeats the first `size` samples `loop` extra times; the Brain chose loopAt on a bar boundary.
    const loopAt = m.loopAtFrames[0];
    const size = Math.round((loopAt / FPS) * SR);
    const loops = Math.max(0, Math.ceil(m.durationInFrames / loopAt) - 1);
    parts.push(`aloop=loop=${loops}:size=${size}`);
  }
  parts.push(`atrim=0:${durS}`, "asetpts=PTS-STARTPTS");
  if (m.fadeInFrames > 0) parts.push(`afade=t=in:st=0:d=${sec(m.fadeInFrames)}`);
  if (m.fadeOutFrames > 0) parts.push(`afade=t=out:st=${sec(Math.max(0, m.durationInFrames - m.fadeOutFrames))}:d=${sec(m.fadeOutFrames)}`);
  parts.push(`volume=${m.volume}`);
  if (m.from < 0) parts.push(`atrim=start=${sec(-m.from)}`, "asetpts=PTS-STARTPTS");
  else if (m.from > 0) { const ms = framesToMs(m.from); parts.push(`adelay=${ms}|${ms}`); }
  return `[${inputIndex}:a]${parts.join(",")}${label}`;
}

export function musicInput(m: MusicItem, path: string): string[] {
  const ss = m.startFromFrame ? ["-ss", sec(m.startFromFrame)] : [];
  return [...ss, "-i", path];
}

/**
 * Final pre-mix stage: narration + music (ducked with sidechaincompress driven by the voice) + sfx stems,
 * `amix normalize=0` then alimiter. Loudnorm runs afterwards (two-pass) on this stage's output.
 */
export function buildPremix(a: ResolvedAudio, resolve: (src: string) => string, stemPaths: string[], totalFrames: number): Stage {
  const inputs: string[][] = [["-i", resolve(a.narration.src)]];
  const filters: string[] = [];
  const totalSamples = Math.round((totalFrames / FPS) * SR);
  const narrDelay = a.narration.startFrame > 0 ? `adelay=${framesToMs(a.narration.startFrame)}|${framesToMs(a.narration.startFrame)},` : "";
  const hasMusic = a.music.length > 0;
  const voiceChain = `[0:a]aresample=${SR},aformat=channel_layouts=stereo,${narrDelay}apad=whole_len=${totalSamples},atrim=end_sample=${totalSamples},asetpts=PTS-STARTPTS`;
  filters.push(hasMusic ? `${voiceChain},asplit=2[voice][sc]` : `${voiceChain}[voice]`);

  const mixLabels = ["[voice]"];
  if (hasMusic) {
    const labels: string[] = [];
    a.music.forEach((m, i) => {
      const idx = inputs.length;
      inputs.push(musicInput(m, resolve(m.src)));
      const label = `[m${i}]`;
      filters.push(musicFilter(m, idx, label));
      labels.push(label);
    });
    const mall = labels.length === 1 ? labels[0] : "[mall]";
    if (labels.length > 1) filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0:duration=longest${mall}`);
    filters.push(`${mall}[sc]sidechaincompress=threshold=${a.duckThreshold}:ratio=${a.duckRatio}:attack=20:release=400[mduck]`);
    mixLabels.push("[mduck]");
  }
  stemPaths.forEach((p, i) => {
    const idx = inputs.length;
    inputs.push(["-i", p]);
    const label = `[st${i}]`;
    filters.push(`[${idx}:a]aresample=${SR},aformat=channel_layouts=stereo${label}`);
    mixLabels.push(label);
  });
  const tail = mixLabels.length === 1
    ? `${mixLabels[0]}alimiter=limit=0.95[out]`
    : `${mixLabels.join("")}amix=inputs=${mixLabels.length}:normalize=0:dropout_transition=0:duration=first,alimiter=limit=0.95[out]`;
  filters.push(tail);
  return { inputs, filterComplex: filters.join(";\n"), outputLabel: "[out]", kind: "premix" };
}

/** Parse the JSON block loudnorm prints to stderr in pass 1 (print_format=json). */
export function parseLoudnorm(stderr: string): Record<string, string> {
  const start = stderr.lastIndexOf("{");
  const end = stderr.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("loudnorm pass 1 printed no JSON stats");
  return JSON.parse(stderr.slice(start, end + 1)) as Record<string, string>;
}
