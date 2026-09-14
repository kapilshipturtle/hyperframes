import React from "react";
import { AbsoluteFill } from "remotion";
import { BlurPlate, MotionMedia, type LayoutProps } from "./shared";

/** Portrait / low-res sources: blurred plate behind, media fitted in the centre; `sd` tier gets letterbox + vintage treatment. */
export const PipOverBlur: React.FC<LayoutProps> = ({ item }) => {
  const m = item.media[0];
  const sd = item.tier === "archival" || item.tier === "y2";
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {m ? <BlurPlate media={m} /> : null}
      <AbsoluteFill style={{ padding: sd ? "6% 18%" : "4% 22%" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: sd ? 0 : 12, boxShadow: "0 30px 80px rgba(0,0,0,0.55)", filter: sd ? "sepia(0.2) contrast(1.05)" : undefined }}>
          <MotionMedia item={item} objectFit="contain" />
        </div>
      </AbsoluteFill>
      {sd ? (
        <>
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "6%", background: "#000" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "6%", background: "#000" }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

/** Media inside a laptop-style bezel. */
export const DeviceFrame: React.FC<LayoutProps> = ({ item }) => {
  const m = item.media[0];
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, #1F2937 0%, #0B1220 80%)" }}>
      {m ? <AbsoluteFill style={{ opacity: 0.35 }}><BlurPlate media={m} blur={24} /></AbsoluteFill> : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ width: 1400, height: 820, background: "#111827", borderRadius: 28, padding: 22, boxShadow: "0 40px 100px rgba(0,0,0,0.6)", position: "relative" }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", position: "relative", background: "#000" }}>
            <MotionMedia item={item} />
          </div>
          <div style={{ position: "absolute", top: 8, left: "50%", width: 10, height: 10, borderRadius: 5, background: "#374151", transform: "translateX(-50%)" }} />
        </div>
        <div style={{ width: 1600, height: 26, background: "#1F2937", borderRadius: "0 0 20px 20px", marginTop: 2 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
