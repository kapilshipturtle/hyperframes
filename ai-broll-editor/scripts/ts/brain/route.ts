// P11 routing, segments, chunking, hashing (spec 11.13).
import type { BrollItem, Chunk, Grade, MotionGfxItem, MusicItem, Route, SfxItem, TextItem } from "../types.js";
import { GRADES } from "../types.js";
import { BRAIN_VERSION } from "./model.js";
import { sha1, stableStringify } from "./rng.js";
import type { PlacementLog } from "./log.js";

const FFMPEG_LAYOUTS = new Set(["fullscreen-clip", "fullscreen-image-kenburns"]);
const FFMPEG_TRANSITIONS = new Set(["cut", "fade"]);
const FFMPEG_MOTION = new Set(["none", "ken-burns", "slow-zoom-out"]);
const FFMPEG_GRADES = new Set<Grade>(GRADES); // every grade in 16.5 has an FFmpeg pair
export const MAX_REMOTION_CHUNK = 4000;
/** Max xfade transitions chained into one FFmpeg filter_complex.
 *
 *  Each xfade consumes T frames of overlap, so a long chain leaves the accumulated
 *  stream shorter than the next xfade's offset and ffmpeg fails with
 *  "Failed to configure output pad on Parsed_xfade_N". This was latent while only ~22 %
 *  of shots routed to FFmpeg (longest chain 3 items); raising that to ~68 % produced an
 *  8-item chain and exposed it. Splitting at a hard cut costs one extra concat and
 *  never breaks a transition. */
export const MAX_FFMPEG_XFADES = 2;

/** Route each broll item; the previous item's route matters for fade (both shots must be FFmpeg-routable, 11.7). */
export function routeItems(items: BrollItem[], texts: TextItem[], gfx: MotionGfxItem[], log: PlacementLog): void {
  const textBeats = new Set(texts.map((t) => t.beatId));
  const gfxBeats = new Set(gfx.map((g) => g.beatId));
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const why: string[] = [];
    if (!FFMPEG_LAYOUTS.has(it.layout)) why.push(`layout ${it.layout}`);
    if (textBeats.has(it.beatId) && texts.some((t) => t.beatId === it.beatId && t.from >= it.from && t.from < it.from + it.durationInFrames)) why.push("text");
    if (gfxBeats.has(it.beatId) && gfx.some((g) => g.beatId === it.beatId && g.from < it.from + it.durationInFrames && g.from + g.durationInFrames > it.from)) why.push("motiongfx");
    if (!FFMPEG_TRANSITIONS.has(it.transitionIn.type)) why.push(`transition ${it.transitionIn.type}`);
    if (!FFMPEG_MOTION.has(it.motion.type)) why.push(`motion ${it.motion.type}`);
    if (it.grade && !FFMPEG_GRADES.has(it.grade)) why.push(`grade ${it.grade}`);
    if (it.tier === "y2") why.push("Y2 credit overlay");
    if (it.credit) why.push("corner credit");
    if (it.transitionIn.type === "fade" && i > 0 && items[i - 1].route !== "ffmpeg") why.push("fade over a Remotion shot");
    it.route = why.length ? "remotion" : "ffmpeg";
    log.log("P11", `route:${it.route}`, why.length ? why.join(", ") : "plain full-screen shot with cut/fade", { beatId: it.beatId, from: it.from, durationInFrames: it.durationInFrames });
  }
}

export interface Segment { id: string; route: Route; fromFrame: number; toFrame: number }

/** Consecutive same-route items merge; Remotion segments absorb their head transition and snap backwards to a multiple of 30. */
export function buildSegments(items: BrollItem[], totalFrames: number): Segment[] {
  const segs: Segment[] = [];
  for (const it of items) {
    const cutFrame = it.from + it.transitionIn.durationInFrames;
    const last = segs[segs.length - 1];
    if (last && last.route === it.route) continue; // extends the current segment
    let start = it.route === "remotion" ? it.from : cutFrame; // a Remotion segment absorbs the transition frames at its head
    if (!last) start = 0;
    else {
      if (it.route === "remotion" && last.route === "ffmpeg") {
        const snapped = Math.floor(start / 30) * 30;
        if (start - snapped <= 29 && snapped > last.fromFrame) start = snapped; // extend backwards up to 29 frames
      }
      last.toFrame = start - 1;
    }
    segs.push({ id: "", route: it.route, fromFrame: start, toFrame: totalFrames - 1 });
  }
  if (segs.length) segs[segs.length - 1].toFrame = totalFrames - 1;
  return segs.filter((s) => s.toFrame >= s.fromFrame);
}

