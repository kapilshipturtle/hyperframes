import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { MotionGfxItem } from "../../types";
import { BRAND, SAFE } from "../../util/brand";
import { BEBAS, INTER } from "../../util/fonts";
import { hash01 } from "../../util/hash";

type P = Record<string, unknown>;
const num = (p: P, k: string, d: number): number => (typeof p[k] === "number" ? (p[k] as number) : d);
const str = (p: P, k: string, d: string): string => (typeof p[k] === "string" ? (p[k] as string) : d);
const eo = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

/** Renders one MotionGfxItem (already inside its Sequence, frame 0 = item.from). */
export const MotionGfx: React.FC<{ item: MotionGfxItem; absoluteFrame: number }> = ({ item, absoluteFrame }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = item.params ?? {};
  const dur = item.durationInFrames;
  const fadeOut = interpolate(f, [dur - 6, dur], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const x = num(p, "x", 50); // percent
  const y = num(p, "y", 50);
  const w = num(p, "w", 30);
  const h = num(p, "h", 20);

  switch (item.type) {
    case "stat-counter": {
      const value = num(p, "value", 0);
      const count = num(p, "countFrames", 30);
      const v = value * eo(f, 0, count);
      return (
        <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", padding: "16px 36px", background: "rgba(0,0,0,0.55)", borderRadius: 14, color: "#fff", fontFamily: BEBAS, fontSize: 140, lineHeight: 1, opacity: Math.min(eo(f, 0, 8), fadeOut), fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: BRAND.accent }}>{str(p, "prefix", "")}</span>{Number.isInteger(value) ? Math.round(v) : v.toFixed(1)}<span style={{ color: BRAND.accent }}>{str(p, "suffix", "")}</span>
          {p.label ? <div style={{ fontFamily: INTER, fontSize: 32, color: BRAND.muted }}>{String(p.label)}</div> : null}
        </div>
      );
    }
    case "progress-bar-top": {
      // Section-aware: fill = position inside [sectionStart, sectionEnd] (absolute frames).
      const s0 = num(p, "sectionStart", item.from);
      const s1 = num(p, "sectionEnd", item.from + dur);
      const fill = interpolate(absoluteFrame, [s0, Math.max(s0 + 1, s1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
      return (
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, background: "rgba(255,255,255,0.18)" }}>
          <div style={{ width: `${fill * 100}%`, height: "100%", background: BRAND.accent }} />
        </div>
      );
    }
    case "arrow-callout": {
      const draw = eo(f, 0, 12);
      const tx = num(p, "toX", x + 12), ty = num(p, "toY", y - 10);
      const label = str(p, "label", "");
      return (
        <AbsoluteFill style={{ opacity: fadeOut }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <line x1={x} y1={y} x2={x + (tx - x) * draw} y2={y + (ty - y) * draw} stroke={BRAND.accent} strokeWidth="0.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" style={{ strokeWidth: 6 }} />
            <circle cx={x + (tx - x) * draw} cy={y + (ty - y) * draw} r={0.7} fill={BRAND.accent} />
          </svg>
          {label ? <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%, 20px)", fontFamily: INTER, fontWeight: 700, fontSize: 38, color: "#fff", background: "rgba(0,0,0,0.6)", padding: "8px 18px", borderRadius: 8, opacity: eo(f, 6, 14) }}>{label}</div> : null}
        </AbsoluteFill>
      );
    }
    case "highlight-box": {
      const s = spring({ frame: f, fps, config: { damping: 16, stiffness: 200 }, durationInFrames: 14 });
      return (
        <div style={{ position: "absolute", left: `${x - w / 2}%`, top: `${y - h / 2}%`, width: `${w}%`, height: `${h}%`, border: `6px solid ${BRAND.accent}`, borderRadius: 12, boxShadow: "0 0 0 4000px rgba(0,0,0,0.35)", transform: `scale(${0.8 + 0.2 * s})`, opacity: Math.min(s, fadeOut) }} />
      );
    }
    case "circle-reveal": {
      const r = interpolate(f, [0, 14], [0, num(p, "radius", 18)], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
      return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: fadeOut }}>
          <ellipse cx={x} cy={y} rx={r} ry={r * (16 / 9)} fill="none" stroke={BRAND.accent} strokeWidth="6" vectorEffect="non-scaling-stroke" strokeDasharray="4 1.5" />
        </svg>
      );
    }
    case "underline-draw": {
      // 10-frame draw-on via stroke-dashoffset.
      const len = 1000;
      const off = interpolate(f, [0, 10], [len, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
      return (
        <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: fadeOut }}>
          <path d={`M ${(x - w / 2) * 19.2} ${y * 10.8} q ${w * 4.8} 14 ${w * 9.6} 0 t ${w * 9.6} 0`} fill="none" stroke={BRAND.accent} strokeWidth="10" strokeLinecap="round" pathLength={len} strokeDasharray={len} strokeDashoffset={off} />
        </svg>
      );
    }
    case "icon-pop": {
      const s = spring({ frame: f, fps, config: { damping: 10, stiffness: 240, mass: 0.6 }, durationInFrames: 16 });
      return (
        <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: `translate(-50%,-50%) scale(${s})`, opacity: fadeOut, width: 160, height: 160, borderRadius: 80, background: BRAND.accent, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
          <Icon name={str(p, "icon", "check")} />
        </div>
      );
    }
    case "particles-light": {
      const n = num(p, "count", 40);
      return (
        <AbsoluteFill style={{ opacity: Math.min(eo(f, 0, 20), fadeOut), pointerEvents: "none" }}>
          {Array.from({ length: n }).map((_, i) => {
            const speed = 0.2 + hash01(i, 1) * 0.5;
            const px = (hash01(i, 2) * 100 + f * speed * 0.15 * (hash01(i, 5) - 0.5)) % 100;
            const py = (100 + hash01(i, 3) * 100 - f * speed) % 100;
            const size = 3 + hash01(i, 4) * 6;
            const tw = 0.4 + 0.6 * Math.abs(Math.sin((f + i * 7) / 18));
            return <div key={i} style={{ position: "absolute", left: `${px}%`, top: `${py}%`, width: size, height: size, borderRadius: size, background: "#FFF7D6", opacity: tw, filter: "blur(1px)" }} />;
          })}
        </AbsoluteFill>
      );
    }
    case "bar-chart-mini": {
      const values = Array.isArray(p.values) ? (p.values as number[]).map((v) => Number(v) || 0) : [3, 5, 2, 7];
      const labels = Array.isArray(p.labels) ? (p.labels as string[]) : [];
      const max = Math.max(1, ...values);
      return (
        <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: 560, height: 320, background: "rgba(0,0,0,0.6)", borderRadius: 14, padding: 24, display: "flex", alignItems: "flex-end", gap: 18, opacity: Math.min(eo(f, 0, 8), fadeOut) }}>
          {values.map((v, i) => {
            const g = eo(f, 4 + i * 4, 18 + i * 4);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 8 }}>
                <div style={{ fontFamily: INTER, fontSize: 24, color: "#fff", opacity: g }}>{Math.round(v * g)}</div>
                <div style={{ width: "100%", height: `${(v / max) * 80 * g}%`, background: i === values.length - 1 ? BRAND.accent : "rgba(255,255,255,0.8)", borderRadius: 6 }} />
                {labels[i] ? <div style={{ fontFamily: INTER, fontSize: 22, color: BRAND.muted }}>{labels[i]}</div> : null}
              </div>
            );
          })}
        </div>
      );
    }
    case "checklist-tick": {
      const items = Array.isArray(p.items) ? (p.items as string[]) : [str(p, "label", "Done")];
      const stagger = num(p, "stagger", 10);
      return (
        <div style={{ position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", gap: 18, opacity: fadeOut }}>
          {items.map((t, i) => {
            const at = i * stagger;
            const s = spring({ frame: f - at, fps, config: { damping: 12, stiffness: 220 }, durationInFrames: 14 });
            const draw = eo(f, at + 2, at + 10);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, opacity: Math.min(1, s * 1.2), transform: `translateX(${(1 - s) * -30}px)` }}>
                <svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill={BRAND.accent} /><path d="M18 33 L28 43 L47 22" fill="none" stroke="#0B1220" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray={100} strokeDashoffset={100 - 100 * draw} /></svg>
                <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 44, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "8px 20px", borderRadius: 8 }}>{t}</div>
              </div>
            );
          })}
        </div>
      );
    }
    case "corner-credit":
    default: {
      // Small credit bottom-right with scrim: CC / YouTube Y2 attribution, always readable.
      const text = str(p, "text", "");
      const corner = str(p, "corner", "bottom-right");
      const side: React.CSSProperties = corner === "bottom-left" ? { left: `${SAFE * 100}%` } : { right: `${SAFE * 100}%` };
      return (
        <div style={{ position: "absolute", bottom: `${SAFE * 100}%`, ...side, padding: "8px 16px", background: "rgba(0,0,0,0.65)", borderRadius: 6, fontFamily: INTER, fontSize: 26, color: "rgba(255,255,255,0.92)", opacity: Math.min(eo(f, 0, 6), fadeOut), maxWidth: "45%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {text}
        </div>
      );
    }
  }
};

