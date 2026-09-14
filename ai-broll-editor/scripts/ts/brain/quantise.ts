// P6 frame quantisation and drift proof (spec 11.8). msToFrame from types.ts is the ONLY ms -> frame conversion.
import { msToFrame, MIN_SHOT_FRAMES, MAX_SHOT_FRAMES, MAX_Y2_FRAMES } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { srcFor, kenBurnsPeak } from "./shots.js";

export interface ShotFrames { beatId: string; from: number; durationInFrames: number }
export interface CutLike { beatId: string; cutMs: number }

/** Pure form of spec 11.8 quantise (no bounds enforcement): starts by msToFrame, durations by subtraction. */
export function quantiseCuts(cuts: CutLike[], durationMs: number): ShotFrames[] {
  const total = msToFrame(durationMs);
  const starts = cuts.map((c) => msToFrame(c.cutMs));
  if (starts.length) starts[0] = 0;
  const out: ShotFrames[] = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : total;
    out.push({ beatId: cuts[i].beatId, from, durationInFrames: to - from }); // subtraction guarantees contiguity
  }
  return out;
}

/** Pure enforceBounds on plain frame shots (merge < min into the shorter neighbour, split > max at the midpoint). Used by tests. */
export function enforceBounds(shots: ShotFrames[], min = MIN_SHOT_FRAMES, max = MAX_SHOT_FRAMES): ShotFrames[] {
  const s = shots.map((x) => ({ ...x }));
  let guard = 0;
  while (guard++ < 10_000) {
    const shortIdx = s.findIndex((x) => x.durationInFrames < min);
    if (shortIdx >= 0 && s.length > 1) {
      const prev = s[shortIdx - 1], next = s[shortIdx + 1];
      const intoPrev = prev && (!next || prev.durationInFrames <= next.durationInFrames);
      if (intoPrev) { prev.durationInFrames += s[shortIdx].durationInFrames; s.splice(shortIdx, 1); }
      else { const cur = s[shortIdx]; cur.durationInFrames += next.durationInFrames; s.splice(shortIdx + 1, 1); } // earlier shot keeps its asset
      continue;
    }
    const longIdx = s.findIndex((x) => x.durationInFrames > max);
    if (longIdx >= 0) {
      const cur = s[longIdx];
      const half = Math.floor(cur.durationInFrames / 2);
      const second = { beatId: cur.beatId, from: cur.from + half, durationInFrames: cur.durationInFrames - half };
      cur.durationInFrames = half;
      s.splice(longIdx + 1, 0, second);
      continue;
    }
    break;
  }
  return s;
}

/** Recompute cutFrame/net after edits, keeping contiguity by subtraction. */
function relink(shots: WorkShot[], total: number) {
  for (let i = 0; i < shots.length; i++) {
    const to = i + 1 < shots.length ? shots[i + 1].cutFrame : total;
    shots[i].netFrames = to - shots[i].cutFrame;
  }
}

/** I8 on the working set: an asset may be used by at most 2 beats; a new use [from, to] must stay 2,700 (+ merge margin) frames clear of other beats' spans. */
function reuseOk(shots: WorkShot[], assetId: string, from: number, to: number, beatId: string): boolean {
  const beats = new Set<string>();
  for (const s of shots) for (const a of [s.asset, ...s.extraAssets]) if (a?.assetId === assetId) {
    beats.add(s.beatId);
    if (s.beatId === beatId) continue;
    const gap = Math.max(s.cutFrame - to, from - (s.cutFrame + s.netFrames));
    if (gap < 2700 + MIN_SHOT_FRAMES) return false;
  }
  return beats.size < 2 || beats.has(beatId);
}

function maxFor(s: WorkShot): number { return s.asset?.tier === "y2" ? MAX_Y2_FRAMES - s.transitionIn.durationInFrames : MAX_SHOT_FRAMES; }

