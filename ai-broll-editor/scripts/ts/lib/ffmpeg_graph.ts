// Pure filter-graph builder for FFmpeg-routed chunks (spec 13.3). No I/O, unit-tested.
import type { BrollItem, Chunk, KenBurnsAnchor } from "../types.js";
import { framesToSeconds } from "./common.js";

export const FPS = 30;
export const SIZE = "1920x1080";

export interface GraphInput { args: string[] }            // e.g. ["-ss","1.5","-t","3.2","-i","/abs/clip.mp4"]
export interface SegmentGraph {
  inputs: GraphInput[];
  filterComplex: string;
  outputLabel: string;           // "[v]"
  expectedFrames: number;        // chunk.toFrame - chunk.fromFrame + 1
  items: { id: string; frames: number; fadeFrames: number }[];
}

export const chunkFrames = (c: Chunk): number => c.toFrame - c.fromFrame + 1;

export function itemsInChunk(items: BrollItem[], c: Chunk): BrollItem[] {
  return items
    .filter((it) => it.from <= c.toFrame && it.from + it.durationInFrames - 1 >= c.fromFrame)
    .sort((a, b) => a.from - b.from);
}

/** Anchor -> zoompan x/y expressions. The crop window is pinned to the anchor so growing zoom drifts toward it. */
export function anchorXY(to: KenBurnsAnchor | undefined): { x: string; y: string } {
  const cx = "iw/2-(iw/zoom/2)", cy = "ih/2-(ih/zoom/2)";
  const fx = "iw-iw/zoom", fy = "ih-ih/zoom";
  switch (to ?? "center") {
    case "top-left": return { x: "0", y: "0" };
    case "top": return { x: cx, y: "0" };
    case "top-right": return { x: fx, y: "0" };
    case "left": return { x: "0", y: cy };
    case "right": return { x: fx, y: cy };
    case "bottom-left": return { x: "0", y: fy };
    case "bottom": return { x: cx, y: fy };
    case "bottom-right": return { x: fx, y: fy };
    default: return { x: cx, y: cy };
  }
}

/** zoompan filter for ken-burns (zoom in) or slow-zoom-out (zoom decreasing) over `frames` output frames. */
export function zoompanFilter(item: BrollItem, frames: number): string | null {
  const m = item.motion;
  if (m.type !== "ken-burns" && m.type !== "slow-zoom-out") return null;
  const zoom = Math.min(2, Math.max(1.0, m.zoom ?? 1.1));
  const delta = (zoom - 1).toFixed(4);
  const n = Math.max(1, frames - 1);
  const z = m.type === "ken-burns" ? `1+${delta}*on/${n}` : `${zoom.toFixed(4)}-${delta}*on/${n}`;
  const { x, y } = anchorXY(m.to);
  return `zoompan=z='${z}':x='${x}':y='${y}':d=1:s=${SIZE}:fps=${FPS}`;
}

const SOLID = /^solid:#?([0-9a-fA-F]{6})$/;

/** Build the ffmpeg -i args and per-stream filter for one item clamped to `frames` frames starting `skipFrames` into the item. */
export function itemStream(item: BrollItem, inputIndex: number, frames: number, skipFrames: number, resolveSrc: (src: string) => string): { input: GraphInput; filter: string } {
  const media = item.media[0];
  if (!media) throw new Error(`${item.id}: broll item has no media (layout ${item.layout} is not FFmpeg-routable without media)`);
  const dur = framesToSeconds(frames);
  const solid = SOLID.exec(media.src);
  const zp = zoompanFilter(item, frames);
  const fit = `scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1`;
  const tail = `trim=end_frame=${frames},setpts=PTS-STARTPTS,format=yuv420p`;
  if (solid) {
    return {
      input: { args: ["-f", "lavfi", "-t", dur, "-i", `color=c=0x${solid[1]}:s=${SIZE}:r=${FPS}`] },
      filter: `[${inputIndex}:v]${tail}`,
    };
  }
  const src = resolveSrc(media.src);
  if (media.kind === "image") {
    // Oversized prepared still (2560x1440): zoompan reads it directly and outputs 1920x1080; otherwise fit.
    const chain = zp ? `${zp},setsar=1` : fit;
    return {
      // A full extra second on the loop for the same reason as the video branch:
      // trim=end_frame cuts back to exactly `frames`, so the headroom costs nothing.
      input: { args: ["-loop", "1", "-framerate", String(FPS), "-t", framesToSeconds(frames + FPS), "-i", src] },
      filter: `[${inputIndex}:v]${chain},${tail}`,
    };
  }
  const startFrame = media.startFromFrame + skipFrames;
  const ss = startFrame > 0 ? ["-ss", framesToSeconds(startFrame)] : [];
  // -t reads a little extra so decoder warm-up never starves the trim.
  const readDur = framesToSeconds(frames + 6);
  const motion = zp ? `,${zp}` : "";
  // tpad MUST be able to cover a source clip that is shorter than the shot.
  //
  // `stop_duration` was the shot's own length, which silently assumed the source is at
  // least that long. A stock clip shorter than the shot therefore produced fewer than
  // `frames` frames: zoompan (d=1) passes frames through 1:1 and never extends, tpad
  // topped up only to `dur` measured from the padded stream's start, and
  // trim=end_frame then cut the stream before the following xfade's offset — ffmpeg
  // reports "Failed to configure output pad on Parsed_xfade_N" and exits 234.
  //
  // This was unreachable while shots were capped at 6 s (every prepared clip was long
  // enough). Raising the cap to 14 s for deliberate holds made it reachable.
  //
  // Padding generously is free: trim=end_frame immediately cuts back to exactly
  // `frames`, so the only cost is cloned frames that are then discarded.
  const padDur = framesToSeconds(frames + FPS); // a full extra second of headroom
  return {
    input: { args: [...ss, "-t", readDur, "-i", src] },
    filter: `[${inputIndex}:v]fps=${FPS},${fit}${motion},tpad=stop_mode=clone:stop_duration=${padDur},${tail}`,
  };
}

