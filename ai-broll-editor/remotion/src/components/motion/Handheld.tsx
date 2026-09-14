import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { hashSigned } from "../../util/hash";

/** 2 px deterministic noise (spec 16.3). Smoothed across 3 frames so it reads as a hand, not jitter. */
export const Handheld: React.FC<{ seed?: number; amplitudePx?: number; children: React.ReactNode }> = ({ seed = 7, amplitudePx = 2, children }) => {
  const f = useCurrentFrame();
  const n = (k: number, axis: number) => (hashSigned(k, seed, axis) + hashSigned(k - 1, seed, axis) + hashSigned(k + 1, seed, axis)) / 3;
  const x = n(f, 1) * amplitudePx;
  const y = n(f, 2) * amplitudePx;
  const r = n(f, 3) * 0.15;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(1.02) translate(${x}px, ${y}px) rotate(${r}deg)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
