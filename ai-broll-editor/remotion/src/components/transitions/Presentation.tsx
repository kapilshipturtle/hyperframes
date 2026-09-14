import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { slide } from "@remotion/transitions/slide";
import { flip } from "@remotion/transitions/flip";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { iris } from "@remotion/transitions/iris";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { Direction, TransitionType } from "../../types";
import { hash01 } from "../../util/hash";
import { clampBlur } from "../../util/brand";
import { HEIGHT, WIDTH } from "../../types";

export type PresentationProps = {
  type: TransitionType;
  direction?: Direction;
  /** 0..1, eased, over the first transitionIn.durationInFrames frames of the entering item */
  progress: number;
  durationInFrames: number;
  children: React.ReactNode;
};

const noop = () => undefined;

/** Drive a @remotion/transitions presentation as the ENTERING side with an absolute progress value. */
function Builtin<P extends Record<string, unknown>>({ pres, progress, durationInFrames, children }: { pres: TransitionPresentation<P>; progress: number; durationInFrames: number; children: React.ReactNode }) {
  const C = pres.component as React.ComponentType<TransitionPresentationComponentProps<P>>;
  return (
    <C
      presentationProgress={progress}
      presentationDirection="entering"
      passedProps={pres.props}
      presentationDurationInFrames={durationInFrames}
      onElementImage={noop}
      onUnmount={noop}
      bothEnteringAndExiting={false}
    >
      {children}
    </C>
  );
}

const translateFor = (dir: Direction | undefined, amt: number): string => {
  switch (dir) {
    case "from-right": return `translate(${amt}%, 0)`;
    case "from-top": return `translate(0, ${-amt}%)`;
    case "from-bottom": return `translate(0, ${amt}%)`;
    case "from-left":
    default: return `translate(${-amt}%, 0)`;
  }
};

const wipeClip = (dir: Direction | undefined, p: number): string => {
  const v = `${(1 - p) * 100}%`;
  switch (dir) {
    case "from-right": return `inset(0 0 0 ${v})`;
    case "from-top": return `inset(0 0 ${v} 0)`;
    case "from-bottom": return `inset(${v} 0 0 0)`;
    case "from-left":
    default: return `inset(0 ${v} 0 0)`;
  }
};

/**
 * All 16 TransitionType presentations, applied to the entering shot only (spec 16.2 Option A).
 * fade / wipe / slide / flip / clockWipe / iris use @remotion/transitions' components; the rest are hand-rolled.
 */
