import React from "react";
import { AbsoluteFill } from "remotion";
import type { Motion } from "../../types";
import { KenBurns } from "./KenBurns";
import { ParallaxDrift } from "./ParallaxDrift";
import { SlowZoomOut } from "./SlowZoomOut";
import { Handheld } from "./Handheld";
import { SpeedRamp } from "./SpeedRamp";
import { FreezeEnd } from "./FreezeEnd";

/** Apply a Motion (spec 16.3) to media children. `dur` = the item's durationInFrames. */
export const MotionWrap: React.FC<{ motion: Motion | undefined; dur: number; seed?: number; children: React.ReactNode }> = ({ motion, dur, seed, children }) => {
  switch (motion?.type) {
    case "ken-burns":
      return <KenBurns dur={dur} zoom={motion.zoom ?? 1.12} to={motion.to ?? "center"} peakFrame={motion.peakFrame}>{children}</KenBurns>;
    case "parallax-drift":
      return <ParallaxDrift dur={dur}>{children}</ParallaxDrift>;
    case "slow-zoom-out":
      return <SlowZoomOut dur={dur} zoom={motion.zoom}>{children}</SlowZoomOut>;
    case "handheld":
      return <Handheld seed={seed}>{children}</Handheld>;
    case "speed-ramp":
      return <SpeedRamp>{children}</SpeedRamp>;
    case "freeze-end":
      return <FreezeEnd dur={dur}>{children}</FreezeEnd>;
    default:
      return <AbsoluteFill>{children}</AbsoluteFill>;
  }
};
export const motionPlaybackRate = (motion: Motion | undefined): number | undefined =>
  motion?.type === "speed-ramp" ? motion.playbackRate ?? 1.5 : undefined;
