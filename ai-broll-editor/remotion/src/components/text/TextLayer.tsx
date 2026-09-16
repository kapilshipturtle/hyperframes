import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextItem, TextPosition, TextStyle } from "../../types";
import { BEBAS, INTER, DISPLAY, trackingEm, scaledShadow } from "../../util/fonts";
import { BRAND, SAFE, scrimGradient } from "../../util/brand";

// Entrance 360 ms, exit 200 ms (~0.55x). Exits are FASTER than entrances and do not
// reverse them — the text continues in its original direction and dissolves. Reversing
// the entrance is a template tell.
const ENTER = 11;   // ~360 ms @30fps
const EXIT = 6;     // ~200 ms @30fps
// ease-out-expo in, ease-in-expo out. Never linear: linear motion reads as robotic.
const EASE_OUT_EXPO = Easing.bezier(0.16, 1, 0.3, 1);
const EASE_IN_EXPO = Easing.bezier(0.7, 0, 0.84, 0);

/** Position -> absolute box inside the 5 % safe area. */
export const positionStyle = (pos: TextPosition): React.CSSProperties => {
  const s = `${SAFE * 100}%`;
  const base: React.CSSProperties = { position: "absolute", display: "flex", maxWidth: "62%" };
  switch (pos) {
    case "lower-left": return { ...base, left: s, bottom: s, textAlign: "left" };
    case "lower-center": return { ...base, left: "50%", bottom: s, transform: "translateX(-50%)", textAlign: "center", justifyContent: "center" };
    case "lower-right": return { ...base, right: s, bottom: s, textAlign: "right", justifyContent: "flex-end" };
    case "upper-left": return { ...base, left: s, top: s, textAlign: "left" };
    case "upper-right": return { ...base, right: s, top: s, textAlign: "right", justifyContent: "flex-end" };
    case "left-panel": return { ...base, left: s, top: "50%", transform: "translateY(-50%)", maxWidth: "38%", textAlign: "left" };
    case "right-panel": return { ...base, right: s, top: "50%", transform: "translateY(-50%)", maxWidth: "38%", textAlign: "right", justifyContent: "flex-end" };
    case "center":
    default: return { ...base, left: "50%", top: "50%", transform: "translate(-50%, -50%)", textAlign: "center", justifyContent: "center", maxWidth: "80%" };
  }
};

const isLower = (p: TextPosition) => p.startsWith("lower");
const isUpper = (p: TextPosition) => p.startsWith("upper");

/** Envelope: spring in over 8 frames, ease out over the last 6 frames of the item. */
const useEnvelope = (dur: number) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  void fps;
  // Entrance: eased 0..1 over ENTER frames.
  const enter = interpolate(f, [0, ENTER], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT_EXPO });
  // Opacity resolves faster than position (first ~45 % of the entrance), so the text is
  // readable before it finishes settling.
  const enterOpacity = interpolate(f, [0, ENTER * 0.45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT_EXPO });
  const exit = interpolate(f, [dur - EXIT, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_EXPO });
  // The exit continues UP rather than reversing the entrance.
  const exitShift = interpolate(f, [dur - EXIT, dur], [0, -0.18], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_EXPO });
  const exitBlur = interpolate(f, [dur - EXIT, dur], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_EXPO });
  // Entrance blur 4 -> 0 over the first 70 % of the entrance.
  const enterBlur = interpolate(f, [0, ENTER * 0.7], [4, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT_EXPO });
  return {
    f, enter, exit,
    opacity: Math.min(enterOpacity, exit),
    blurPx: Math.max(enterBlur, exitBlur),
    shiftEm: exitShift,
  };
};

export type TextLayerProps = { item: TextItem; overMedia?: boolean };

/** Type sizes are expressed as % of FRAME HEIGHT so they scale to 4K. Hardcoded px
 *  assumed 1080p and broke at any other canvas. */
const usePctH = () => {
  const { height } = useVideoConfig();
  return (pctH: number) => Math.round((pctH / 100) * height);
};

