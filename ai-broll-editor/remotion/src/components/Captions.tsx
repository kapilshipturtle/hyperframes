import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import type { CaptionPage } from "../types";
import { INTER } from "../util/fonts";
import { BRAND, SAFE } from "../util/brand";

/** Karaoke-bottom captions: one page at a time, the active token highlighted. `white-space: pre` (spec 16.4). */
export const Captions: React.FC<{ pages: CaptionPage[]; style?: string }> = ({ pages }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {pages.map((p, i) => (
      <Sequence key={i} from={p.from} durationInFrames={p.durationInFrames} layout="none">
        <Page page={p} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

const Page: React.FC<{ page: CaptionPage }> = ({ page }) => {
  const f = useCurrentFrame();
  const abs = page.from + f;
  return (
    <div style={{ position: "absolute", left: "50%", bottom: `${SAFE * 100 + 2}%`, transform: "translateX(-50%)", maxWidth: "80%", padding: "14px 28px", background: "rgba(0,0,0,0.6)", borderRadius: 10, fontFamily: INTER, fontWeight: 700, fontSize: 52, lineHeight: 1.25, color: "#fff", textAlign: "center", whiteSpace: "pre" }}>
      {page.tokens.length
        ? page.tokens.map((t, i) => {
            const active = abs >= t.from && abs < t.from + t.durationInFrames;
            const done = abs >= t.from + t.durationInFrames;
            return (
              <span key={i} style={{ color: active ? BRAND.accent : done ? "#fff" : "rgba(255,255,255,0.7)", transform: active ? "scale(1.06)" : undefined, display: "inline-block" }}>
                {t.text}
              </span>
            );
          })
        : page.text}
    </div>
  );
};
