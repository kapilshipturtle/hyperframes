import React from "react";
import { AbsoluteFill, Freeze, Img, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import type { MediaRef } from "../types";
import { IS_CI } from "./env";

/** Resolve a timeline `src` (relative to work/<job>/) to something Remotion can load. See remotion.config.ts. */
export const resolveSrc = (src: string): string => {
  if (src.startsWith("solid:") || src.startsWith("data:") || /^https?:\/\//.test(src)) return src;
  return staticFile(src.replace(/^\.?\//, ""));
};

export const isSolid = (src: string): boolean => src.startsWith("solid:");
export const solidColor = (src: string): string => src.slice("solid:".length) || "#333";

export type MediaElProps = {
  media: MediaRef;
  style?: React.CSSProperties;
  objectFit?: "cover" | "contain";
  playbackRate?: number;
};

/**
 * One media reference -> <Video> (muted, trimBefore = startFromFrame, frozen after freezeAfterFrame),
 * <Img>, or a solid-colour fill. Fills its parent.
 */
export const MediaEl: React.FC<MediaElProps> = ({ media, style, objectFit = "cover", playbackRate }) => {
  const frame = useCurrentFrame();
  const base: React.CSSProperties = { width: "100%", height: "100%", objectFit, display: "block", ...style };
  if (isSolid(media.src)) {
    return (
      <AbsoluteFill style={{ backgroundColor: solidColor(media.src), ...style }}>
        {media.label ? <SolidLabel text={media.label} /> : null}
      </AbsoluteFill>
    );
  }
  if (media.kind === "image") {
    return <Img src={resolveSrc(media.src)} style={base} />;
  }
  const video = (
    <Video
      src={resolveSrc(media.src)}
      trimBefore={media.startFromFrame}
      muted
      playbackRate={playbackRate ?? 1}
      disallowFallbackToOffthreadVideo={IS_CI}
      style={base}
    />
  );
  if (media.freezeAfterFrame !== undefined && frame >= media.freezeAfterFrame) {
    return <Freeze frame={media.freezeAfterFrame}>{video}</Freeze>;
  }
  return video;
};

const SolidLabel: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      color: "rgba(255,255,255,0.35)", fontSize: 40, fontFamily: "sans-serif", letterSpacing: 2,
    }}
  >
    {text}
  </div>
);
