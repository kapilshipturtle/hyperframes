import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Grade } from "../../types";
import gradesJson from "./grades.json";
import { hashInt } from "../../util/hash";

export type GradeParams = {
  css: string;
  overlay: { color: string; blend: string }[];
  ffmpeg: string;
  grain: number;
  vignette: boolean;
  letterbox: boolean;
};
export const GRADE_PARAMS = gradesJson.grades as Record<Grade, GradeParams>;
export const gradeParams = (g: Grade | undefined): GradeParams => GRADE_PARAMS[g ?? "clean-cool"] ?? GRADE_PARAMS["clean-cool"];

/** Wrap the broll layer: CSS `filter` (no backdrop-filter). */
export const GradeFilter: React.FC<{ grade: Grade | undefined; children: React.ReactNode }> = ({ grade, children }) => (
  <AbsoluteFill style={{ filter: gradeParams(grade).css }}>{children}</AbsoluteFill>
);

/** Deterministic grain: SVG feTurbulence data-URI whose seed changes every frame. */
const grainUri = (seed: number): string =>
  `data:image/svg+xml;utf8,` +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`,
  );

/** Full-frame overlay stack: tints, vignette (always), grain, letterbox. Sits above broll, below motiongfx (spec 11.2). */
export const GradeOverlay: React.FC<{ grade: Grade | undefined }> = ({ grade }) => {
  const frame = useCurrentFrame();
  const g = gradeParams(grade);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {g.overlay.map((o, i) => (
        <AbsoluteFill key={i} style={{ background: o.color, mixBlendMode: o.blend as React.CSSProperties["mixBlendMode"] }} />
      ))}
      {g.vignette ? (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />
      ) : null}
      {g.grain > 0 ? (
        <AbsoluteFill
          style={{
            backgroundImage: `url("${grainUri(hashInt(frame, 991) % 65536)}")`,
            backgroundSize: "320px 180px",
            opacity: g.grain,
            mixBlendMode: "overlay",
          }}
        />
      ) : null}
      {g.letterbox ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "7%", background: "#000" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "7%", background: "#000" }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
