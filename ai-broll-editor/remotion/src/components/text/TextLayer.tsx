import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { TextItem, TextPosition, TextStyle } from "../../types";
import { BEBAS, INTER, PLAYFAIR } from "../../util/fonts";
import { BRAND, SAFE } from "../../util/brand";

const ENTER = 8;
const EXIT = 6;

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
  const enter = spring({ frame: f, fps, config: { damping: 200, stiffness: 170, mass: 0.7 }, durationInFrames: ENTER });
  const exit = interpolate(f, [dur - EXIT, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  return { f, enter, exit, opacity: Math.min(enter, exit) };
};

export type TextLayerProps = { item: TextItem; overMedia?: boolean };

/** Gradient scrim (lower/upper positions) or 40 % box (everything else) whenever text sits over media. */
const ScrimFor: React.FC<{ pos: TextPosition; opacity: number }> = ({ pos, opacity }) => {
  if (isLower(pos)) return <AbsoluteFill style={{ top: "55%", background: "linear-gradient(0deg, rgba(0,0,0,0.7), rgba(0,0,0,0))", opacity }} />;
  if (isUpper(pos)) return <AbsoluteFill style={{ bottom: "60%", background: "linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0))", opacity }} />;
  return null; // panel / center styles carry their own 40 % box (see boxBg)
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
  const style: TextStyle = item.style;
  switch (style) {
    case "kinetic-bold":
      return (
        <div style={{ fontFamily: BEBAS, fontSize: 110, lineHeight: 1, color: "#fff", textShadow: "0 6px 30px rgba(0,0,0,0.5)", transform: `translateY(${(1 - enter) * 60}px) skewX(${(1 - enter) * -8}deg)`, letterSpacing: 2 }}>
          {item.content}
        </div>
      );
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
        <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 68, color: BRAND.ink, lineHeight: 1.25, backgroundImage: `linear-gradient(${BRAND.accent}, ${BRAND.accent})`, backgroundRepeat: "no-repeat", backgroundSize: `${w}% 100%`, padding: "6px 18px", display: "inline" }}>
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
            <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 46, color: "#fff" }}>{name}</div>
            {role ? <div style={{ fontFamily: INTER, fontSize: 30, color: BRAND.muted }}>{role}</div> : null}
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
        <div style={{ fontFamily: BEBAS, fontSize: 220, lineHeight: 1, color: "#fff", textShadow: "0 10px 40px rgba(0,0,0,0.55)", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: BRAND.accent }}>{prefix}</span>{shown}<span style={{ color: BRAND.accent }}>{suffix}</span>
        </div>
      );
    }
    case "caption-box":
      return (
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 44, color: "#fff", background: "rgba(0,0,0,0.72)", padding: "18px 30px", borderRadius: 8, lineHeight: 1.3, transform: `translateY(${(1 - enter) * 30}px)` }}>
          {item.content}
        </div>
      );
    case "outline-stroke":
      return (
        <div style={{ fontFamily: BEBAS, fontSize: 130, lineHeight: 1, color: "transparent", WebkitTextStroke: "3px #fff", letterSpacing: 4, transform: `scale(${0.9 + 0.1 * enter})` }}>
          {item.content}
        </div>
      );
    case "gradient-fill":
      return (
        <div style={{ fontFamily: BEBAS, fontSize: 120, lineHeight: 1, backgroundImage: `linear-gradient(90deg, ${BRAND.accent}, #FDE68A, #F97316)`, backgroundClip: "text", WebkitBackgroundClip: "text", color: "transparent", transform: `translateY(${(1 - enter) * 40}px)` }}>
          {item.content}
        </div>
      );
    case "slide-up-mask":
      return (
        <div style={{ overflow: "hidden", padding: "4px 0" }}>
          <div style={{ fontFamily: PLAYFAIR, fontWeight: 700, fontSize: 84, lineHeight: 1.1, color: "#fff", textShadow: "0 4px 20px rgba(0,0,0,0.5)", transform: `translateY(${(1 - enter) * 110}%)` }}>
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
            <span style={{ fontFamily: BEBAS, fontSize: 104, lineHeight: 1.05, color: i % 4 === 3 ? BRAND.accent : "#fff", textShadow: "0 6px 24px rgba(0,0,0,0.5)", display: "inline-block", opacity: p, transform: `scale(${0.6 + 0.4 * p})` }}>
              {w}
            </span>
          )}
        />
      );
  }
};