export const Presentation: React.FC<PresentationProps> = ({ type, direction, progress: p, durationInFrames: T, children }) => {
  const frame = useCurrentFrame();
  if (p >= 1 || type === "cut") return <AbsoluteFill>{children}</AbsoluteFill>;

  switch (type) {
    case "fade":
      return <Builtin pres={fade()} progress={p} durationInFrames={T}>{children}</Builtin>;
    case "wipe":
      return <Builtin pres={wipe({ direction: direction ?? "from-left" })} progress={p} durationInFrames={T}>{children}</Builtin>;
    case "slide":
      return <Builtin pres={slide({ direction: direction ?? "from-left" })} progress={p} durationInFrames={T}>{children}</Builtin>;
    case "flip":
      return <Builtin pres={flip({ direction: direction ?? "from-left", perspective: 1400 })} progress={p} durationInFrames={T}>{children}</Builtin>;
    case "clockWipe":
      return <Builtin pres={clockWipe({ width: WIDTH, height: HEIGHT })} progress={p} durationInFrames={T}>{children}</Builtin>;
    case "iris":
      return <Builtin pres={iris({ width: WIDTH, height: HEIGHT })} progress={p} durationInFrames={T}>{children}</Builtin>;

    case "luma-dissolve": {
      // Fade whose alpha is a soft diagonal gradient sweeping across the frame.
      const edge = interpolate(p, [0, 1], [-40, 140]);
      const mask = `linear-gradient(115deg, black ${edge - 40}%, transparent ${edge + 40}%)`;
      return (
        <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask, opacity: interpolate(p, [0, 0.4, 1], [0, 1, 1]) }}>
          {children}
        </AbsoluteFill>
      );
    }
    case "push-blur": {
      const blur = clampBlur(interpolate(p, [0, 1], [18, 0]));
      return <AbsoluteFill style={{ transform: translateFor(direction, (1 - p) * 100), filter: `blur(${blur}px)` }}>{children}</AbsoluteFill>;
    }
    case "zoom-punch": {
      const s = interpolate(p, [0, 1], [1.25, 1]);
      const o = interpolate(p, [0, 0.35, 1], [0, 1, 1]);
      return <AbsoluteFill style={{ transform: `scale(${s})`, opacity: o }}>{children}</AbsoluteFill>;
    }
    case "whip-pan": {
      const dist = (1 - p) * 120;
      const blur = clampBlur((1 - p) * 24);
      const horizontal = direction === "from-top" || direction === "from-bottom" ? false : true;
      return (
        <AbsoluteFill style={{ transform: translateFor(direction, dist), filter: `blur(${horizontal ? `${blur}px 0` : `0 ${blur}px`})` }}>
          <AbsoluteFill style={{ filter: `blur(${blur * 0.5}px)` }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      );
    }
    case "glitch": {
      // RGB split slices, deterministic from frame number.
      const strength = 1 - p;
      const slices = 8;
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ opacity: interpolate(p, [0, 0.25, 1], [0, 1, 1]) }}>{children}</AbsoluteFill>
          {Array.from({ length: slices }).map((_, i) => {
            const top = (i / slices) * 100;
            const h = 100 / slices;
            const dx = (hash01(frame, i, 1) - 0.5) * 80 * strength;
            const ch = hash01(frame, i, 2);
            const tint = ch < 0.33 ? "rgba(255,0,0,0.35)" : ch < 0.66 ? "rgba(0,255,0,0.35)" : "rgba(0,0,255,0.35)";
            const show = hash01(frame, i, 3) < 0.7 * strength;
            if (!show) return null;
            return (
              <AbsoluteFill key={i} style={{ clipPath: `inset(${top}% 0 ${100 - top - h}% 0)`, transform: `translateX(${dx}px)` }}>
                <AbsoluteFill style={{ filter: "contrast(1.3)" }}>{children}</AbsoluteFill>
                <AbsoluteFill style={{ backgroundColor: tint, mixBlendMode: "multiply" }} />
              </AbsoluteFill>
            );
          })}
        </AbsoluteFill>
      );
    }
    case "light-leak": {
      const sweep = interpolate(p, [0, 1], [-30, 130]);
      return (
        <AbsoluteFill style={{ opacity: interpolate(p, [0, 0.5, 1], [0, 1, 1]) }}>
          {children}
          <AbsoluteFill
            style={{
              background: `radial-gradient(ellipse at ${sweep}% 30%, rgba(255,200,120,${0.9 * (1 - p)}) 0%, rgba(255,120,60,${0.5 * (1 - p)}) 30%, transparent 65%)`,
              mixBlendMode: "screen",
            }}
          />
        </AbsoluteFill>
      );
    }
    case "film-burn": {
      const burn = 1 - p;
      const edge = interpolate(p, [0, 1], [0, 160]);
      return (
        <AbsoluteFill>
          <AbsoluteFill style={{ opacity: interpolate(p, [0, 0.3, 1], [0, 1, 1]), filter: `sepia(${burn * 0.6}) brightness(${1 + burn * 0.8})` }}>{children}</AbsoluteFill>
          <AbsoluteFill
            style={{
              background: `radial-gradient(circle at 50% 50%, transparent ${Math.max(0, edge - 60)}%, rgba(255,140,40,${burn}) ${edge}%, rgba(60,10,0,${burn}) ${edge + 25}%)`,
              mixBlendMode: "screen",
              opacity: burn,
            }}
          />
        </AbsoluteFill>
      );
    }
    case "shutter": {
      // Horizontal blinds opening.
      const n = 6;
      const open = p;
      return (
        <AbsoluteFill>
          {Array.from({ length: n }).map((_, i) => {
            const top = (i / n) * 100;
            const h = (100 / n) * open;
            return (
              <AbsoluteFill key={i} style={{ clipPath: `inset(${top}% 0 ${100 - top - h}% 0)` }}>
                {children}
              </AbsoluteFill>
            );
          })}
        </AbsoluteFill>
      );
    }
    case "pixelate": {
      // Approximation: render tiny and scale up with crisp edges; coarseness eases out.
      const factor = Math.max(1, Math.round(interpolate(p, [0, 1], [24, 1])));
      return (
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <AbsoluteFill
            style={{
              width: WIDTH / factor, height: HEIGHT / factor, transform: `scale(${factor})`, transformOrigin: "top left",
              imageRendering: "pixelated", opacity: interpolate(p, [0, 0.2, 1], [0, 1, 1]),
            }}
          >
            {children}
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    default:
      return <AbsoluteFill>{children}</AbsoluteFill>;
  }
};
