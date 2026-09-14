import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBg, MotionMedia, Scrim, ease, safePx, type LayoutProps } from "./shared";
import { BEBAS, INTER, PLAYFAIR } from "../../util/fonts";
import { BRAND } from "../../util/brand";

/** Title enters frame 6, subtitle frame 14 (spring). Optional media dimmed behind. */
export const ChapterCard: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: frame - 6, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 20 });
  const s = spring({ frame: frame - 14, fps, config: { damping: 200, stiffness: 120 }, durationInFrames: 20 });
  const line = ease(frame, 8, 26);
  return (
    <BrandBg>
      {item.media[0] ? <AbsoluteFill style={{ opacity: 0.35 }}><MotionMedia item={item} /></AbsoluteFill> : null}
      <Scrim side="full" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: safePx(1920) }}>
        <div style={{ width: 160 * line, height: 6, background: BRAND.accent, marginBottom: 32 }} />
        <div style={{ fontFamily: BEBAS, fontSize: 150, lineHeight: 1, color: "#fff", opacity: t, transform: `translateY(${(1 - t) * 60}px)` }}>{item.cardTitle ?? ""}</div>
        {item.cardSubtitle ? <div style={{ fontFamily: INTER, fontSize: 40, color: BRAND.muted, marginTop: 24, opacity: s, transform: `translateY(${(1 - s) * 40}px)` }}>{item.cardSubtitle}</div> : null}
      </AbsoluteFill>
    </BrandBg>
  );
};

export const EndCard: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, 4, 20);
  const s = ease(frame, 14, 30);
  return (
    <BrandBg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", gap: 28 }}>
        <div style={{ fontFamily: BEBAS, fontSize: 120, color: "#fff", opacity: t, transform: `scale(${0.9 + 0.1 * t})` }}>{item.cardTitle ?? "Thanks for watching"}</div>
        <div style={{ fontFamily: INTER, fontSize: 40, color: BRAND.accent, opacity: s }}>{item.cardSubtitle ?? ""}</div>
        <div style={{ display: "flex", gap: 40, marginTop: 40, opacity: s }}>
          {[0, 1].map((i) => <div key={i} style={{ width: 560, height: 315, borderRadius: 16, background: "rgba(255,255,255,0.08)", border: "2px solid rgba(255,255,255,0.15)" }} />)}
        </div>
      </AbsoluteFill>
    </BrandBg>
  );
};

/** Fullscreen media with a name/role bar bottom-left. */
export const LowerThird: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const bar = ease(frame, 6, 20);
  const txt = ease(frame, 12, 24);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <MotionMedia item={item} />
      <Scrim />
      <div style={{ position: "absolute", left: safePx(1920), bottom: safePx(1080) + 40, display: "flex", alignItems: "stretch" }}>
        <div style={{ width: 14, background: BRAND.accent, transform: `scaleY(${bar})`, transformOrigin: "bottom" }} />
        <div style={{ padding: "16px 32px", background: "rgba(0,0,0,0.55)", clipPath: `inset(0 ${(1 - bar) * 100}% 0 0)` }}>
          <div style={{ fontFamily: INTER, fontWeight: 800, fontSize: 48, color: "#fff", opacity: txt }}>{item.cardTitle ?? ""}</div>
          <div style={{ fontFamily: INTER, fontSize: 30, color: BRAND.muted, opacity: txt }}>{item.cardSubtitle ?? ""}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const QuoteCard: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const q = ease(frame, 4, 22);
  const a = ease(frame, 18, 32);
  return (
    <BrandBg variant="paper">
      {item.media[0] ? <AbsoluteFill style={{ opacity: 0.12 }}><MotionMedia item={item} /></AbsoluteFill> : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${safePx(1920) * 3}px`, textAlign: "center" }}>
        <div style={{ fontFamily: PLAYFAIR, fontSize: 200, lineHeight: 0.4, color: BRAND.accent, opacity: q }}>“</div>
        <div style={{ fontFamily: PLAYFAIR, fontSize: 64, lineHeight: 1.25, color: BRAND.ink, opacity: q, transform: `translateY(${(1 - q) * 30}px)` }}>{item.quote?.text ?? item.keyPhrase ?? ""}</div>
        {item.quote?.attribution ? <div style={{ fontFamily: INTER, fontSize: 34, color: "#475569", marginTop: 36, opacity: a }}>— {item.quote.attribution}</div> : null}
      </AbsoluteFill>
    </BrandBg>
  );
};

/** Big number counting 0 -> value over countFrames (big-number style). */
export const StatCounter: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const st = item.stat ?? { value: 0, countFrames: 30 };
  const p = interpolate(frame, [4, 4 + Math.max(1, st.countFrames)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const decimals = Number.isInteger(st.value) ? 0 : 1;
  const v = (st.value * p).toFixed(decimals);
  const l = ease(frame, 10, 24);
  return (
    <BrandBg>
      {item.media[0] ? <AbsoluteFill style={{ opacity: 0.3 }}><MotionMedia item={item} /></AbsoluteFill> : null}
      <Scrim side="full" />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: BEBAS, fontSize: 320, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: BRAND.accent }}>{st.prefix ?? ""}</span>{v}<span style={{ color: BRAND.accent }}>{st.suffix ?? ""}</span>
        </div>
        {st.label ? <div style={{ fontFamily: INTER, fontSize: 44, color: BRAND.muted, opacity: l, marginTop: 10 }}>{st.label}</div> : null}
      </AbsoluteFill>
    </BrandBg>
  );
};

/** Lines revealed at their own atFrame. */
export const ListReveal: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const lines = item.listLines ?? [];
  return (
    <BrandBg>
      {item.media[0] ? <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "45%", overflow: "hidden", opacity: 0.85 }}><MotionMedia item={item} /></div> : null}
      <AbsoluteFill style={{ justifyContent: "center", padding: safePx(1920) * 1.5, width: item.media[0] ? "55%" : "100%", gap: 26 }}>
        {item.cardTitle ? <div style={{ fontFamily: BEBAS, fontSize: 84, color: "#fff", marginBottom: 20 }}>{item.cardTitle}</div> : null}
        {lines.map((l, i) => {
          const o = ease(frame, l.atFrame, l.atFrame + 10);
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 24, opacity: o, transform: `translateX(${(1 - o) * -40}px)` }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: BRAND.accent }} />
              <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 46, color: "#fff" }}>{l.text}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </BrandBg>
  );
};

/** Never-fail fallback: the key phrase, big, on brand. NEVER any image. */
export const TypographicCard: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const words = (item.keyPhrase ?? item.cardTitle ?? "").split(/\s+/).filter(Boolean);
  return (
    <BrandBg>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: `0 ${safePx(1920) * 2}px`, textAlign: "center", flexDirection: "row", flexWrap: "wrap", gap: "0 28px" }}>
        {words.map((w, i) => {
          const o = ease(frame, 4 + i * 3, 14 + i * 3);
          return <span key={i} style={{ fontFamily: BEBAS, fontSize: words.length > 6 ? 120 : 160, lineHeight: 1.05, color: i % 3 === 2 ? BRAND.accent : "#fff", opacity: o, display: "inline-block", transform: `translateY(${(1 - o) * 50}px)` }}>{w}</span>;
        })}
      </AbsoluteFill>
    </BrandBg>
  );
};