/**
 * ONE filter_complex for a chunk. Items tile the chunk: cuts are concatenated, fades are xfade'd.
 * A fade of T frames belongs to the ENTERING item (from = cut - T, duration = D + T), so
 *   xfade offset (seconds, in the accumulated exiting stream) = (entering.from - chunk.fromFrame) / 30
 * and the transition completes at offset + T/30 = the cut frame.
 */
export function buildSegmentGraph(chunk: Chunk, allItems: BrollItem[], gradeChain: string, resolveSrc: (src: string) => string): SegmentGraph {
  if (chunk.route !== "ffmpeg") throw new Error(`${chunk.id}: route is ${chunk.route}, not ffmpeg`);
  const items = itemsInChunk(allItems, chunk);
  if (!items.length) throw new Error(`${chunk.id}: no broll items intersect frames ${chunk.fromFrame}..${chunk.toFrame}`);
  const expectedFrames = chunkFrames(chunk);
  const inputs: GraphInput[] = [];
  const filters: string[] = [];
  const meta: SegmentGraph["items"] = [];

  let acc = "";            // label of the accumulated stream
  let accEnd = chunk.fromFrame; // absolute frame (exclusive) where the accumulated stream ends
  items.forEach((it, idx) => {
    const T = it.transitionIn.type === "cut" ? 0 : it.transitionIn.durationInFrames;
    if (T > 0 && it.transitionIn.type !== "fade") throw new Error(`${chunk.id}/${it.id}: transition "${it.transitionIn.type}" is not FFmpeg-routable (only cut|fade)`);
    const itemStart = it.from;
    const itemEnd = it.from + it.durationInFrames; // exclusive
    const clampStart = Math.max(itemStart, chunk.fromFrame);
    const clampEnd = Math.min(itemEnd, chunk.toFrame + 1);
    const frames = clampEnd - clampStart;
    if (frames <= 0) throw new Error(`${chunk.id}/${it.id}: clamps to ${frames} frames`);
    const skip = clampStart - itemStart;
    const { input, filter } = itemStream(it, inputs.length, frames, skip, resolveSrc);
    inputs.push(input);
    const label = `[s${idx}]`;
    filters.push(`${filter}${label}`);
    meta.push({ id: it.id, frames, fadeFrames: idx === 0 ? 0 : T });

    if (idx === 0) {
      if (T > 0 && itemStart >= chunk.fromFrame) throw new Error(`${chunk.id}/${it.id}: fade transition (${T}f) crosses the chunk boundary at frame ${itemStart}; the validator forbids transitions inside chunk boundaries`);
      acc = label; accEnd = clampEnd; return;
    }
    if (T > 0) {
      if (itemStart + T !== accEnd) throw new Error(`${chunk.id}/${it.id}: fade of ${T}f must start ${T} frames before the previous item ends (prev ends ${accEnd}, item starts ${itemStart})`);
      const offset = framesToSeconds(itemStart - chunk.fromFrame);
      const out = `[x${idx}]`;
      filters.push(`${acc}${label}xfade=transition=fade:duration=${framesToSeconds(T)}:offset=${offset}${out}`);
      acc = out; accEnd = clampEnd;
    } else {
      if (itemStart !== accEnd) throw new Error(`${chunk.id}/${it.id}: gap/overlap at frame ${itemStart} (previous item ends at ${accEnd})`);
      const out = `[c${idx}]`;
      filters.push(`${acc}${label}concat=n=2:v=1:a=0${out}`);
      acc = out; accEnd = clampEnd;
    }
  });
  const produced = accEnd - chunk.fromFrame;
  if (produced !== expectedFrames) throw new Error(`${chunk.id}: items produce ${produced} frames but the chunk spans ${expectedFrames} (${chunk.fromFrame}..${chunk.toFrame})`);
  filters.push(`${acc}${gradeChain},format=yuv420p[v]`);
  return { inputs, filterComplex: filters.join(";\n"), outputLabel: "[v]", expectedFrames, items: meta };
}

export function ffmpegArgs(graph: SegmentGraph, outPath: string, encoderFlags: string[]): string[] {
  return ["-y", "-hide_banner", "-loglevel", "error", "-stats",
    ...graph.inputs.flatMap((i) => i.args),
    "-filter_complex", graph.filterComplex, "-map", graph.outputLabel,
    "-frames:v", String(graph.expectedFrames), "-r", String(FPS), ...encoderFlags, outPath];
}
