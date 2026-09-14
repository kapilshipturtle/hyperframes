// P9 SFX scheduling (spec 11.11): anchors, MIN_GAP 45, variant rotation, gains, cap 0.5, tick trains exempt.
import type { SectionKind, SfxItem, SfxManifestEntry, SfxTag, TextItem, TransitionType } from "../types.js";
import type { Ctx, WorkShot } from "./model.js";
import { isStrong } from "./model.js";
import type { Rng } from "./rng.js";

export interface SfxCandidate {
  frame: number; tag: SfxTag; kind: "transition" | "text-in" | "grid-cell" | "tick-train" | "riser";
  priority: number; sectionKind: SectionKind; reason: string; strong: boolean; direction?: "ltr" | "rtl";
}

export const MIN_GAP = 45;
const BASE_GAIN: Record<SfxTag, number> = {
  "whoosh-soft": 0.35, "whoosh-hard": 0.35, "swoosh-short": 0.35, pop: 0.30, click: 0.25, tick: 0.12, "impact-soft": 0.4, glitch: 0.3,
  "camera-shutter": 0.3, "typewriter-key": 0.2, "riser-short": 0.3, ding: 0.3, "counter-tick-loop": 0.12,
};
const SECTION_GAIN: Record<SectionKind, number> = { hook: 1.0, explain: 0.9, story: 0.85, list: 0.95, comparison: 0.95, outro: 0.8 };
const FALLBACK_TAG: Partial<Record<SfxTag, SfxTag[]>> = {
  "whoosh-hard": ["whoosh-soft", "swoosh-short"], "swoosh-short": ["whoosh-soft", "whoosh-hard"], "whoosh-soft": ["swoosh-short", "whoosh-hard"],
  "impact-soft": ["whoosh-hard"], glitch: ["swoosh-short"], "typewriter-key": ["click", "tick"], tick: ["counter-tick-loop", "click"], "counter-tick-loop": ["tick"],
  ding: ["pop"], "camera-shutter": ["click"], "riser-short": [],
};
const TRANSITION_TAG: Partial<Record<TransitionType, SfxTag>> = {
  fade: "whoosh-soft", "luma-dissolve": "whoosh-soft", wipe: "swoosh-short", slide: "swoosh-short", "push-blur": "whoosh-soft", "zoom-punch": "whoosh-hard",
  "whip-pan": "whoosh-hard", glitch: "glitch", flip: "whoosh-soft", iris: "whoosh-soft", clockWipe: "whoosh-soft", "light-leak": "whoosh-soft", "film-burn": "whoosh-soft", shutter: "camera-shutter", pixelate: "glitch",
};

export class SfxPack {
  byTag = new Map<SfxTag, SfxManifestEntry[]>();
  lastFile = new Map<SfxTag, string>();
  constructor(entries: SfxManifestEntry[]) {
    for (const e of entries.slice().sort((a, b) => a.file.localeCompare(b.file))) { const l = this.byTag.get(e.tag) ?? []; l.push(e); this.byTag.set(e.tag, l); }
  }
  /** Rotate variants: never the same file twice in a row for a tag; prefer a matching direction when the pack has it. */
  pick(tag: SfxTag, rng: Rng, direction?: "ltr" | "rtl"): { file: string; tag: SfxTag } | null {
    const tags: SfxTag[] = [tag, ...(FALLBACK_TAG[tag] ?? [])];
    for (const t of tags) {
      let list = this.byTag.get(t);
      if (!list?.length) continue;
      const dirList = direction ? list.filter((e) => e.direction === direction) : [];
      if (dirList.length) list = dirList;
      const last = this.lastFile.get(t);
      const cands = list.length > 1 ? list.filter((e) => e.file !== last) : list;
      const e = cands[rng.int(cands.length)];
      this.lastFile.set(t, e.file);
      return { file: e.file, tag: t };
    }
    return null;
  }
}