/** P6 on WorkShots: quantise, enforce 45..180 (Y2 45..149), set from/durationInFrames, freeze frames, Ken Burns peaks. */
export function quantiseShots(ctx: Ctx, shots: WorkShot[]): WorkShot[] {
  const total = ctx.totalFrames;
  for (const s of shots) s.cutFrame = msToFrame(s.cutMs);
  if (shots.length) shots[0].cutFrame = 0;
  relink(shots, total);

  let guard = 0;
  while (guard++ < 10_000) {
    // merge: a shot under 45 merges into the shorter neighbour; the merged shot keeps the earlier shot's asset; the later transition is dropped
    const si = shots.findIndex((x) => x.netFrames < MIN_SHOT_FRAMES);
    if (si >= 0 && shots.length > 1) {
      const prev = shots[si - 1], next = shots[si + 1];
      const intoPrev = !!prev && (!next || prev.netFrames <= next.netFrames);
      const earlier = intoPrev ? prev : shots[si];
      const later = intoPrev ? shots[si] : next!;
      ctx.log.log("P6", "merge-short", `${later.id} (${later.netFrames} f) merged into ${earlier.id}; earlier asset kept, transition ${later.transitionIn.type} dropped`, { beatId: later.beatId });
      earlier.wordIds = [...earlier.wordIds, ...later.wordIds];
      for (const b of later.beatIds) if (!earlier.beatIds.includes(b)) earlier.beatIds.push(b);
      earlier.endMs = later.endMs;
      if (earlier.importance < later.importance) earlier.importance = later.importance;
      shots.splice(shots.indexOf(later), 1);
      relink(shots, total);
      continue;
    }
    // split: a shot over 180 (Y2 149) splits at the strongest word start inside it minus 3 frames; second half uses the alternate asset
    const li = shots.findIndex((x) => x.netFrames > maxFor(x));
    if (li >= 0) {
      const cur = shots[li];
      const lim = maxFor(cur);
      const end = cur.cutFrame + cur.netFrames;
      // candidates: word starts strictly inside, leaving both halves within [45, lim]
      const cands = cur.wordIds.slice(1).map((id) => ({ id, f: msToFrame(ctx.wordById.get(id)!.startMs) - 3 }))
        .filter((c) => c.f - cur.cutFrame >= MIN_SHOT_FRAMES && end - c.f >= MIN_SHOT_FRAMES && c.f - cur.cutFrame <= lim);
      let splitFrame: number; let why: string;
      if (cands.length) {
        let best = cands[0], bv = -Infinity;
        for (const c of cands) { const v = ctx.emphasis.get(c.id) ?? 0; if (v > bv) { bv = v; best = c; } }
        splitFrame = best.f; why = `strongest word #${best.id} start minus 3 frames`;
      } else {
        // no usable word start (pause-dominated shot or card): split at the largest internal pause end, else the midpoint
        let bestGap = 0, gapFrame = -1;
        for (let k = 0; k + 1 < cur.wordIds.length; k++) {
          const a = ctx.wordById.get(cur.wordIds[k])!, b = ctx.wordById.get(cur.wordIds[k + 1])!;
          const f = msToFrame(b.startMs) - 3;
          if (b.startMs - a.endMs > bestGap && f - cur.cutFrame >= MIN_SHOT_FRAMES && end - f >= MIN_SHOT_FRAMES && f - cur.cutFrame <= lim) { bestGap = b.startMs - a.endMs; gapFrame = f; }
        }
        if (gapFrame > 0) { splitFrame = gapFrame; why = `largest internal pause (${bestGap} ms) end minus 3 frames`; }
        else { splitFrame = cur.cutFrame + Math.min(lim, Math.max(MIN_SHOT_FRAMES, Math.floor(cur.netFrames / 2))); why = "no word start inside: midpoint (held moment)"; }
      }
      const idx = cur.wordIds.findIndex((id) => msToFrame(ctx.wordById.get(id)!.startMs) - 3 >= splitFrame);
      const secondWords = idx >= 0 ? cur.wordIds.slice(idx) : [];
      if (idx >= 0) cur.wordIds = cur.wordIds.slice(0, idx);
      const second: WorkShot = { ...cur, id: `${cur.id}-b`, kind: "split", cutFrame: splitFrame, cutMs: cur.cutMs + (splitFrame - cur.cutFrame) * 1000 / 30, wordIds: secondWords,
        transitionIn: { type: "cut", durationInFrames: 0 }, overrides: [...cur.overrides, `P6 split: ${why}`], stat: undefined, listLines: cur.listLines, media: cur.media.map((m) => ({ ...m })) };
      // second half: the beat's alternate asset when it exists and is not the same asset, else continue the same media as a held moment
      const alt = cur.beatIds.flatMap((b) => ctx.assets[b]?.alternates ?? []).find((a) => a && (a.preparedPath ?? a.localPath) && a.assetId !== cur.asset?.assetId && a.tier !== "y2" && a.clipScore >= ctx.clipThreshold - 0.02 && reuseOk(shots, a.assetId, splitFrame, end, cur.beatId));
      if (cur.asset && alt) {
        second.asset = alt; second.tier = alt.tier; second.continuation = false; second.extraAssets = [];
        second.layout = alt.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip";
        second.media = [{ src: srcFor(ctx, cur.beatId, alt), kind: alt.kind, startFromFrame: 0 }];
        second.motion = alt.kind === "image" ? { type: "ken-burns", to: "center", zoom: 1.08 } : { type: "none" };
        second.credit = /\bBY\b/i.test(alt.license) && alt.attribution ? { text: alt.attribution, corner: "bottom-right" } : null;
        second.gridLabels = undefined; second.quote = undefined;
      } else {
        second.continuation = true; second.heldMoment = true;
        if (cur.asset) second.motion = { type: "slow-zoom-out", zoom: 1.1 };
      }
      shots.splice(li + 1, 0, second);
      relink(shots, total);
      ctx.log.log("P6", "split-long", `${cur.id} (${end - cur.cutFrame} f > ${lim}) split at frame ${splitFrame}: ${why}; second half ${second.continuation ? "continues the same media" : `uses ${second.asset!.assetId}`}`, { beatId: cur.beatId, from: splitFrame });
      continue;
    }
    break;
  }

  // transition re-check after frame edits (11.7): entering shot under 1.8 s -> cut; overlap must fit in the previous shot
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    if (i === 0) { s.transitionIn = { type: "cut", durationInFrames: 0 }; continue; }
    if (s.transitionIn.type !== "cut" && (s.netFrames < 54 || shots[i - 1].netFrames < s.transitionIn.durationInFrames + 1)) {
      ctx.log.log("P6", "transition-forced-cut", `${s.id}: ${s.netFrames} frames after bounds enforcement`, { beatId: s.beatId });
      s.transitionIn = { type: "cut", durationInFrames: 0 };
    }
  }
  // finalise: ownership (11.7) from = cutFrame - T, duration = D + T
  for (let i = 0; i < shots.length; i++) {
    const s = shots[i];
    const T = s.transitionIn.durationInFrames;
    s.from = s.cutFrame - T;
    s.durationInFrames = s.netFrames + T;
    if (s.continuation && i > 0) {
      const prev = shots[i - 1];
      const prevStart = prev.media[0]?.startFromFrame ?? 0;
      for (const m of s.media) m.startFromFrame = prevStart + prev.durationInFrames; // media frame reached at our cut (prev.from + prev.duration == our cutFrame)
    }
    // freeze last frame when the prepared clip is shorter than needed (spec 9: never loop)
    for (let k = 0; k < s.media.length; k++) {
      const m = s.media[k];
      const a = k === 0 ? s.asset : s.extraAssets[k - 1];
      if (m.kind === "video" && a) {
        const clipFrames = msToFrame(a.outMs - a.inMs);
        const needed = m.startFromFrame + s.durationInFrames;
        if (clipFrames > 0 && clipFrames < needed) {
          m.freezeAfterFrame = Math.max(0, clipFrames - 1 - m.startFromFrame);
          ctx.log.log("P6", "freeze-end", `${s.id}: clip ${a.assetId} has ${clipFrames} frames, needs ${needed}; freezing after frame ${m.freezeAfterFrame}`, { beatId: s.beatId });
        }
      }
    }
    // 11.7 head padding: the entering media needs T extra frames at its head
    if (T > 0 && s.asset && s.media[0]) s.asset.headPadFrames = T;
    const peak = kenBurnsPeak(ctx, s);
    if (peak !== undefined) s.motion = { ...s.motion, peakFrame: peak };
    ctx.log.log("P6", "frames", `cut ${s.cutFrame}, net ${s.netFrames}, transition ${T}`, { beatId: s.beatId, from: s.from, durationInFrames: s.durationInFrames });
  }
  // drift proof
  const sum = shots.reduce((a, s) => a + s.netFrames, 0);
  if (sum !== total) throw new Error(`drift: net frames ${sum} != total ${total}`);
  for (let i = 1; i < shots.length; i++) if (shots[i].cutFrame !== shots[i - 1].cutFrame + shots[i - 1].netFrames) throw new Error(`gap/overlap at ${shots[i].id}`);
  return shots;
}