/** Gradient scrim (lower/upper positions) or 40 % box (everything else) whenever text sits over media. */
const ScrimFor: React.FC<{ pos: TextPosition; opacity: number }> = ({ pos, opacity }) => {
  // Four-stop eased gradient, not two. A two-stop gradient creates a Mach band — the eye
  // perceives a false edge where it ends — and that edge is the cheap-overlay tell.
  if (isLower(pos)) return <AbsoluteFill style={{ top: "30%", background: scrimGradient("bottom", 0.80), opacity }} />;
  if (isUpper(pos)) return <AbsoluteFill style={{ bottom: "30%", background: scrimGradient("top", 0.55), opacity }} />;
  return null; // panel / center styles carry their own box (see boxBg)
};
const boxBg = (pos: TextPosition, overMedia: boolean): React.CSSProperties =>
  overMedia && !isLower(pos) && !isUpper(pos) ? { background: "rgba(0,0,0,0.4)", padding: "18px 32px", borderRadius: 10 } : {};

export const TextLayer: React.FC<TextLayerProps> = ({ item, overMedia = true }) => {
  const env = useEnvelope(item.durationInFrames);
  const body = <StyledText item={item} env={env} />;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {overMedia ? <ScrimFor pos={item.position} opacity={env.opacity} /> : null}
      <div style={{ ...positionStyle(item.position), ...boxBg(item.position, overMedia), opacity: env.opacity }}>{body}</div>
    </AbsoluteFill>
  );
};

type Env = ReturnType<typeof useEnvelope>;

const WordByWord: React.FC<{ item: TextItem; render: (w: string, p: number, i: number) => React.ReactNode }> = ({ item, render }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = item.wordFrames?.length ? item.wordFrames : item.content.split(/\s+/).map((text, i) => ({ text, from: item.from + i * 4, durationInFrames: 8 }));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 0.3em", justifyContent: "inherit" }}>
      {words.map((w, i) => {
        const local = f - (w.from - item.from);
        const p = spring({ frame: local, fps, config: { damping: 14, stiffness: 220, mass: 0.6 }, durationInFrames: 12 });
        return <React.Fragment key={i}>{render(w.text, local < 0 ? 0 : p, i)}</React.Fragment>;
      })}
    </div>
  );
};

