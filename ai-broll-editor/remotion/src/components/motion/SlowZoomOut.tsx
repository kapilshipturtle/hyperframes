import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";

export const SlowZoomOut: React.FC<{ dur: number; zoom?: number; children: React.ReactNode }> = ({ dur, zoom = 1.12, children }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, Math.max(1, dur)], [zoom, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${s})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