/** Split Remotion segments longer than 4,000 frames at multiples of 30, then number everything. */
export function chunkSegments(segs: Segment[], items: BrollItem[] = []): Segment[] {
  const out: Segment[] = [];
  // a chunk boundary must not fall inside a transition window (validator rule 12.5)
  const insideTransition = (b: number) => items.some((it) => it.transitionIn.durationInFrames > 0 && b > it.from && b < it.from + it.transitionIn.durationInFrames);
  for (const s of segs) {
    const len = s.toFrame - s.fromFrame + 1;
    if (s.route === "ffmpeg") {
      // Split a long FFmpeg run so no filter_complex chains more than
      // MAX_FFMPEG_XFADES transitions. Boundaries land on HARD CUTS only.
      const inSeg = items.filter((it) => {
        const cut = it.from + it.transitionIn.durationInFrames;
        return cut >= s.fromFrame && cut <= s.toFrame;
      });
      let fades = 0;
      let from = s.fromFrame;
      let emitted = false;
      for (let i = 1; i < inSeg.length; i++) {
        const it = inSeg[i];
        const isFade = it.transitionIn.type !== "cut" && it.transitionIn.durationInFrames > 0;
        if (isFade) { fades++; continue; }
        if (fades >= MAX_FFMPEG_XFADES) {
          const cut = it.from + it.transitionIn.durationInFrames;
          out.push({ id: "", route: "ffmpeg", fromFrame: from, toFrame: cut - 1 });
          from = cut; fades = 0; emitted = true;
        }
      }
      if (emitted) { out.push({ id: "", route: "ffmpeg", fromFrame: from, toFrame: s.toFrame }); continue; }
    }
    if (s.route === "remotion" && len > MAX_REMOTION_CHUNK) {
      const parts = Math.ceil(len / MAX_REMOTION_CHUNK);
      const step = Math.floor(len / parts / 30) * 30 || Math.floor(len / parts);
      let f = s.fromFrame;
      for (let p = 0; p < parts; p++) {
        let to = p === parts - 1 ? s.toFrame : Math.min(s.toFrame, f + step - 1);
        let tries = 0;
        while (to < s.toFrame && insideTransition(to + 1) && tries++ < 10) to -= 30;
        if (to < f) to = Math.min(s.toFrame, f + step - 1);
        out.push({ id: "", route: s.route, fromFrame: f, toFrame: to });
        f = to + 1;
        if (f > s.toFrame) break;
      }
      if (f <= s.toFrame) out[out.length - 1].toFrame = s.toFrame;
    } else out.push({ ...s });
  }
  out.forEach((s, i) => { s.id = `seg_${String(i + 1).padStart(4, "0")}`; });
  return out;
}

export function hashChunks(segs: Segment[], tl: { broll: BrollItem[]; text: TextItem[]; motiongfx: MotionGfxItem[]; sfx: SfxItem[]; music: MusicItem[] }, grade: Grade): Chunk[] {
  const inter = (from: number, dur: number, s: Segment) => from <= s.toFrame && from + dur - 1 >= s.fromFrame;
  return segs.map((s) => {
    const broll = tl.broll.filter((b) => inter(b.from, b.durationInFrames, s));
    const payload = {
      broll, text: tl.text.filter((t) => inter(t.from, t.durationInFrames, s)), motiongfx: tl.motiongfx.filter((g) => inter(g.from, g.durationInFrames, s)),
      sfx: tl.sfx.filter((x) => inter(x.from, 1, s)), music: tl.music.filter((m) => inter(m.from, m.durationInFrames, s)),
      version: BRAIN_VERSION, grade, fromFrame: s.fromFrame, toFrame: s.toFrame,
    };
    return { id: s.id, route: s.route, fromFrame: s.fromFrame, toFrame: s.toFrame, hash: sha1(stableStringify(payload)), brollIds: broll.map((b) => b.id) };
  });
}

/** Assign each item the segment containing its cut frame (a Remotion item's head lives in the same segment by construction). */
export function assignSegmentIds(items: BrollItem[], chunks: Chunk[]): void {
  for (const it of items) {
    const cutFrame = it.from + it.transitionIn.durationInFrames;
    const c = chunks.find((x) => cutFrame >= x.fromFrame && cutFrame <= x.toFrame) ?? chunks[chunks.length - 1];
    it.segmentId = c.id;
  }
}