const StyledText: React.FC<{ item: TextItem; env: Env }> = ({ item, env }) => {
  const { f, enter } = env;
  const pctH = usePctH();
  const style: TextStyle = item.style;
  // ONE accented word per phrase, chosen by hash of the text — not `i % 4`, which
  // produces a visible repeating cycle across the film.
  const words = item.content.split(/\s+/);
  const accentWord = words.length > 2
    ? [...item.content].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % words.length
    : -1;
  switch (style) {
    case "kinetic-bold": {
      // Masked slide-up: the letters emerge from an invisible edge rather than simply
      // moving. The mask is what reads as broadcast; a bare slide reads as generic.
      const px = pctH(8.2);
      return (
        <div style={{ overflow: "hidden", padding: "0.06em 0" }}>
          <div style={{
            fontFamily: DISPLAY, fontWeight: 800, fontSize: px, lineHeight: 1.05,
            color: BRAND.white, textShadow: scaledShadow(px),
            letterSpacing: `${trackingEm(8.2)}em`,
            transform: `translateY(${(1 - enter) * 0.55 + env.shiftEm}em)`,
            filter: env.blurPx > 0.1 ? `blur(${env.blurPx.toFixed(2)}px)` : undefined,
          }}>
            {item.content}
          </div>
        </div>
      );
    }
    case "typewriter": {
      const chars = Math.floor(interpolate(f, [0, Math.max(1, item.durationInFrames * 0.45)], [0, item.content.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      const caret = Math.floor(f / 8) % 2 === 0;
      return (
        <div style={{ fontFamily: "ui-monospace, 'Courier New', monospace", fontSize: 58, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "16px 28px", whiteSpace: "pre" }}>
          {item.content.slice(0, chars)}<span style={{ opacity: caret ? 1 : 0 }}>▌</span>
        </div>
      );
    }
    case "highlight-marker": {
      const w = interpolate(f, [2, 14], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return (
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: pctH(5.6), letterSpacing: `${trackingEm(5.6)}em`, color: BRAND.ink, lineHeight: 1.25, backgroundImage: `linear-gradient(${BRAND.accent}, ${BRAND.accent})`, backgroundRepeat: "no-repeat", backgroundSize: `${w}% 100%`, padding: "6px 18px", display: "inline" }}>
          {item.content}
        </div>
      );
    }
    case "lower-third-name": {
      const [name, role] = item.content.split(/\s*[|\n]\s*/);
      return (
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ width: 12, background: BRAND.accent, transform: `scaleY(${enter})`, transformOrigin: "bottom" }} />
          <div style={{ padding: "14px 28px", background: "rgba(0,0,0,0.6)", clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)` }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: pctH(3.8), color: BRAND.white, letterSpacing: `${trackingEm(3.8)}em` }}>{name}</div>
            {role ? <div style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: pctH(2.2), color: BRAND.muted, letterSpacing: `${trackingEm(2.2, true)}em`, textTransform: "uppercase" }}>{role}</div> : null}
          </div>
        </div>
      );
    }
    case "big-number": {
      const num = parseFloat(item.content.replace(/[^0-9.]/g, ""));
      const prefix = item.content.match(/^[^0-9]*/)?.[0] ?? "";
      const suffix = item.content.match(/[^0-9.]*$/)?.[0] ?? "";
      const p = interpolate(f, [0, Math.max(1, Math.min(40, item.durationInFrames * 0.5))], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      const shown = Number.isFinite(num) ? (Number.isInteger(num) ? Math.round(num * p) : (num * p).toFixed(1)) : item.content;
      return (
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: pctH(17), lineHeight: 0.95, color: BRAND.white, textShadow: scaledShadow(pctH(17), 0.5), fontVariantNumeric: "tabular-nums", letterSpacing: `${trackingEm(17)}em` }}>
          <span style={{ color: BRAND.accent }}>{prefix}</span>{shown}<span style={{ color: BRAND.accent }}>{suffix}</span>
        </div>
      );
    }
    case "caption-box":
      return (
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: pctH(4.4), color: BRAND.white, background: "rgba(0,0,0,0.72)", padding: "0.38em 0.62em", borderRadius: 8, lineHeight: 1.3, letterSpacing: `${trackingEm(4.4)}em`, transform: `translateY(${(1 - enter) * 0.3 + env.shiftEm}em)` }}>
          {item.content}
        </div>
      );
    case "outline-stroke":
      return (
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: pctH(9.5), lineHeight: 1, color: "transparent", WebkitTextStroke: `${Math.max(2, Math.round(pctH(9.5) * 0.025))}px ${BRAND.white}`, letterSpacing: `${trackingEm(9.5)}em`, transform: `scale(${0.9 + 0.1 * enter})` }}>
          {item.content}
        </div>
      );
    case "gradient-fill":
      return (
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: pctH(9), lineHeight: 1, letterSpacing: `${trackingEm(9)}em`, backgroundImage: `linear-gradient(90deg, ${BRAND.accent}, #FDE68A, #F97316)`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", transform: `translateY(${(1 - enter) * 40}px)` }}>
          {item.content}
        </div>
      );
    case "slide-up-mask":
      return (
        <div style={{ overflow: "hidden", padding: "0.06em 0" }}>
          <div style={{
            fontFamily: DISPLAY, fontWeight: 700, fontSize: pctH(7.6), lineHeight: 1.1,
            color: BRAND.white, textShadow: scaledShadow(pctH(7.6)),
            letterSpacing: `${trackingEm(7.6)}em`,
            transform: `translateY(${(1 - enter) * 110}%)`,
          }}>
            {item.content}
          </div>
        </div>
      );
    case "word-by-word-pop":
    default:
      return (
        <WordByWord
          item={item}
          render={(w, p, i) => (
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: pctH(7.8), lineHeight: 1.05, letterSpacing: `${trackingEm(7.8)}em`, color: accentWord === i ? BRAND.accent : BRAND.white, textShadow: scaledShadow(pctH(7.8)), display: "inline-block", opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
              {w}
            </span>
          )}
        />
      );
  }
};
