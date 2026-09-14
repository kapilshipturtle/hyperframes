import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { KenBurnsAnchor } from "../../types";

/** 9 anchors -> pan direction in [-1..1]^2 (spec 16.3). */
export const ANCHORS: Record<KenBurnsAnchor, [number, number]> = {
  center: [0, 0], "top-left": [1, 1], top: [0, 1], "top-right": [-1, 1], left: [1, 0],
  right: [-1, 0], "bottom-left": [1, -1], bottom: [0, -1], "bottom-right": [-1, -1],
};

/**
 * Ken Burns progress 0..1 whose fastest zoom sits at `peakFrame`:
 * ease-in cubic up to the peak, ease-out cubic after it, so the derivative maximum is exactly at peakFrame.
 * Without peakFrame this is the spec's plain Easing.inOut(cubic).
 */
export const kenBurnsProgress = (f: number, dur: number, peakFrame?: number): number => {
  if (dur <= 0) return 1;
  if (peakFrame === undefined || peakFrame <= 0 || peakFrame >= dur) {
    return interpolate(f, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  }
  // Share of the travel done before the peak is proportional to its time share, keeping velocity continuous.
  const share = peakFrame / dur;
  if (f <= peakFrame) {
    return share * interpolate(f, [0, peakFrame], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  }
  return share + (1 - share) * interpolate(f, [peakFrame, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
};

export const KenBurns: React.FC<{ dur: number; zoom: number; to: KenBurnsAnchor; peakFrame?: number; children: React.ReactNode }> = ({ dur, zoom, to, peakFrame, children }) => {
  const f = useCurrentFrame();
  const p = kenBurnsProgress(f, dur, peakFrame);
  const s = 1 + (zoom - 1) * p;
  const [tx, ty] = ANCHORS[to] ?? [0, 0];
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${s}) translate(${tx * 4 * p}%, ${ty * 4 * p}%)` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
