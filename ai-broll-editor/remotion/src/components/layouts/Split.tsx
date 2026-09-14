import React from "react";
import { AbsoluteFill } from "remotion";
import { BrandBg, MotionMedia, PanelText, type LayoutProps } from "./shared";

const Split: React.FC<LayoutProps & { mediaSide: "left" | "right" }> = ({ item, mediaSide }) => {
  const media = (
    <div style={{ position: "absolute", top: 0, bottom: 0, width: "58%", [mediaSide]: 0, overflow: "hidden" }}>
      <MotionMedia item={item} />
    </div>
  );
  const text = (
    <div style={{ position: "absolute", top: 0, bottom: 0, width: "42%", [mediaSide === "left" ? "right" : "left"]: 0 }}>
      <PanelText item={item} align={mediaSide === "left" ? "left" : "right"} />
    </div>
  );
  return <BrandBg>{media}{text}</BrandBg>;
};
export const SplitLeftMediaRightText: React.FC<LayoutProps> = ({ item }) => <Split item={item} mediaSide="left" />;
export const SplitRightMediaLeftText: React.FC<LayoutProps> = ({ item }) => <Split item={item} mediaSide="right" />;

/** Two media side by side with a centre divider and A/B labels. */
export const ComparisonSplit: React.FC<LayoutProps> = ({ item }) => {
  const [a, b] = [item.media[0], item.media[1] ?? item.media[0]];
  const labels = item.gridLabels ?? [a?.label, b?.label];
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {[a, b].map((m, i) => (
        <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: i === 0 ? 0 : "50.3%", width: "49.7%", overflow: "hidden" }}>
          {m ? <MotionMedia item={item} media={m} /> : null}
          {labels[i] ? (
            <div style={{ position: "absolute", left: 40, bottom: 60, padding: "10px 22px", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 40, fontFamily: "Inter, sans-serif", fontWeight: 700, borderRadius: 8 }}>
              {labels[i]}
            </div>
          ) : null}
        </div>
      ))}
      <div style={{ position: "absolute", top: 0, bottom: 0, left: "49.7%", width: "0.6%", background: "#fff" }} />
    </AbsoluteFill>
  );
};
