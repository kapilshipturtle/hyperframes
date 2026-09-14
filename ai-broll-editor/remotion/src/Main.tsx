import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import type { MainProps } from "./types";
import type { BrollItem, MusicItem } from "./types";
import { resolveSrc } from "./util/media";
import { EnterWithTransition } from "./components/transitions/EnterWithTransition";
import { LayoutSwitch } from "./components/layouts";
import { GradeFilter, GradeOverlay } from "./components/grades/Grade";
import { MotionGfx } from "./components/graphics/MotionGfx";
import { TextLayer } from "./components/text/TextLayer";
import { Captions } from "./components/Captions";
import { INTER } from "./util/fonts";
import { SAFE } from "./util/brand";

/**
 * Renders a Timeline. Stacking order (spec 11.2, bottom -> top):
 * music (audio) < broll < grade < motiongfx < text < credits < captions < sfx (audio) < narration (audio, untouched).
 * Broll items are rendered in timeline order so a later `from` gets a higher z: the entering shot sits above the exiting one.
 */
export const Main: React.FC<MainProps> = (props) => {
  const { tracks } = props;
  const broll = [...tracks.broll].sort((a, b) => a.from - b.from);
  const brollGradeless = broll.every((b) => !b.grade || b.grade === props.grade);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* music */}
      {tracks.music.map((m) => <MusicAudio key={m.id} item={m} duck={props.duckCurveValues} />)}

      {/* broll (+ per-item grade when sections differ) */}
      {brollGradeless ? (
        <GradeFilter grade={props.grade}>
          {broll.map((b) => <BrollSeq key={b.id} item={b} />)}
        </GradeFilter>
      ) : (
        <AbsoluteFill>
          {broll.map((b) => (
            <GradeFilter key={b.id} grade={b.grade ?? props.grade}>
              <BrollSeq item={b} />
            </GradeFilter>
          ))}
        </AbsoluteFill>
      )}

      {/* grade overlay (tints, vignette, grain, letterbox) */}
      {brollGradeless ? (
        <GradeOverlay grade={props.grade} />
      ) : (
        broll.map((b) => (
          <Sequence key={`g-${b.id}`} from={b.from} durationInFrames={b.durationInFrames} layout="none">
            <GradeOverlay grade={b.grade ?? props.grade} />
          </Sequence>
        ))
      )}

      {/* motion graphics */}
      {tracks.motiongfx.map((g) => (
        <Sequence key={g.id} from={g.from} durationInFrames={g.durationInFrames} layout="none">
          <GfxWithAbs item={g} />
        </Sequence>
      ))}

      {/* text */}
      {tracks.text.map((t) => (
        <Sequence key={t.id} from={t.from} durationInFrames={t.durationInFrames} layout="none">
          <TextLayer item={t} overMedia={isOverMedia(broll, t.from)} />
        </Sequence>
      ))}

      {/* credits (per-shot corner credits from broll items) */}
      {broll.filter((b) => b.credit).map((b) => (
        <Sequence key={`c-${b.id}`} from={b.from} durationInFrames={b.durationInFrames} layout="none">
          <CornerCredit text={b.credit!.text} corner={b.credit!.corner ?? "bottom-right"} />
        </Sequence>
      ))}

      {/* captions */}
      {tracks.captions.enabled ? <Captions pages={tracks.captions.pages} style={tracks.captions.style} /> : null}

      {/* sfx */}
      {tracks.sfx.map((s) => (
        <Sequence key={s.id} from={s.from} layout="none">
          <Audio src={resolveSrc(s.src)} volume={s.volume} />
        </Sequence>
      ))}

      {/* narration: untouched */}
      <Sequence from={props.narration.startFrame} layout="none">
        <Audio src={resolveSrc(props.narration.src)} />
      </Sequence>
    </AbsoluteFill>
  );
};

const BrollSeq: React.FC<{ item: BrollItem }> = ({ item }) => (
  <Sequence from={item.from} durationInFrames={item.durationInFrames} layout="none">
    <EnterWithTransition item={item}>
      <LayoutSwitch item={item} />
    </EnterWithTransition>
  </Sequence>
);

const GfxWithAbs: React.FC<{ item: MainProps["tracks"]["motiongfx"][number] }> = ({ item }) => {
  const f = useCurrentFrame();
  return <MotionGfx item={item} absoluteFrame={item.from + f} />;
};

/** Text is "over media" unless the shot under it is a pure text card. */
const isOverMedia = (broll: BrollItem[], frame: number): boolean => {
  const under = broll.filter((b) => frame >= b.from && frame < b.from + b.durationInFrames).pop();
  if (!under) return true;
  return !(under.layout === "typographic-card" || (under.layout === "chapter-card" && under.media.length === 0) || (under.layout === "quote-card" && under.media.length === 0));
};

const CornerCredit: React.FC<{ text: string; corner: "bottom-left" | "bottom-right" }> = ({ text, corner }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: `${SAFE * 100}%`, [corner === "bottom-left" ? "left" : "right"]: `${SAFE * 100}%`, padding: "6px 14px", background: "rgba(0,0,0,0.65)", borderRadius: 6, fontFamily: INTER, fontSize: 24, color: "rgba(255,255,255,0.92)", opacity: o, maxWidth: "45%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {text}
    </div>
  );
};

/** Music with fades and the Brain's per-frame duck curve (absolute frame index into duckCurveValues). */
const MusicAudio: React.FC<{ item: MusicItem; duck?: number[] }> = ({ item, duck }) => {
  const vol = (f: number): number => {
    const fadeIn = item.fadeInFrames > 0 ? interpolate(f, [0, item.fadeInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
    const fadeOut = item.fadeOutFrames > 0 ? interpolate(f, [item.durationInFrames - item.fadeOutFrames, item.durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
    const d = duck ? duck[Math.min(duck.length - 1, Math.max(0, item.from + f))] ?? 1 : 1;
    return Math.max(0, Math.min(1, item.volume * fadeIn * fadeOut * d));
  };
  return (
    <Sequence from={item.from} durationInFrames={item.durationInFrames} layout="none">
      <Audio src={resolveSrc(item.src)} trimBefore={item.startFromFrame} volume={vol} />
    </Sequence>
  );
};
