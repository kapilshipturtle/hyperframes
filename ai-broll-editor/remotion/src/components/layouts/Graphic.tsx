import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BrandBg, MotionMedia, ease, safePx, type LayoutProps } from "./shared";
import { BEBAS, INTER } from "../../util/fonts";
import { BRAND } from "../../util/brand";

/** Simple stylised map outline (no network) with a pin dropping at params from cardSubtitle "x,y" in % or centre. */
export const MapPin: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [px, py] = (item.cardSubtitle ?? "52,48").split(",").map((n) => Number(n) || 50);
  const drop = spring({ frame: frame - 10, fps, config: { damping: 12, stiffness: 180, mass: 0.6 }, durationInFrames: 24 });
  const ring = ease(frame, 20, 50);
  const label = ease(frame, 22, 34);
  return (
    <BrandBg>
      {item.media[0] ? <AbsoluteFill style={{ opacity: 0.25 }}><MotionMedia item={item} /></AbsoluteFill> : null}
      <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1920" height="1080" fill="url(#grid)" />
        <path d="M 250 300 C 420 180, 700 220, 900 260 S 1300 200, 1550 330 C 1700 420, 1650 640, 1500 760 S 1150 880, 900 830 C 650 790, 480 880, 330 720 C 200 580, 150 420, 250 300 Z" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.35)" strokeWidth="3" />
        <path d="M 620 420 C 760 380, 900 460, 1010 420 S 1220 360, 1340 470" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray="14 10" />
        <circle cx={px * 19.2} cy={py * 10.8} r={12 + ring * 90} fill="none" stroke={BRAND.accent} strokeWidth="4" opacity={1 - ring} />
        <g transform={`translate(${px * 19.2}, ${py * 10.8 - (1 - drop) * 300}) scale(${0.6 + 0.4 * drop})`}>
          <path d="M 0 0 C -30 -40 -40 -60 -40 -80 A 40 40 0 1 1 40 -80 C 40 -60 30 -40 0 0 Z" fill={BRAND.accent} />
          <circle cx="0" cy="-80" r="16" fill="#0B1220" />
        </g>
      </svg>
      {item.cardTitle ? (
        <div style={{ position: "absolute", left: `${px}%`, top: `${py}%`, transform: `translate(30px, -160px)`, padding: "12px 24px", background: "rgba(0,0,0,0.7)", color: "#fff", fontFamily: INTER, fontWeight: 700, fontSize: 40, borderRadius: 10, opacity: label }}>
          {item.cardTitle}
        </div>
      ) : null}
    </BrandBg>
  );
};

/** Horizontal timeline: dots from listLines (text = label, atFrame = reveal), line draws across. */
export const TimelineStrip: React.FC<LayoutProps> = ({ item }) => {
  const frame = useCurrentFrame();
  const pts = item.listLines ?? [];
  const n = Math.max(1, pts.length);
  const draw = ease(frame, 4, 4 + Math.max(10, item.durationInFrames * 0.6));
  const x0 = safePx(1920) * 2;
  const x1 = 1920 - x0;
  return (
    <BrandBg>
      {item.media[0] ? <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "52%", overflow: "hidden", opacity: 0.9 }}><MotionMedia item={item} /></div> : null}
      {item.cardTitle ? <div style={{ position: "absolute", left: x0, top: "56%", fontFamily: BEBAS, fontSize: 64, color: "#fff" }}>{item.cardTitle}</div> : null}
      <svg viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <line x1={x0} y1={820} x2={x0 + (x1 - x0) * draw} y2={820} stroke={BRAND.accent} strokeWidth="6" />
        {pts.map((p, i) => {
          const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
          const o = ease(frame, p.atFrame, p.atFrame + 8);
          return (
            <g key={i} opacity={o}>
              <circle cx={x} cy={820} r={16 + 8 * o} fill="#fff" stroke={BRAND.accent} strokeWidth="6" />
              <text x={x} y={900} textAnchor="middle" fill="#fff" fontFamily={INTER} fontSize="36" fontWeight="600">{p.text}</text>
            </g>
          );
        })}
      </svg>
    </BrandBg>
  );
};
