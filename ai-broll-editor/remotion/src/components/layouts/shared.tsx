import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrollItem, MediaRef } from "../../types";
import { MediaEl } from "../../util/media";
import { MotionWrap, motionPlaybackRate } from "../motion/MotionWrap";
import { BRAND, SAFE, clampBlur } from "../../util/brand";
import { BEBAS, INTER, DISPLAY } from "../../util/fonts";
import { strHash } from "../../util/hash";

export type LayoutProps = { item: BrollItem };

export const FONTS = { INTER, BEBAS, DISPLAY };
export const safePx = (dim: number): number => Math.round(dim * SAFE);

/** Media with the item's motion applied. */
export const MotionMedia: React.FC<{ item: BrollItem; media?: MediaRef; objectFit?: "cover" | "contain" }> = ({ item, media, objectFit }) => {
  const m = media ?? item.media[0];
  if (!m) return <AbsoluteFill style={{ backgroundColor: BRAND.primary }} />;
  return (
    <MotionWrap motion={item.motion} dur={item.durationInFrames} seed={strHash(item.id)}>
      <MediaEl media={m} objectFit={objectFit} playbackRate={motionPlaybackRate(item.motion)} />
    </MotionWrap>
  );
};

/** Spring 0..1 starting at `at` (frames) with a snappy default. */
export const useEnter = (at: number, config: { damping?: number; stiffness?: number; mass?: number } = {}): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 200, stiffness: 140, mass: 0.8, ...config }, durationInFrames: 18 });
};

/** Blurred, scaled copy of the media used as a background plate (blur capped, spec 13.1). */
export const BlurPlate: React.FC<{ media: MediaRef; blur?: number; brightness?: number }> = ({ media, blur = 24, brightness = 0.6 }) => (
  <AbsoluteFill style={{ overflow: "hidden" }}>
    <AbsoluteFill style={{ transform: "scale(1.15)", filter: `blur(${clampBlur(blur)}px) brightness(${brightness})` }}>
      <MediaEl media={media} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Brand background used by cards. */
export const BrandBg: React.FC<{ variant?: "dark" | "paper"; children?: React.ReactNode }> = ({ variant = "dark", children }) => (
  <AbsoluteFill
    style={{
      background: variant === "dark"
        ? `radial-gradient(ellipse at 30% 20%, #1E293B 0%, ${BRAND.primary} 60%, #070B16 100%)`
        : `linear-gradient(160deg, #FFFFFF 0%, ${BRAND.paper} 100%)`,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** Bottom scrim so text over media is always readable. */
export const Scrim: React.FC<{ side?: "bottom" | "left" | "right" | "full" }> = ({ side = "bottom" }) => {
  const bg =
    side === "bottom" ? "linear-gradient(0deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0) 100%)"
    : side === "left" ? "linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)"
    : side === "right" ? "linear-gradient(270deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)"
    : "rgba(0,0,0,0.4)";
  const style: React.CSSProperties = side === "bottom" ? { top: "45%" } : side === "left" ? { right: "40%" } : side === "right" ? { left: "40%" } : {};
  return <AbsoluteFill style={{ background: bg, ...style }} />;
};

export const ease = (f: number, a: number, b: number, out: [number, number] = [0, 1]) =>
  interpolate(f, [a, b], out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

/** Text panel content for split layouts: cardTitle/cardSubtitle or keyPhrase or listLines. */
export const PanelText: React.FC<{ item: BrollItem; align?: "left" | "right" }> = ({ item, align = "left" }) => {
  const frame = useCurrentFrame();
  const t = useEnter(4);
  const s = useEnter(12);
  const title = item.cardTitle ?? item.keyPhrase ?? item.quote?.text ?? "";
  const sub = item.cardSubtitle ?? item.quote?.attribution ?? "";
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: align === "left" ? "flex-start" : "flex-end", textAlign: align, height: "100%", padding: safePx(1920), gap: 24 }}>
      <div style={{ fontFamily: BEBAS, fontSize: 96, lineHeight: 1, color: BRAND.white, opacity: t, transform: `translateY(${(1 - t) * 40}px)` }}>{title}</div>
      {sub ? <div style={{ fontFamily: INTER, fontSize: 34, color: BRAND.muted, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>{sub}</div> : null}
      {item.listLines?.map((l, i) => {
        const o = ease(frame, l.atFrame, l.atFrame + 8);
        return <div key={i} style={{ fontFamily: INTER, fontSize: 36, color: BRAND.white, opacity: o, transform: `translateX(${(1 - o) * 30 * (align === "left" ? -1 : 1)}px)` }}>{l.text}</div>;
      })}
    </div>
  );
};
