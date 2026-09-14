# Effects catalogue

Source: spec-v3 section 16. Every enum here matches `scripts/ts/types.ts`.
The Director may only use names from this file. The Brain may only emit
names from this file. The `Showcase` Remotion composition renders every
enum once (milestone M8) so a missing implementation is caught early.

## 16.1 Layouts

`fullscreen-clip` (F), `fullscreen-image-kenburns` (F),
`split-left-media-right-text`, `split-right-media-left-text`, `grid-2`,
`grid-3`, `grid-4`, `pip-over-blur`, `quote-card`, `stat-counter`,
`list-reveal`, `chapter-card`, `end-card`, `lower-third`,
`comparison-split`, `device-frame`, `map-pin` (optional), `timeline-strip`,
`typographic-card` (never-fail fallback, real words only).

(F) = FFmpeg-routable when text is null and the transition is `cut` or
`fade`.

Families (for the variety rules): fullscreen, split, grid, pip, card,
graphic. `comparison-split` counts as split; `device-frame` counts as pip;
anything ending in `card` counts as card.

## 16.2 Transitions

Built in (`@remotion/transitions`): `fade`, `wipe` (8 directions), `slide`
(4), `flip` (4, perspective), `clockWipe`, `iris`, `none`. Avoid `ripple` in
CI; `cube` is paid.

Custom presentations (`remotion/src/components/transitions/`): `cut`,
`zoom-punch`, `whip-pan`, `glitch`, `luma-dissolve`, `push-blur`,
`light-leak`, `film-burn`, `shutter`, `pixelate`.

FFmpeg `xfade` equivalents: `fade`, `wipeleft|wiperight|wipeup|wipedown`,
`slideleft|slideright`, `circleopen`, `dissolve`, `pixelize`, `fadeblack`,
`fadewhite`, `zoomin`. Only `cut` and `fade` keep a segment on the FFmpeg
route (Brain P11); the rest exist for parity tests.

Timings: `linearTiming({durationInFrames})` or
`springTiming({config:{damping:200}})`; 8 to 18 frames (6 to 10 for punchy
types).

Families by mood (Director rule): energetic = zoom-punch, whip-pan, slide;
calm = fade, luma-dissolve; documentary = cut, fade; tech = glitch, wipe.

Entering-shot wrapper (Option A, absolute timing):

```tsx
export const EnterWithTransition: React.FC<{item: BrollItem; children: React.ReactNode}> = ({item, children}) => {
  const f = useCurrentFrame(); const T = item.transitionIn.durationInFrames;
  const p = T === 0 ? 1 : interpolate(f, [0, T], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <Presentation type={item.transitionIn.type} direction={item.transitionIn.direction} progress={p}>{children}</Presentation>;
};
// In Main.tsx each broll item is <Sequence from={item.from} durationInFrames={item.durationInFrames} layout="none"> with entering items stacked above exiting ones.
```

## 16.3 Motion

`none`, `ken-burns` (zoom 1.05 to 1.18, 9 anchors, zoom peak aligned to the
strongest word via `peakFrame`; FFmpeg `zoompan`), `parallax-drift`,
`slow-zoom-out`, `handheld` (2 px noise), `speed-ramp` (constant
`playbackRate` per shot), `freeze-end`.

Ken Burns anchors: `center`, `top-left`, `top`, `top-right`, `left`,
`right`, `bottom-left`, `bottom`, `bottom-right`.

