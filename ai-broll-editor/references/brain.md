# The Brain: implementer's reference

Source: spec-v3 section 11, restated for whoever edits `scripts/ts/brain/`.
Read this file end to end before touching placement code.

## 1. What the Brain is and is not

The Brain is `scripts/ts/brain/` (`index, cuts, emphasis, shots, transitions,
quantise, text, motiongfx, sfx, music, route, log`). It is deterministic
TypeScript. It reads `transcript.json`, `beats.json`, `shotplan.json`,
`assets.json` and `job.yaml`. It writes `timeline.json`, `chunks.json`,
`placement.log.jsonl`, `audio-mix.json` and `duckCurve.json`, and writes
`headPadFrames` back into `assets.json`.

It never calls an LLM. Same inputs and same seed give byte-identical output
(seed = sha1(job_id)). Every conflict is resolved by an explicit priority
rule and every decision gets a reason line in the log.

Separation of powers: the Director (LLM) says what should be seen and felt.
The Brain says exactly when, for how long, on which frames, with which
transition length, where text sits, when sounds fire and how music breathes.
If the Director's preference violates a hard rule, the Brain overrides it and
logs the override.

## 2. Tracks and priorities

Rendering stack, bottom to top:
`music` (audio) < `broll` < `grade` (full-frame overlay) < `motiongfx` <
`text` < `credits` < `captions` < `sfx` (audio) < `narration` (audio, never
touched).

Conflict priority when two elements want the same frames (higher wins):

1. narration timing (never moved)
2. beat boundaries (word starts)
3. transition completion frame
4. text visibility (must be readable)
5. SFX spacing
6. music phrasing
7. layout variety
8. Director preference

## 3. The eleven passes, in order

```
P0  normalise inputs, seed RNG (seed = sha1(job_id))                        -> ctx
P1  beat repair: enforce 1.5..6.0 s, split/merge, keep word alignment       -> beats'
P2  cut points: lead time, snap to word starts, section boundaries          -> cuts[] (ms)
P3  emphasis map: where the narration hits hard                              -> emphasis[] (wordId, weight)
P4  shot assignment: layout final, asset final, in/out points, route         -> shots[]
P5  transition assignment: type + duration per cut, entering-shot ownership  -> shots[].transitionIn
P6  frame quantisation: ms -> frames, subtraction durations, contiguity      -> shots[] (frames)
P7  text placement: anchors, windows, collision avoidance, readability       -> text[]
P8  motion graphics scheduling: counters, callouts, grids reveal timing      -> motiongfx[]
P9  SFX scheduling: anchors, spacing, variant rotation, gain                 -> sfx[]
P10 music layout: sections, crossfades, ducking curve from RMS               -> music[], duckCurve
P11 segment routing + chunking + hashing + log                               -> chunks[], placement.log
```

Passes P0 to P6 work in milliseconds until P6. From P6 on, everything is
frames. P7 to P11 never touch a cut.

## 4. P3: emphasis map

Professional editors cut on emphasised words. Per word, within its section:

```
emph = 0.45*z(rms) + 0.25*z(duration) + 0.15*(gapBefore > 250ms ? 1 : 0)
     + 0.15*(director emphasisWordIds contains id ? 1 : 0)
```

`z` is the z-score within the section. `emph >= 1.0` is `strong`;
`>= 0.5` is `medium`.

Uses:
- P1 splits a long beat right before a strong word when it can.
- P7 snaps text anchors to the strongest word in the text span.
- P5 and P9 allow `zoom-punch` and `impact-soft` only on strong words.
- Ken Burns zoom peaks (`motion.peakFrame`) land on the strongest word in
  the beat.

## 5. P2: cut points

