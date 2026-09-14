import React from "react";
import { AbsoluteFill } from "remotion";
import { MotionMedia, type LayoutProps } from "./shared";

export const FullscreenClip: React.FC<LayoutProps> = ({ item }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}><MotionMedia item={item} /></AbsoluteFill>
);
/** Same media path; the Brain guarantees motion.type === "ken-burns" for this layout. */
export const FullscreenImageKenBurns: React.FC<LayoutProps> = ({ item }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <MotionMedia item={{ ...item, motion: item.motion.type === "none" ? { type: "ken-burns", to: "center", zoom: 1.1 } : item.motion }} />
  </AbsoluteFill>
);