/** Inline SVG icons; no icon-library dependency. */
const Icon: React.FC<{ name: string }> = ({ name }) => {
  const common = { fill: "none", stroke: "#0B1220", strokeWidth: 7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "star": return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M50 8 L62 38 L94 40 L69 60 L77 92 L50 74 L23 92 L31 60 L6 40 L38 38 Z" /></svg>;
    case "bolt": return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M58 6 L22 56 L48 56 L42 94 L78 44 L52 44 Z" /></svg>;
    case "heart": return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M50 88 L14 52 A20 20 0 0 1 50 26 A20 20 0 0 1 86 52 Z" /></svg>;
    case "alert": return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M50 10 L92 86 L8 86 Z M50 38 V60 M50 72 V74" /></svg>;
    case "dollar": return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M50 8 V92 M70 30 C70 18 30 18 30 34 C30 52 70 48 70 66 C70 82 30 82 30 70" /></svg>;
    case "clock": return <svg width="90" height="90" viewBox="0 0 100 100"><circle {...common} cx="50" cy="50" r="40" /><path {...common} d="M50 26 V52 L68 62" /></svg>;
    case "check":
    default: return <svg width="90" height="90" viewBox="0 0 100 100"><path {...common} d="M20 52 L42 74 L82 30" /></svg>;
  }
};
