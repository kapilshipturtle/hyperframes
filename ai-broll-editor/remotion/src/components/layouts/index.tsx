import React from "react";
import type { BrollItem, Layout } from "../../types";
import { FullscreenClip, FullscreenImageKenBurns } from "./Fullscreen";
import { ComparisonSplit, SplitLeftMediaRightText, SplitRightMediaLeftText } from "./Split";
import { Grid2, Grid3, Grid4 } from "./Grid";
import { DeviceFrame, PipOverBlur } from "./Pip";
import { ChapterCard, EndCard, ListReveal, LowerThird, QuoteCard, StatCounter, TypographicCard } from "./Cards";
import { MapPin, TimelineStrip } from "./Graphic";
import type { LayoutProps } from "./shared";

export const LAYOUT_COMPONENTS: Record<Layout, React.FC<LayoutProps>> = {
  "fullscreen-clip": FullscreenClip,
  "fullscreen-image-kenburns": FullscreenImageKenBurns,
  "split-left-media-right-text": SplitLeftMediaRightText,
  "split-right-media-left-text": SplitRightMediaLeftText,
  "grid-2": Grid2,
  "grid-3": Grid3,
  "grid-4": Grid4,
  "pip-over-blur": PipOverBlur,
  "quote-card": QuoteCard,
  "stat-counter": StatCounter,
  "list-reveal": ListReveal,
  "chapter-card": ChapterCard,
  "end-card": EndCard,
  "lower-third": LowerThird,
  "comparison-split": ComparisonSplit,
  "device-frame": DeviceFrame,
  "map-pin": MapPin,
  "timeline-strip": TimelineStrip,
  "typographic-card": TypographicCard,
};

export const LayoutSwitch: React.FC<{ item: BrollItem }> = ({ item }) => {
  const C = LAYOUT_COMPONENTS[item.layout] ?? TypographicCard;
  return <C item={item} />;
};
