import React from "react";
import { Composition, type CalculateMetadataFunction, staticFile } from "remotion";
import type { MainProps } from "./types";
import { Main } from "./Main";
import { DEFAULT_TIMELINE } from "./defaultTimeline";
import { buildShowcase } from "./showcase";

/**
 * Duration/fps/size come from the timeline props (--props=work/<job>/timeline.json).
 * If the Brain wrote a duckCurve file and no inline values were passed, load it here (local file via the public dir).
 */
const calculateMetadata: CalculateMetadataFunction<MainProps> = async ({ props }) => {
  let duckCurveValues = props.duckCurveValues;
  if (!duckCurveValues && props.duckCurve) {
    try {
      const rel = props.duckCurve.replace(/^.*?work\/[^/]+\//, "");
      const res = await fetch(staticFile(rel));
      if (res.ok) {
        const json = (await res.json()) as number[] | { values: number[] };
        duckCurveValues = Array.isArray(json) ? json : json.values;
      }
    } catch {
      duckCurveValues = undefined; // narration/music still render; ducking is then the FFmpeg mix's job
    }
  }
  return {
    durationInFrames: props.durationInFrames,
    fps: props.fps,
    width: props.width,
    height: props.height,
    props: { ...props, duckCurveValues },
  };
};

export const RemotionRoot: React.FC = () => {
  const showcase = buildShowcase();
  return (
    <>
      <Composition id="Main" component={Main} width={1920} height={1080} fps={30} durationInFrames={DEFAULT_TIMELINE.durationInFrames} defaultProps={DEFAULT_TIMELINE} calculateMetadata={calculateMetadata} />
      <Composition id="Showcase" component={Main} width={1920} height={1080} fps={30} durationInFrames={showcase.durationInFrames} defaultProps={showcase} calculateMetadata={calculateMetadata} />
    </>
  );
};
