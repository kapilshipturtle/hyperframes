import React from "react";
import { Freeze, useCurrentFrame } from "remotion";
import { AbsoluteFill } from "remotion";

/** Freeze the last `holdFrames` frames of the shot (default 12). */
export const FreezeEnd: React.FC<{ dur: number; holdFrames?: number; children: React.ReactNode }> = ({ dur, holdFrames = 12, children }) => {
  const f = useCurrentFrame();
  const at = Math.max(0, dur - holdFrames);
  return <AbsoluteFill>{f >= at ? <Freeze frame={at}>{children}</Freeze> : children}</AbsoluteFill>;
};
