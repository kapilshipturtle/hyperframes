import React from "react";
import { AbsoluteFill } from "remotion";

/**
 * Speed ramp = constant playbackRate per shot (spec 16.3). The rate itself is applied on the <Video>
 * (see MotionWrap / MediaEl playbackRate); this wrapper only exists for symmetry in the motion switch.
 */
export const SpeedRamp: React.FC<{ children: React.ReactNode }> = ({ children }) => <AbsoluteFill>{children}</AbsoluteFill>;
