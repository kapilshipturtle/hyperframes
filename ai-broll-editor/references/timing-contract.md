# The timing contract

This is spec-v3 section 3 and section 11.8. The rules are quoted verbatim.
Everything in the package obeys them. If a change to any file would break
one of them, the change is wrong.

## The chain

```
words(ms) -> beats(ms) -> cut points(ms, on word starts, 100 ms lead) -> ONE function msToFrame -> frames
frame durations by subtraction -> timeline.json validated -> Remotion/FFmpeg render exactly that
```

## Rules enforced by code (spec 3, verbatim)

1. Visual changes land on a word START, 80 to 120 ms early. Never inside a word.
2. Shot length 45 to 180 frames (1.5 to 6.0 s). YouTube Y2 clips 45 to 149 frames (under 5.0 s).
3. Transitions (8 to 18 frames) belong to the ENTERING shot and complete exactly at the cut frame.
4. Text is anchored to a word ID; ends 5 or more frames before its beat ends.
5. SFX anchor to transition-start or text-in frames; 45 or more frames apart.
6. `sum(broll durations) == msToFrame(durationMs)`; no gaps, no overlaps except declared transition overlaps.

## The one conversion function (spec 11.8, verbatim)

```ts
export const FPS = 30;
export const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);   // the only conversion in the codebase
export function quantise(cuts: Cut[], durationMs: number): ShotFrames[] {
  const total = msToFrame(durationMs);
  const starts = cuts.map(c => msToFrame(c.cutMs));
  starts[0] = 0;
  const out: ShotFrames[] = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i+1] : total;
    out.push({ beatId: cuts[i].beatId, from, durationInFrames: to - from });      // subtraction guarantees contiguity
  }
  // post: enforce 45..180 by merging/splitting on frame domain, then re-check sum
  const fixed = enforceBounds(out, 45, 180);
  assert(fixed.reduce((a, s) => a + s.durationInFrames, 0) === total, "drift");
  assert(fixed.every((s, i) => i === 0 || s.from === fixed[i-1].from + fixed[i-1].durationInFrames), "gap/overlap");
  return fixed;
}
```

`enforceBounds`: a shot under 45 merges into the shorter neighbour and the
merged shot keeps the earlier shot's asset (its transition is dropped,
logged). A shot over 180 (rare after P1) splits at the frame of the
strongest word start inside it (minus 3 frames lead), second half uses the
beat's alternate asset.

## What this means in practice

- `msToFrame` lives in `scripts/ts/types.ts` and is imported everywhere.
  Never write `Math.round(ms * 30 / 1000)` or `ms / 33.33` anywhere else.
  `frameToMs` exists for logs and FFmpeg `-ss` values only.
- Durations are never converted from ms. They are `nextFrom - from`. This is
  what makes a 72,000 frame timeline drift-free.
- The first shot starts at frame 0 even when speech starts later. The last
  shot extends to `msToFrame(durationMs)`.
- Planning files (`transcript.json`, `beats.json`, `shotplan.json`,
  `assets.json`) carry milliseconds. `timeline.json` and `chunks.json` carry
  frames only. Mixing the two in one file is a bug.
- A transition of T frames on shot i+1 means shot i+1 has
  `from = cutFrame - T` and `durationInFrames = D + T`. Shot i is untouched.
  The rendered stack puts the entering shot above the exiting shot.
- Text `from = msToFrame(anchorWord.startMs) - 2`. Text end
  `<= beatEndFrame - 5`.
- SFX at `cutFrame - T` for transitions, at text `from` for pops. Two SFX
  closer than 45 frames: the lower priority one is dropped (tick trains
  count as one event).
- Audio delays for the FFmpeg mixer are `from / 30 * 1000` ms from the same
  `timeline.json`. Nothing is re-derived from the planning files.

## Fixed encoder parameters (spec D2)

fps 30, 1920x1080, H.264 High 4.1, yuv420p, GOP 30 (`-g 30 -keyint_min 30
-sc_threshold 0`), BT.709 tags. Every prepared asset, every FFmpeg segment
and every Remotion segment uses these so `ffmpeg -c copy` concat is lossless
and the frame count of the concat equals `durationInFrames`.

## Checks that guard the contract

- Brain asserts I1 (contiguity and total frames) and I3 (transition completes
  at cut frame) at the end of P6.
- Validator recomputes I1 to I12 from scratch and refuses to let a render
  start otherwise.
- Concat asserts `nb_read_frames == durationInFrames`.
- Property tests (fast-check): random transcripts of 50 to 5,000 words
  produce timelines that satisfy the contract.
