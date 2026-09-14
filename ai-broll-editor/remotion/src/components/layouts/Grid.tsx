import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { MediaEl } from "../../util/media";
import { BrandBg, ease, type LayoutProps } from "./shared";
import { INTER } from "../../util/fonts";

/** Cell k appears at 6 + k*stagger with a spring; labels 4 frames later (task spec). */
const Grid: React.FC<LayoutProps & { cells: 2 | 3 | 4 }> = ({ item, cells }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stagger = item.gridStaggerFrames ?? 6;
  const cols = cells === 4 ? 2 : cells;
  const rows = cells === 4 ? 2 : 1;
  const gap = 16;
  return (
    <BrandBg>
      <div style={{ position: "absolute", inset: 48, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap }}>
        {Array.from({ length: cells }).map((_, k) => {
          const at = 6 + k * stagger;
          const s = spring({ frame: frame - at, fps, config: { damping: 18, stiffness: 160, mass: 0.7 }, durationInFrames: 20 });
          const lo = ease(frame, at + 4, at + 12);
          const m = item.media[k] ?? item.media[item.media.length - 1];
          const label = item.gridLabels?.[k] ?? m?.label;
          return (
            <div key={k} style={{ position: "relative", overflow: "hidden", borderRadius: 14, transform: `scale(${0.8 + 0.2 * s})`, opacity: s }}>
              {m ? <MediaEl media={m} /> : null}
              {label ? (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 24px", background: "linear-gradient(0deg, rgba(0,0,0,0.75), rgba(0,0,0,0))", color: "#fff", fontFamily: INTER, fontWeight: 600, fontSize: cells === 4 ? 34 : 40, opacity: lo, transform: `translateY(${(1 - lo) * 20}px)` }}>
                  {label}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </BrandBg>
  );
};
export const Grid2: React.FC<LayoutProps> = ({ item }) => <Grid item={item} cells={2} />;
export const Grid3: React.FC<LayoutProps> = ({ item }) => <Grid item={item} cells={3} />;
export const Grid4: React.FC<LayoutProps> = ({ item }) => <Grid item={item} cells={4} />;
