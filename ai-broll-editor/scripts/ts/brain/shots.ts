// P4 shot assignment (spec 11.6): final layout, final asset, credits, asset reuse (I8), typographic cap (spec 22).
import type { Asset, KenBurnsAnchor, Layout, LayoutFamily, Motion, Shot, Word } from "../types.js";
import { layoutFamily, msToFrame, MAX_Y2_FRAMES, MIN_SHOT_FRAMES } from "../types.js";
import type { Ctx, Cut, WorkShot } from "./model.js";
import { keyPhrase, strongestWord } from "./emphasis.js";

const REUSE_MIN_FRAMES = 2700;   // I8: never within 2,700 frames
const REUSE_MAX_USES = 2;        // I8: max 2 uses
const SHORT_BEAT_MS = 2200;      // 11.6 rule 3
const STAT_MIN_MS = 2500;        // 11.6 rule 7
const KB_ANCHORS: KenBurnsAnchor[] = ["center", "top-left", "top", "top-right", "left", "right", "bottom-left", "bottom", "bottom-right"];

export const normWord = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
/** Is `content` a verbatim consecutive run of `words`? Returns the matching word ids or null. (I5) */
export function verbatimRun(content: string, words: Word[]): number[] | null {
  const toks = content.split(/\s+/).map(normWord).filter(Boolean);
  if (!toks.length) return null;
  const ws = words.map((w) => normWord(w.text));
  outer: for (let i = 0; i + toks.length <= ws.length; i++) {
    for (let k = 0; k < toks.length; k++) if (ws[i + k] !== toks[k]) continue outer;
    return words.slice(i, i + toks.length).map((w) => w.id);
  }
  // allow a single-token content to match inside a single word token (e.g. number with unit glued)
  if (toks.length === 1) { const i = ws.findIndex((w) => w.includes(toks[0])); if (i >= 0) return [words[i].id]; }
  return null;
}

