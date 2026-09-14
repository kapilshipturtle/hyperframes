import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

/** Slow lateral drift at 1.08x, the classic documentary "floating photo". */
export const ParallaxDrift: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, Math.max(1, dur)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(1.08) translate(${-2 + 4 * p}%, ${1 - 2 * p}%)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