```ts
const LEAD_MS = cfg.leadMs ?? 100;            // 80..120
export function cutPoints(beats: Beat[], words: Word[], durationMs: number): Cut[] {
  const cuts: Cut[] = [];
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i], next = beats[i+1];
    const startWord = words[b.wordIds[0]];
    // rule: land 100 ms before the first word of the beat, but never before the previous word ends + 40 ms
    const prevWord = words[b.wordIds[0]-1];
    const earliest = prevWord ? prevWord.endMs + 40 : 0;
    const cutMs = i === 0 ? 0 : Math.max(earliest, startWord.startMs - LEAD_MS);
    const endMs = next ? Math.max(words[next.wordIds[0]-1].endMs + 40, words[next.wordIds[0]].startMs - LEAD_MS) : durationMs;
    cuts.push({ beatId: b.id, cutMs, endMs, reason: i === 0 ? "first shot starts at 0" : `word #${b.wordIds[0]} start ${startWord.startMs} minus lead ${LEAD_MS}` });
  }
  return cuts;
}
```

Special cases:
- First shot starts at 0 even if speech starts at 1.2 s. If speech starts
  later than 2.0 s, insert a `chapter-card` (title from section 1) for the
  pre-roll and cut to the first B-roll 100 ms before the first word.
- Pause over 900 ms inside a beat: do not cut inside the pause by default.
  If the beat is over 4.5 s, the Brain may split at pause end minus 100 ms
  and mark the second half `motion: slow-zoom-out`.
- Section boundary: the first beat of a `hook` or `story` section may begin
  with a `chapter-card` of 60 to 90 frames if the section has a title. The
  card starts at the section's first word minus 100 ms; the first B-roll
  follows; card text enters on frame 6 with a spring.
- End: the last shot extends to `durationMs`. If narration ends more than
  1.5 s before the audio ends, an `end-card` fills the tail.

## 6. P4: shot assignment and layout override rules

Inputs per beat: Director preference, asset facts (kind, orientation,
resolution, count of good candidates), text presence, beat length, history.

Override rules, applied in this order:

1. Asset is portrait and layout is full-screen -> `pip-over-blur`.
2. Asset is SD archival -> `fullscreen-image-kenburns` disabled; use
   `pip-over-blur` with `vintage` sub-grade or letterbox.
3. Beat < 2.2 s -> no grids, no counters, no list reveals; downgrade to
   `fullscreen-clip`.
4. Beat has text and layout is `grid-*` -> text becomes grid labels or is
   dropped. Never both floating text and grid labels.
5. Three consecutive same-family layouts -> force a different family.
   Prefer `split-*` after full-screens and `fullscreen-*` after splits or
   grids.
6. Two consecutive Ken Burns images -> the second becomes a clip if any
   video candidate scored >= threshold - 0.02; else alternate zoom direction
   (in then out).
7. Beat text contains a number with a unit or a percentage -> prefer
   `stat-counter` if beat >= 2.5 s.
8. Beat text is a quotation (quote marks, or "said", "wrote") ->
   `quote-card` eligible.
9. No asset passes threshold after all sources -> `typographic-card` with
   the beat's key phrase (strongest 2 to 5 consecutive words by emphasis).
   Never an AI image. Cap: 15 percent of beats (`brain.typographic_cap`),
   never two in a row, all listed in `report.md`.
10. YouTube Y2 asset -> layout must show the corner credit; no grid cells;
    duration clamps to 149 frames; a longer beat gets the next-best stock
    alternate for the remainder.

In and out points come from `assets.json` (sourcing 8.8). If the prepared
clip is shorter than needed plus the next transition, prefer the alternate
asset; else freeze the last frame (`freezeAfterFrame`).

Layout families (`layoutFamily()` in `types.ts`): fullscreen, split, grid,
pip, card, graphic.

## 7. P5: transition assignment

Per cut between shot i and i+1:

- Base type from the entering shot's `transitionFamily` and section mood.
  Rotation: no identical type twice in a row except `cut`.
- Duration by family: `cut` 0; `fade`, `luma-dissolve` 12 to 18; `wipe`,
  `slide`, `push-blur` 10 to 14; `zoom-punch`, `whip-pan`, `glitch` 6 to
  10; `flip`, `iris`, `clockWipe` 12 to 16. Subtract 2 frames if either
  adjacent shot is under 2.2 s. Force `cut` if the entering shot is under
  1.8 s.
- Cadence: at most one non-cut transition every 2 cuts in `explain`
  sections, every 3 cuts in `story`, unlimited in `hook` (never two
  `zoom-punch` in a row).
- Ownership: the transition belongs to the ENTERING shot and completes
  exactly at its cut frame. Entering shot gets `from = cutFrame - T` and
  `durationInFrames = D + T`. The exiting shot is untouched. The entering
  media needs T extra head frames: the Brain writes `headPadFrames: T` into
  `assets.json`; prepare trims from `inMs - T*33.33` when possible, else the
  presentation holds frame 0 for the head (fine for fades; for wipes prefer
  assets with headroom).
- Emphasis gating: `zoom-punch` only when the entering beat's first word is
  `strong`; `whip-pan` direction alternates left and right; `glitch` at most
  once per 60 s.
- Routability: both shots FFmpeg-routable and transition in {cut, fade}
  keeps the segment on FFmpeg. Any other transition promotes the entering
  shot, and so the segment boundary, to Remotion.

## 8. P6: frame quantisation

See `timing-contract.md` for the code. Summary: `msToFrame` on cut starts,
durations by subtraction, `enforceBounds(45, 180)`, then assert total and
contiguity. A shot under 45 merges into the shorter neighbour and keeps the
earlier asset. A shot over 180 splits at the strongest word start minus 3
frames; the second half uses the alternate asset.

## 9. P7: text placement

For each beat with text:

1. Anchor: `from = msToFrame(words[anchorWordId].startMs) - 2`. If the
   Director's anchor is outside the text span or weak, re-anchor to the
   strongest word of the span.
2. Duration: `min(beatEndFrame - from - 5, readingFrames)` where
   `readingFrames = clamp(30 * (0.9 + 0.35 * wordCount), 45, 150)`. Under 30
   frames: drop the text, log "unreadable window".
3. Position: Director's preference, then collisions. Never overlap a
   `lower-third`, a grid label, a corner credit (Y2 or CC) or a caption band.
   If the CLIP-detected subject is centred, prefer lower-left or lower-right.
   On `split-*` layouts text lives in the panel.
4. Scrim always on over media (gradient or 40 percent box), never on panels.
5. Enter 8 frames spring, exit 6 frames, exit completes 5 frames before beat
   end.
6. Density cap: at most 50 percent of beats in any 60 s window carry text.
   Over the cap, drop text from the lowest `importance` beats.
7. Word-by-word styles use each word's own timestamp (`wordFrames[]`). A word
   shorter than 4 frames borrows 2 frames from the next word's start.

## 10. P8: motion graphics scheduling

- `stat-counter`: counts from 0 (or the previous value in a series) to the
  target; `countFrames = min(60, beatFrames - 20)`; tick SFX every 6 frames
  at -22 dB; the tick train is one SFX event for spacing.
- `grid-N`: cell k appears at `from + 6 + k * stagger`,
  `stagger = clamp((beatFrames - 30) / (N + 1), 4, 10)`; labels 4 frames
  after their cell; each reveal gets a `click` unless within 45 frames of
  another SFX (ticks excepted).
- `list-reveal`: line k appears at the start frame of the word that begins
  line k's text (verbatim mapping to the transcript) minus 2 frames.
- `highlight-box`, `arrow-callout`, `underline-draw`: anchored to the
  strongest word in the beat, 10 frame draw-on.
- `progress-bar-top`: continuous, section-aware, no SFX.
- `chapter-card`: 60 to 90 frames, title enters frame 6, subtitle frame 14,
  exits with the section's default transition into the first B-roll.

## 11. P9: SFX scheduling

```ts
export function scheduleSfx(events: SfxCandidate[], packs: SfxPack, rng: Rng): SfxItem[] {
  const MIN_GAP = 45;
  const sorted = events.sort((a, b) => a.frame - b.frame || b.priority - a.priority);   // priority: transition 3, text-in 2, grid-cell 1, tick-train 1
  const placed: SfxItem[] = [];
  for (const e of sorted) {
    const last = placed.at(-1);
    if (last && e.frame - last.from < MIN_GAP && !(e.kind === "tick-train")) { log(e, "dropped: spacing"); continue; }
    const file = packs.pick(e.tag, rng, last?.tag === e.tag ? last.file : undefined);       // rotate variants, never same file twice in a row
    const volume = baseGain[e.tag] * (e.strong ? 1.15 : 1.0) * sectionGain[e.sectionKind];  // whoosh 0.35, pop 0.30, click 0.25, impact 0.4, tick 0.12
    placed.push({ id: nextId(), from: e.frame, src: file, volume: Math.min(volume, 0.5), reason: e.reason });
  }
  return placed;
}
```

Anchors: transition SFX at `cutFrame - T`; text pop at text `from`; grid
clicks at each cell reveal; `impact-soft` only on `zoom-punch` cuts on
strong words; `riser-short` once per section, starting 45 frames before a
`chapter-card`. Hard cuts get no SFX. Whooshes are pitched by direction:
left-to-right files for `from-left` wipes when the pack has them
(`direction: ltr|rtl` in the manifest).

## 12. P10: music layout and ducking

- One track per section by `musicTag`. Consecutive sections with the same
  tag continue the same track (no restart).
- Item: `from = sectionStartFrame - 30`, `fadeInFrames 30`,
  `fadeOutFrames 45`, 60 frame overlap crossfade with the next track.
- Track shorter than the section: loop at a bar boundary
  (`bar = 4 * 60 / bpm` s from the manifest) with a 2 frame crossfade
  (`loopAtFrames[]`). Never a hard restart.
- Base volume by mood: 0.10 to 0.16 (about -22 to -26 dB under voice).
- Ducking from `rms50ms.txt`: `duck[f] = speech(f) ? base * 0.45 : base`,
  smoothed with 12 frame attack and 24 frame release; `speech(f)` when RMS
  > -40 dB. Written as `duckCurve.json` (one value per frame) for Remotion
  `volume={(f) => duck[f]}` and as a `sidechaincompress` fallback for the
  FFmpeg mixer.
- Music never plays over a `chapter-card` riser above 0.08.

## 13. P11: routing, chunking, hashing, logging

Route `ffmpeg` when all hold: layout in {fullscreen-clip,
fullscreen-image-kenburns}; no text; no motiongfx; transitionIn in {cut,
fade}; motion in {none, ken-burns, slow-zoom-out}; grade in the
FFmpeg-expressible set (effects-catalogue 16.5); asset not Y2. Otherwise
`remotion`.

Segments: consecutive same-route items merge. A Remotion segment absorbs the
transition frames at its head. Segment boundaries are multiples of 30 frames
when possible: extend the Remotion segment backwards over the FFmpeg one by
up to 29 frames; Remotion renders those frames from the same JSON, which is
exact.

Chunks: Remotion segments over 4,000 frames split further for the matrix.

Hash per segment = sha1(JSON of all items intersecting it + component
version + grade params). Unchanged hashes skip re-rendering.

`placement.log.jsonl`: one line per decision:
`{pass, beatId, decision, from, durationInFrames, reason, overrides:[...]}`.

## 14. Invariants

Asserted in the Brain, recomputed by the validator.

| Id | Invariant |
|---|---|
| I1 | contiguity and total frames |
| I2 | shot bounds 45..180 (Y2 45..149) |
| I3 | transition completes at cut frame |
| I4 | no text beyond beat end minus 5 |
| I5 | text verbatim from transcript |
| I6 | SFX spacing >= 45 frames |
| I7 | music volume cap; no music restart within a section |
| I8 | asset reuse: never within 2,700 frames, max 2 uses |
| I9 | layout family run length <= 2 (3 for hook sections with beats under 2.2 s) |
| I10 | Y2 rules: no audio, credit present, one per source, not in grids |
| I11 | every credit-requiring asset (CC BY, Pexels courtesy, Y1, Y2) appears in `credits` |
| I12 | determinism: same inputs and seed produce identical `timeline.json` (CI test) |

## 15. Repair mode

QC (pipeline stage 10) returns actions per beat. The Brain applies them and
re-runs only the affected passes:

| Action | Re-run |
|---|---|
| `swap-alternate` | replace asset from `alternates`; P4 to P6 for the beat and its neighbours (head padding may change); P11 |
| `move-text`, `drop-text` | P7 for the beat; P9 (its pop SFX); P11 |
| `change-layout` | P4 to P11 for the beat and its two neighbours |
| `shorten` (human review only) | may not move a cut off a word start; the Brain picks the nearest word start |

All repairs are logged. Hashes decide which segments re-render.

## 16. Tests the Brain ships with

- Property tests (fast-check): random transcripts of 50 to 5,000 words with
  random gaps produce timelines that satisfy I1 to I12.
- Golden tests: three real transcripts with committed `timeline.json`
  snapshots.
- Regression: the "40 cuts checked by eye" list from milestone M4 encoded
  as frame assertions.

Run with `npm test`. A Brain change that breaks a golden snapshot needs a
written reason in the commit message before the snapshot is updated.

## 17. Rules for editing the Brain

- Do not add randomness outside the seeded RNG.
- Do not read the Director's ms values as truth; they do not exist. The
  Director outputs word IDs and beat IDs only.
- Do not convert ms to frames anywhere except `msToFrame`.
- Every new decision writes a log line with a reason.
- Every new override lands in the `overrides[]` of the log line.
- A new hard rule needs an invariant, a validator check and a property test.