/** Collect transition and text-in SFX candidates from the placed shots and text. */
export function sfxCandidates(ctx: Ctx, shots: WorkShot[], texts: TextItem[]): SfxCandidate[] {
  const out: SfxCandidate[] = [];
  for (const s of shots) {
    const kind = ctx.sectionById.get(s.sectionId)?.section.kind ?? "explain";
    const T = s.transitionIn.durationInFrames;
    if (s.transitionIn.type === "cut" || T === 0) continue; // hard cuts get no SFX
    const strong = s.wordIds.length > 0 && isStrong(ctx, s.wordIds[0]);
    const planTag = s.plan?.sfx?.find((t) => /whoosh|swoosh|impact|glitch|shutter/.test(t));
    let tag: SfxTag = planTag ?? TRANSITION_TAG[s.transitionIn.type] ?? "whoosh-soft";
    if (s.transitionIn.type === "zoom-punch" && strong) tag = "impact-soft"; // impact-soft only on zoom-punch cuts on strong words
    if (tag === "impact-soft" && !(s.transitionIn.type === "zoom-punch" && strong)) tag = "whoosh-hard";
    const dir = s.transitionIn.direction === "from-left" ? "ltr" : s.transitionIn.direction === "from-right" ? "rtl" : undefined;
    out.push({ frame: s.cutFrame - T, tag, kind: "transition", priority: 3, sectionKind: kind, reason: `transition-in ${s.id} (${s.transitionIn.type})`, strong, direction: dir });
  }
  for (const t of texts) {
    const s = shots.find((x) => x.beatId === t.beatId && t.from >= x.cutFrame && t.from < x.cutFrame + x.netFrames) ?? shots.find((x) => x.beatId === t.beatId);
    const kind = s ? ctx.sectionById.get(s.sectionId)?.section.kind ?? "explain" : "explain";
    const planTag = s?.plan?.sfx?.find((x) => /pop|click|ding|typewriter/.test(x));
    const tag: SfxTag = t.style === "typewriter" ? "typewriter-key" : planTag ?? "pop";
    out.push({ frame: t.from, tag, kind: "text-in", priority: 2, sectionKind: kind, reason: `text-in ${t.id}`, strong: isStrong(ctx, t.anchorWordId) });
  }
  return out;
}

export function scheduleSfx(ctx: Ctx, events: SfxCandidate[], pack: SfxPack): SfxItem[] {
  const sorted = events.slice().sort((a, b) => a.frame - b.frame || b.priority - a.priority || a.reason.localeCompare(b.reason));
  const placed: SfxItem[] = [];
  let lastNonTick: SfxItem | null = null;
  for (const e of sorted) {
    if (e.frame < 0) continue;
    const isTick = e.kind === "tick-train";
    if (!isTick && lastNonTick && e.frame - lastNonTick.from < MIN_GAP) { ctx.log.log("P9", "sfx-dropped", `${e.reason}: spacing (${e.frame - lastNonTick.from} < ${MIN_GAP} frames after ${lastNonTick.id})`); continue; }
    if (!isTick && lastNonTick && e.frame === lastNonTick.from) continue;
    const pick = pack.pick(e.tag, ctx.rngFor(`sfx:${e.reason}`), e.direction);
    if (!pick) { ctx.log.log("P9", "sfx-dropped", `${e.reason}: no ${e.tag} variant in the pack`); continue; }
    const volume = Math.min(0.5, Math.round(BASE_GAIN[pick.tag] * (e.strong ? 1.15 : 1.0) * SECTION_GAIN[e.sectionKind] * 1000) / 1000);
    const item: SfxItem = { id: `s_${String(e.frame).padStart(6, "0")}_${pick.tag}`, from: e.frame, src: pick.file, volume, tag: pick.tag, reason: e.reason };
    placed.push(item);
    if (!isTick) lastNonTick = item;
    ctx.log.log("P9", `sfx:${pick.tag}`, `${e.reason}; file ${pick.file}; gain ${volume}`, { from: e.frame });
  }
  return placed;
}