const STAT_RE = /(\$|€|£)?(\d[\d,]*(?:\.\d+)?)\s*(%|percent|million|billion|trillion|thousand|km|kg|miles|dollars|years|hours|minutes|days|people|times|x|tons|degrees)?\b/i;
function parseStat(text: string): { value: number; prefix?: string; suffix?: string } | null {
  const m = STAT_RE.exec(text);
  if (!m) return null;
  if (!m[1] && !m[3]) return null; // rule 7: number WITH a unit or percentage
  const value = parseFloat(m[2].replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  return { value, prefix: m[1] || undefined, suffix: m[3] ? (m[3] === "percent" ? "%" : m[3]) : undefined };
}
const isQuotation = (text: string): boolean => /["“”]/.test(text) || /\b(said|wrote)\b/i.test(text);
const isCcBy = (a: Asset): boolean => /\bBY\b/i.test(a.license) || a.tier === "y1";
/** Media path for an asset used by a beat: the per-beat prepared trim from prepared/manifest.json when it exists, else the raw download.
 *  A preparedPath always belongs to ONE beat's trim, so it is never reused for another beat (borrowed/alternate assets). */
export const srcFor = (ctx: Ctx, beatId: string, a: Asset): string => {
  const m = ctx.prepared[`${beatId}:${a.assetId}`] ?? (ctx.prepared[beatId]?.assetId === a.assetId ? ctx.prepared[beatId] : undefined);
  return m?.path ?? a.localPath;
};
const mediaSrc = (a: Asset): string => a.localPath;

interface Use { uses: number; lastEnd: number }

/**
 * I8 ledger. A use reserves the whole cut span [cutFrame, endFrame] plus MERGE_MARGIN (a shot may grow by < 45 frames when a short
 * neighbour merges into it in P6, and P6 splits create continuation halves inside the span), so any later P6 edit keeps cuts >= 2,700 apart.
 */
const MERGE_MARGIN = MIN_SHOT_FRAMES;
export class AssetLedger {
  uses = new Map<string, Use>();
  y2Sources = new Set<string>();
  ok(a: Asset, cutFrame: number): boolean {
    const u = this.uses.get(a.assetId);
    if (u && (u.uses >= REUSE_MAX_USES || cutFrame - u.lastEnd < REUSE_MIN_FRAMES + MERGE_MARGIN)) return false;
    if (a.tier === "y2" && a.sourceVideoId && this.y2Sources.has(a.sourceVideoId)) return false;
    return true;
  }
  /** A continuation of the same media by the same beat extends the reserved span without counting a new use. */
  touch(a: Asset, endFrame: number): void {
    const u = this.uses.get(a.assetId) ?? { uses: 1, lastEnd: endFrame };
    this.uses.set(a.assetId, { uses: u.uses, lastEnd: Math.max(u.lastEnd, endFrame) });
  }
  take(a: Asset, endFrame: number): void {
    const u = this.uses.get(a.assetId) ?? { uses: 0, lastEnd: -Infinity };
    this.uses.set(a.assetId, { uses: u.uses + 1, lastEnd: Math.max(u.lastEnd, endFrame) });
    if (a.tier === "y2" && a.sourceVideoId) this.y2Sources.add(a.sourceVideoId);
  }
}

/** Every asset in assets.json (chosen + alternates), deduped by assetId, best score first. Used for controlled borrowing. */
function buildPool(ctx: Ctx): Asset[] {
  const m = new Map<string, Asset>();
  for (const k of Object.keys(ctx.assets).sort()) {
    const ba = ctx.assets[k];
    for (const a of [ba.chosen, ...(ba.alternates ?? [])]) if (a && mediaSrc(a) && !m.has(a.assetId)) m.set(a.assetId, a);
  }
  return [...m.values()].sort((a, b) => b.clipScore - a.clipScore || a.assetId.localeCompare(b.assetId));
}

export function assignShots(ctx: Ctx, cuts: Cut[], parts: Map<string, string[]>): WorkShot[] {
  const ledger = new AssetLedger();
  const pool = buildPool(ctx);
  const shots: WorkShot[] = [];
  const beatCount = cuts.filter((c) => c.kind === "beat" || c.kind === "split").length;
  const capCount = Math.floor(ctx.typographicCap * beatCount);
  let typographic = 0;
  let glitchLastMs = -Infinity; void glitchLastMs;

  const planFor = (beatId: string): { shot: Shot | null; sectionFallback: boolean } => {
    const ids = parts.get(beatId) ?? [beatId];
    for (const id of ids) {
      const sec = ctx.sectionById.get(ctx.beatById.get(id)?.sectionId ?? "");
      const s = sec?.planByBeat.get(id);
      if (s) return { shot: s, sectionFallback: sec?.fallback ?? false };
    }
    return { shot: null, sectionFallback: true };
  };
  const assetsFor = (beatId: string): { chosen: Asset | null; alternates: Asset[] } => {
    const ids = parts.get(beatId) ?? [beatId];
    const alts: Asset[] = [];
    let chosen: Asset | null = null;
    for (const id of ids) {
      const ba = ctx.assets[id];
      if (!ba) continue;
      if (!chosen && ba.chosen) chosen = ba.chosen;
      else if (ba.chosen) alts.push(ba.chosen);
      alts.push(...(ba.alternates ?? []));
    }
    return { chosen, alternates: alts.filter((a) => a && mediaSrc(a)) };
  };

  for (let i = 0; i < cuts.length; i++) {
    const c = cuts[i];
    const cutFrame = msToFrame(c.cutMs);
    const endFrame = msToFrame(c.endMs);
    const spanMs = c.endMs - c.cutMs;
    const sc = ctx.sectionById.get(c.sectionId)!;
    const base: WorkShot = {
      id: c.id, beatId: c.beatId, beatIds: parts.get(c.beatId) ?? [c.beatId], sectionId: c.sectionId, kind: c.kind, cutMs: c.cutMs, endMs: c.endMs, wordIds: c.wordIds,
      layout: "fullscreen-clip", asset: null, extraAssets: [], media: [], motion: { type: "none" }, credit: null, importance: 3, plan: null, overrides: [],
      transitionIn: { type: "cut", durationInFrames: 0 }, from: 0, cutFrame, durationInFrames: 0, netFrames: 0, heldMoment: c.heldMoment,
    };

    if (c.kind === "chapter-card") {
      base.layout = "chapter-card"; base.cardTitle = sc.section.title ?? `Chapter ${ctx.sections.indexOf(sc) + 1}`;
      shots.push(base); ctx.log.log("P4", "layout:chapter-card", c.reason, { beatId: c.beatId }); continue;
    }
    if (c.kind === "end-card") {
      base.layout = "end-card"; base.cardTitle = "Sources";
      shots.push(base); ctx.log.log("P4", "layout:end-card", c.reason, { beatId: c.beatId }); continue;
    }

    const { shot: plan } = planFor(c.beatId);
    base.plan = plan;
    base.importance = plan?.importance ?? 3;
    const words = c.wordIds.map((id) => ctx.wordById.get(id)!).filter(Boolean);
    const beatWords = (ctx.beatById.get(c.beatId)?.wordIds ?? c.wordIds).map((id) => ctx.wordById.get(id)!).filter(Boolean);
    const text = words.map((w) => w.text).join(" ");
    const threshold = base.importance >= 5 ? ctx.heroThreshold : ctx.clipThreshold;
    const ov = (rule: string, from: Layout, to: Layout, why: string) => { base.overrides.push(`${rule}: ${from} -> ${to} (${why})`); base.layout = to; };

    // ---- asset choice: chosen -> alternates (score desc) -> null; reuse limits I8 and Y2 one-per-source
    const { chosen, alternates } = assetsFor(c.beatId);
    const ranked = [chosen, ...alternates.slice().sort((a, b) => b.clipScore - a.clipScore || a.assetId.localeCompare(b.assetId))]
      .filter((a): a is Asset => !!a && !!mediaSrc(a));
    const prev = shots[shots.length - 1];
    let asset: Asset | null = null;
    // 11.5 held moment (split second half): alternate asset preferred, else continue the same media
    if (c.kind === "split" && prev && prev.beatId === c.beatId) {
      const alt = ranked.find((a) => a.assetId !== prev.asset?.assetId && a.clipScore >= threshold - 0.02 && ledger.ok(a, cutFrame));
      if (alt) { asset = alt; }
      else if (prev.asset) { asset = prev.asset; base.continuation = true; }
    }
    if (!asset) {
      for (const a of ranked) {
        const needScore = a === chosen ? threshold : threshold - 0.02;
        if (a.clipScore < needScore) { ctx.log.log("P4", "reject-asset", `${a.assetId} clipScore ${a.clipScore.toFixed(3)} < ${needScore.toFixed(3)}`, { beatId: c.beatId }); continue; }
        if (!ledger.ok(a, cutFrame)) { ctx.log.log("P4", "reject-asset", `${a.assetId} violates reuse limits (I8) or Y2 one-per-source`, { beatId: c.beatId }); continue; }
        if (a.tier === "y2" && a.clipScore < 0.30) { ctx.log.log("P4", "reject-asset", `${a.assetId} Y2 needs clipScore >= 0.30`, { beatId: c.beatId }); continue; }
        // prepared clip shorter than needed (+ safety): prefer an alternate; a later asset may still be chosen, else freeze
        if (a.kind === "video" && a.outMs - a.inMs < spanMs + 600 && ranked.some((b) => b !== a && b.clipScore >= threshold - 0.02 && b.kind === "video" && b.outMs - b.inMs >= spanMs + 600 && ledger.ok(b, cutFrame))) {
          ctx.log.log("P4", "reject-asset", `${a.assetId} too short (${a.outMs - a.inMs} ms for ${spanMs} ms); alternate has headroom`, { beatId: c.beatId }); continue;
        }
        asset = a; break;
      }
    }
    // spec 22: typographic cap 15 % and never two in a row -> borrow from the project pool before giving up
    if (!asset) {
      const prevTypographic = prev?.layout === "typographic-card";
      if (prevTypographic || typographic + 1 > capCount) {
        const borrowed = pool.find((a) => a.clipScore >= threshold - 0.05 && ledger.ok(a, cutFrame) && a.tier !== "y2");
        if (borrowed) { asset = borrowed; ctx.log.log("P4", "borrow-asset", `no asset for ${c.beatId}; ${prevTypographic ? "previous shot is a typographic card" : "typographic cap reached"}; borrowed ${borrowed.assetId} from the project pool`, { beatId: c.beatId }); }
      }
    }

    // ---- layout: Director preference then override rules 1..10 (ordered, logged)
    let layout: Layout = plan?.layoutPreference ?? (asset?.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip");
    base.layout = layout;
    const hasText = !!plan?.text && !!verbatimRun(plan.text.content, beatWords);
    if (plan?.text && !hasText) ctx.log.log("P4", "text-not-verbatim", `text "${plan.text.content}" is not a verbatim run of beat ${c.beatId}; dropped`, { beatId: c.beatId });

    if (!asset) {
      // rule 9: typographic card with the key phrase, never an AI image
      const kp = keyPhrase(ctx.emphasis, beatWords.length ? beatWords : words, 2, 5);
      ov("rule 9", layout, "typographic-card", "no asset passed threshold after all sources");
      base.keyPhrase = kp.text || text.split(/\s+/).slice(0, 3).join(" ") || "…";
      typographic++;
      if (prev?.layout === "typographic-card") ctx.log.warn(`spec 22: two typographic cards in a row at ${c.beatId} (no borrowable asset)`);
      if (typographic > capCount) ctx.log.warn(`spec 22: typographic cards ${typographic} exceed cap ${capCount} (${ctx.typographicCap * 100} % of ${beatCount})`);
    } else {
      base.asset = asset; base.tier = asset.tier;
      const fam = layoutFamily(layout);
      if (asset.kind === "image" && layout === "fullscreen-clip") ov("asset-kind", layout, "fullscreen-image-kenburns", "asset is an image");
      if (asset.kind === "video" && layout === "fullscreen-image-kenburns") ov("asset-kind", layout, "fullscreen-clip", "asset is a video");
      // rule 1: portrait asset on full-screen -> pip-over-blur
      if (asset.height > asset.width && layoutFamily(base.layout) === "fullscreen") ov("rule 1", base.layout, "pip-over-blur", "portrait asset");
      // rule 2: SD archival -> pip-over-blur with vintage sub-grade
      if (asset.sd && (layoutFamily(base.layout) === "fullscreen")) { ov("rule 2", base.layout, "pip-over-blur", "SD archival asset, vintage sub-grade"); base.overrides.push("grade: vintage"); }
      // rule 3: short beat -> no grids / counters / list reveals
      if (spanMs < SHORT_BEAT_MS && ["grid-2", "grid-3", "grid-4", "stat-counter", "list-reveal", "comparison-split", "timeline-strip", "quote-card"].includes(base.layout))
        ov("rule 3", base.layout, asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip", `beat ${spanMs} ms < 2.2 s`);
      // rule 7: number with unit / percentage -> stat-counter when >= 2.5 s (only from a full-screen preference)
      const stat = plan?.stat ?? parseStat(text);
      if (stat && spanMs >= STAT_MIN_MS && layoutFamily(base.layout) === "fullscreen" && !(plan?.layoutPreference && layoutFamily(plan.layoutPreference) !== "fullscreen")) {
        ov("rule 7", base.layout, "stat-counter", `number with unit in "${text.slice(0, 40)}"`);
        base.stat = { ...stat, label: plan?.stat?.label ?? (hasText ? plan!.text!.content : undefined) };
      } else if (base.layout === "stat-counter") { base.stat = stat ?? { value: 0 }; }
      // rule 8: quotation -> quote-card eligible; a quote-card preference without a quotation is not
      if (base.layout === "quote-card") {
        if (isQuotation(text) || plan?.quote) base.quote = plan?.quote ?? { text };
        else ov("rule 8", base.layout, asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip", "beat text is not a quotation");
      }
      // rule 10: Y2 -> corner credit, no grid cells, clamp 149 frames (handled by splitting in P4 below)
      if (asset.tier === "y2") {
        if (layoutFamily(base.layout) === "grid" || base.layout === "comparison-split") ov("rule 10", base.layout, "fullscreen-clip", "Y2 asset: grid cells not allowed (credit unreadable)");
        base.credit = { text: `Source: ${asset.channelTitle ?? asset.attribution ?? "YouTube"}`, corner: "bottom-right" };
      } else if (isCcBy(asset) && asset.attribution) {
        base.credit = { text: asset.attribution, corner: "bottom-right" };
      }
      // grids need N distinct assets; shrink or downgrade
      if (layoutFamily(base.layout) === "grid" || base.layout === "comparison-split") {
        const want = base.layout === "comparison-split" ? 2 : parseInt(base.layout.slice(-1), 10);
        const cells: Asset[] = [asset];
        for (const a of ranked) if (cells.length < want && !cells.some((x) => x.assetId === a.assetId) && a.clipScore >= threshold - 0.05 && ledger.ok(a, cutFrame) && a.tier !== "y2") cells.push(a);
        if (cells.length < want) {
          if (cells.length >= 2 && base.layout !== "comparison-split") ov("grid-cells", base.layout, `grid-${cells.length}` as Layout, `only ${cells.length} distinct candidates`);
          else ov("grid-cells", base.layout, asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip", `only ${cells.length} candidate(s) for ${want} cells`);
        }
        if (layoutFamily(base.layout) === "grid" || base.layout === "comparison-split") base.extraAssets = cells.slice(1);
      }
      // rule 4: text + grid -> labels or dropped
      if (layoutFamily(base.layout) === "grid") {
        const n = base.extraAssets.length + 1;
        const labels = plan?.grid?.labels?.slice(0, n) ?? [];
        if (hasText && labels.length < n) { base.gridLabels = plan!.text!.content.split(/\s+/).slice(0, n); base.overrides.push("rule 4: text becomes grid labels"); }
        else { base.gridLabels = labels.length ? labels : undefined; if (hasText) base.overrides.push("rule 4: floating text dropped on grid"); }
      }
      if (base.layout === "list-reveal") base.listLines = plan?.listLines ?? null;
      if (!base.listLines && base.layout === "list-reveal") ov("list-lines", base.layout, asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip", "no list lines");
      // rule 5: three consecutive same-family layouts -> force a different family
      const p1 = shots[shots.length - 1], p2 = shots[shots.length - 2];
      const famNow: LayoutFamily = layoutFamily(base.layout);
      if (p1 && p2 && layoutFamily(p1.layout) === famNow && layoutFamily(p2.layout) === famNow && famNow !== "card") {
        let to: Layout;
        if (famNow === "fullscreen") to = i % 2 ? "split-left-media-right-text" : "split-right-media-left-text";
        else to = asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip";
        ov("rule 5", base.layout, to, `three consecutive ${famNow} layouts`);
        if (layoutFamily(to) === "split" && !hasText) base.keyPhrase = keyPhrase(ctx.emphasis, beatWords, 2, 4).text;
        base.extraAssets = [];
      }
      // rule 6: two consecutive Ken Burns images -> clip if a video candidate scored >= threshold - 0.02, else alternate zoom direction
      if (base.layout === "fullscreen-image-kenburns" && p1?.layout === "fullscreen-image-kenburns") {
        const vid = ranked.find((a) => a.kind === "video" && a.clipScore >= threshold - 0.02 && ledger.ok(a, cutFrame));
        if (vid) { ov("rule 6", base.layout, "fullscreen-clip", `second Ken Burns in a row: video ${vid.assetId} scored >= threshold - 0.02`); base.asset = vid; base.tier = vid.tier; }
        else base.overrides.push("rule 6: alternate zoom direction (out)");
      }
      // motion
      const a2 = base.asset!;
      const planMotion: Motion | undefined = plan?.motion;
      if (base.heldMoment) base.motion = { type: "slow-zoom-out", zoom: 1.1 };
      else if (a2.kind === "image") {
        const zoomOut = base.overrides.some((o) => o.startsWith("rule 6: alternate zoom"));
        const rng = ctx.rngFor(`motion:${c.id}`);
        const zoom = planMotion?.type === "ken-burns" && planMotion.zoom ? planMotion.zoom : 1.05 + Math.round(rng.next() * 13) / 100; // 1.05..1.18
        base.motion = zoomOut ? { type: "slow-zoom-out", zoom } : { type: "ken-burns", to: planMotion?.to ?? KB_ANCHORS[rng.int(KB_ANCHORS.length)], zoom };
      } else if (planMotion && ["none", "handheld", "speed-ramp", "freeze-end", "parallax-drift", "slow-zoom-out", "ken-burns"].includes(planMotion.type)) base.motion = { ...planMotion };
      else base.motion = { type: "none" };
      if (base.motion.type === "speed-ramp" && !base.motion.playbackRate) base.motion.playbackRate = 1;
      // media list
      const cellAssets = [a2, ...base.extraAssets];
      base.media = cellAssets.map((a, k) => ({ src: srcFor(ctx, c.beatId, a), kind: a.kind, startFromFrame: 0, ...(base.gridLabels?.[k] ? { label: base.gridLabels[k] } : {}) }));
      if (base.continuation && prev) base.media[0].startFromFrame = 0; // finalised in P6 (frame domain)
      if (!base.continuation) for (const a of cellAssets) ledger.take(a, endFrame);
      else for (const a of cellAssets) ledger.touch(a, endFrame);
      if (layoutFamily(base.layout) === "split" && hasText) base.overrides.push("text in panel");
    }

    // rule 10 (duration): a Y2 shot longer than 149 frames is split on a word start; the remainder gets the next-best stock alternate
    if (base.asset?.tier === "y2" && msToFrame(c.endMs) - cutFrame > MAX_Y2_FRAMES) {
      const limitMs = c.cutMs + (MAX_Y2_FRAMES - 3) * 1000 / 30;
      const candidates = words.filter((w) => w.id !== c.wordIds[0] && w.startMs - ctx.leadMs <= limitMs && c.endMs - (w.startMs - ctx.leadMs) >= 1500 && w.startMs - ctx.leadMs - c.cutMs >= 1500);
      const stock = ranked.find((a) => a.tier !== "y2" && a.assetId !== base.asset!.assetId && a.clipScore >= threshold - 0.02 && ledger.ok(a, cutFrame));
      if (candidates.length && stock) {
        const w = candidates[candidates.length - 1];
        const splitMs = w.startMs - ctx.leadMs;
        const idx = c.wordIds.indexOf(w.id);
        base.endMs = splitMs; base.wordIds = c.wordIds.slice(0, idx);
        base.overrides.push(`rule 10: Y2 clamped to ${MAX_Y2_FRAMES} frames; remainder from ${splitMs} ms uses ${stock.assetId}`);
        shots.push(base);
        logShot(ctx, base);
        const rest: WorkShot = { ...base, id: `${c.id}-rest`, kind: "split", cutMs: splitMs, endMs: c.endMs, cutFrame: msToFrame(splitMs), wordIds: c.wordIds.slice(idx),
          asset: stock, tier: stock.tier, credit: isCcBy(stock) && stock.attribution ? { text: stock.attribution, corner: "bottom-right" } : null,
          layout: stock.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip", extraAssets: [], gridLabels: undefined, stat: undefined, quote: undefined, listLines: undefined,
          motion: stock.kind === "image" ? { type: "ken-burns", to: KB_ANCHORS[ctx.rngFor(`motion:${c.id}-rest`).int(KB_ANCHORS.length)], zoom: 1.08 } : { type: "none" },
          media: [{ src: srcFor(ctx, c.beatId, stock), kind: stock.kind, startFromFrame: 0 }], overrides: ["rule 10: remainder after Y2 clamp"], continuation: false, heldMoment: false };
        ledger.take(stock, endFrame);
        shots.push(rest); logShot(ctx, rest);
        continue;
      }
      // cannot split on a word start with a stock remainder: drop Y2 for the best stock alternate instead
      if (stock) {
        base.asset = stock; base.tier = stock.tier; base.credit = isCcBy(stock) && stock.attribution ? { text: stock.attribution, corner: "bottom-right" } : null;
        base.layout = stock.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip"; base.extraAssets = [];
        base.media = [{ src: srcFor(ctx, c.beatId, stock), kind: stock.kind, startFromFrame: 0 }];
        base.motion = stock.kind === "image" ? { type: "ken-burns", to: "center", zoom: 1.08 } : { type: "none" };
        base.overrides.push("rule 10: Y2 too long to clamp on a word start; stock alternate used");
        ledger.take(stock, endFrame);
      } else {
        ctx.log.warn(`rule 10: Y2 asset ${base.asset.assetId} on ${c.beatId} exceeds 149 frames and no stock alternate exists; P6 will clamp by splitting`);
      }
    }
    // a Director-preferred typographic-card (asset present) still needs its key phrase (rule 9 text, real words only)
    if (base.layout === "typographic-card" && !base.keyPhrase) {
      const kp = keyPhrase(ctx.emphasis, beatWords.length ? beatWords : words, 2, 5);
      base.keyPhrase = kp.text || text.split(/\s+/).slice(0, 3).join(" ");
      ctx.log.log("P4", "key-phrase", `typographic-card by Director preference; key phrase "${base.keyPhrase}"`, { beatId: c.beatId });
    }
    shots.push(base);
    logShot(ctx, base);
  }
  return shots;
}

function logShot(ctx: Ctx, s: WorkShot) {
  ctx.log.log("P4", `layout:${s.layout}`, s.asset ? `asset ${s.asset.assetId} (${s.asset.source}, ${s.asset.kind}, score ${s.asset.clipScore})` : s.keyPhrase ? `typographic card "${s.keyPhrase}"` : "card",
    { beatId: s.beatId, overrides: s.overrides.length ? s.overrides : undefined });
}

/** Ken Burns zoom peak: the fastest zoom moment coincides with the strongest word of the shot (11.4 d). Frame relative to item.from. */
export function kenBurnsPeak(ctx: Ctx, s: WorkShot): number | undefined {
  if (s.motion.type !== "ken-burns" || !s.wordIds.length) return undefined;
  const w = ctx.wordById.get(strongestWord(ctx.emphasis, s.wordIds));
  if (!w) return undefined;
  const f = msToFrame(w.startMs) - s.from;
  return Math.max(1, Math.min(s.durationInFrames - 1, f));
}

/** Rule 5 re-applied after P6 (splits/merges can create a third same-family shot): prefer split-* after full-screens, full-screen after splits/grids. */
export function enforceVariety(ctx: Ctx, shots: WorkShot[]): void {
  for (let i = 2; i < shots.length; i++) {
    const s = shots[i], p1 = shots[i - 1], p2 = shots[i - 2];
    if (!s.asset || s.layout === "typographic-card" || p1.layout === "typographic-card") continue;
    const fam = layoutFamily(s.layout);
    if (fam === "card" || layoutFamily(p1.layout) !== fam || layoutFamily(p2.layout) !== fam) continue;
    const hookShort = ctx.sectionById.get(s.sectionId)?.section.kind === "hook" && s.netFrames < 66;
    if (hookShort && !(shots[i - 3] && layoutFamily(shots[i - 3].layout) === fam)) continue;
    const from = s.layout;
    const beatWords = s.wordIds.map((id) => ctx.wordById.get(id)!).filter(Boolean);
    if (fam === "fullscreen") {
      s.layout = i % 2 ? "split-left-media-right-text" : "split-right-media-left-text";
      if (!s.plan?.text) s.keyPhrase = keyPhrase(ctx.emphasis, beatWords.length ? beatWords : ctx.beatById.get(s.beatId)!.wordIds.map((id) => ctx.wordById.get(id)!), 2, 4).text || s.asset.attribution || "";
    } else {
      s.layout = s.asset.kind === "image" ? "fullscreen-image-kenburns" : "fullscreen-clip";
      s.extraAssets = []; s.media = s.media.slice(0, 1); s.gridLabels = undefined; s.stat = undefined; s.quote = undefined;
      if (s.motion.type === "none" && s.asset.kind === "image") s.motion = { type: "ken-burns", to: "center", zoom: 1.08 };
    }
    s.overrides.push(`rule 5 (post-P6): ${from} -> ${s.layout}`);
    ctx.log.log("P6", "variety", `${s.id}: three consecutive ${fam} layouts after frame edits; ${from} -> ${s.layout}`, { beatId: s.beatId });
  }
}