```tsx
export const KenBurns: React.FC<{src:string; dur:number; zoom:number; to:[number,number]; peakFrame?:number}> = ({src,dur,zoom,to,peakFrame}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {extrapolateLeft:'clamp', extrapolateRight:'clamp', easing: Easing.inOut(Easing.cubic)});
  const s = 1 + (zoom - 1) * p;
  return <AbsoluteFill style={{overflow:'hidden'}}><Img src={staticFile(src)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${s}) translate(${to[0]*4*p}%, ${to[1]*4*p}%)`}}/></AbsoluteFill>;
};
```

## 16.4 Text styles

`kinetic-bold`, `typewriter`, `highlight-marker`, `lower-third-name`,
`big-number`, `caption-box`, `outline-stroke`, `gradient-fill`,
`slide-up-mask`, `word-by-word-pop`.

Positions: `lower-left|lower-center|lower-right|center|upper-left|upper-right|left-panel|right-panel`.

5 percent safe area. Scrim over media, never on panels. Fonts via
`@remotion/google-fonts` (Inter, Bebas Neue, Playfair Display); brand fonts
from `job.yaml`.

Captions are off by default for 16:9 long-form. When on:
`createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: 1200})`,
`white-space: pre`, style `karaoke-bottom`. Text never overlaps the caption
band.

## 16.5 Colour grades

Remotion CSS and FFmpeg pairs. Calibrated once with a test clip and stored in
`grades.json` so FFmpeg and Remotion segments match at the seam. QC checks
seams.

| Grade | Remotion | FFmpeg |
|---|---|---|
| clean-cool | `contrast(1.05) saturate(0.95)` + 4 percent blue overlay | `eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04` |
| warm-film | `sepia(0.12) contrast(1.08)` + grain | `eq=contrast=1.08,colorbalance=rs=0.05:bs=-0.04,noise=alls=6:allf=t` |
| teal-orange | two gradient overlays, `mix-blend-mode` | `colorbalance=rs=0.06:bs=0.08:rm=-0.03` |
| muted-documentary | `saturate(0.8) contrast(1.03)` | `eq=saturation=0.8:contrast=1.03` |
| high-contrast-bw | `grayscale(1) contrast(1.3)` | `hue=s=0,eq=contrast=1.3` |
| vibrant | `saturate(1.25) contrast(1.05)` | `eq=saturation=1.25:contrast=1.05` |
| night | `brightness(0.85)` + blue overlay | `eq=brightness=-0.06,colorbalance=bs=0.1` |
| vintage (archival) | `sepia(0.25) contrast(1.1)` + heavy grain + letterbox | `eq=contrast=1.1,colorbalance=rs=0.08:gs=0.03,noise=alls=12:allf=t` |

Always vignette (`vignette=PI/5`) and optional grain (6 to 10 percent).

The job sets a default grade; the Director may set a per-section grade
(`ShotPlan.grade`); the Brain copies it to `BrollItem.grade`. `vintage` is
applied by the Brain to SD archival assets regardless of the section grade.

## 16.6 Motion graphics

`stat-counter`, `progress-bar-top`, `arrow-callout`, `highlight-box`,
`circle-reveal`, `underline-draw`, `icon-pop` (Lucide SVG),
`particles-light`, `bar-chart-mini`, `checklist-tick`, `corner-credit` (for
CC and Y2 clips).

Timing rules live in `brain.md` section 10.

## 16.7 SFX tags and anchors

Tags: `whoosh-soft`, `whoosh-hard`, `swoosh-short`, `pop`, `click`, `tick`,
`impact-soft`, `glitch`, `camera-shutter`, `typewriter-key`, `riser-short`,
`ding`, `counter-tick-loop`.

Anchors: `transition-in`, `text-in`, `grid-cell`, `counter`, `beat-start`.

3 to 5 variants per tag in `assets/sfx/manifest.json`; rotation enforced by
the Brain; never the same file twice in a row. Base gains: whoosh 0.35, pop
0.30, click 0.25, impact 0.4, tick 0.12; hard cap 0.5.

## 16.8 Music tags

`upbeat-corporate`, `calm-piano`, `tension-drone`, `documentary-ambient`,
`tech-minimal`, `hopeful-strings`. `assets/music/manifest.json` carries
`bpm` for loop points.

## Sound and music pack sources (spec 17)

| Source | Licence | Use |
|---|---|---|
| Mixkit | Mixkit License (commercial OK) | manual |
| Kenney.nl audio | CC0 | bulk zips: clicks, pops, UI |
| YouTube Audio Library | free for YouTube videos; some need attribution | safest for YouTube output |
| Incompetech | CC BY 4.0 | credit in description |
| Freesound APIv2 | per-file CC; API free for NON-COMMERCIAL use only | personal projects only |

`scripts/py/build_sfx_pack.py`: SFX `loudnorm=I=-16:TP=-1.5`, 48 kHz mono,
leading silence trimmed, manifest `{tag,file,durationMs,source,license}`.
Music `loudnorm=I=-20`, stereo, `{mood,file,bpm,durationMs,source,license}`.
