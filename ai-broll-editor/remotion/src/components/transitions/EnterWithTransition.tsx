import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import type { BrollItem } from "../../types";
import { Presentation } from "./Presentation";

/** Spec 16.2 Option A: the ENTERING shot owns its transition; progress runs over its first T frames. */
export const EnterWithTransition: React.FC<{ item: BrollItem; children: React.ReactNode }> = ({ item, children }) => {
  const f = useCurrentFrame();
  const T = item.transitionIn.durationInFrames;
  const p = T === 0 ? 1 : interpolate(f, [0, T], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <Presentation type={item.transitionIn.type} direction={item.transitionIn.direction} progress={p} durationInFrames={T}>
      {children}
    </Presentation>
  );
};
