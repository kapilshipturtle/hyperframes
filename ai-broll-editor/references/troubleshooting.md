# Troubleshooting

Rule: every failure found during a run becomes a checklist line here and a
fix in the code or the docs, at the time it is found. Not a memory note, not
a chat message. Add the line under the right heading with the date and the
job id.

## Known environment facts (this machine, 2026-09-14)

- [ ] Local laptop has ffmpeg 4.2.7. It has no `xfade` filter. Tier 2
      FFmpeg segments fail locally with "No such filter: xfade". Run heavy
      stages on the GitHub Actions runner (`ubuntu-latest` ships a newer
      ffmpeg). Ingest, prepare and the audio mix work on 4.2.
- [ ] Local Python is 3.8.10. `whisperx`, recent `open_clip` and
      `scenedetect` wheels target 3.9 or newer. Run the Python stages on the
      runner or in a 3.10+ venv. `broll_common.py` stays stdlib + requests
      so the light stages import on 3.8.
- [ ] Never run more than one heavy local process at a time (CLIP scoring,
      PySceneDetect, any encode). Use `nice -n 19` and check free RAM >= 4 GB
      first. Parallel local workers have frozen this laptop before.
- [ ] Long local renders die when the harness session ends. Use
      `nohup ... &` and poll, or use the workflow.

## Spec 22 risks as a checklist

- [ ] Relevance is the weak spot. Symptoms: off-topic clips in QC. Fixes in
      order: make the Director's queries more concrete; check consolidation
      did not merge unrelated clusters (cosine 0.92); raise
      `brain.clip_threshold` for that job; use `swap-alternate`. Expect 10
      to 20 percent swaps on abstract topics.
- [ ] No AI fallback means abstract beats end on `typographic-card`. The
      Brain caps them at 15 percent (`brain.typographic_cap`) and never puts
      two in a row. `report.md` lists them. Drop user media into
      `work/<job>/assets/user/` and tag it to the beat; user assets beat all
      sources.
- [ ] Groq daily audio cap (28,800 s/day, 7,200 s/hour): a 429 on the
      transcription call switches to `npm run transcribe:whispercpp`
      automatically. If it did not, run it by hand. Both engines produce the
      same `transcript.json` shape.
- [ ] Pexels quota: consolidation, 12 s pacing, 24 h cache. Apply for the
      unlimited tier once the tool is real.
- [ ] YouTube: bot wall on CI, ToS on downloading, no length-based fair-use
      safe harbour. Y1 CC-only by default; Y2 opt-in with hard limits,
      credits and a pre-publish report. Not legal advice.
- [ ] GitHub Free plan: 20 concurrent jobs (`max-parallel 18`), 500 MB
      artifact storage (`retention-days 1` on intermediates), 6 h per job.
- [ ] Remotion licence: free up to 3 people. Keep the HyperFrames adapter
      path open behind `timeline.json`.
- [ ] Angle GPU memory leak on self-hosted: chunking contains it. Keep
      chunks under 4,000 frames.
- [ ] Grade seams between FFmpeg and Remotion segments: the pairs in
      `grades.json` are calibrated once with a test clip. QC stills at
      segment boundaries (`start + 8`) show a seam as a brightness or
      saturation step. Fix the pair, never the segment.
- [ ] Whisper name errors: put proper nouns in `transcription.glossary`
      (the Whisper prompt), add `{"wrong": "right"}` to
      `transcription.corrections` (`corrections.json`), re-run
      `to_transcript_json.py`. Vision QC on text frames catches the rest.

## Sourcing

- [ ] Pexels returns 429 on back-to-back calls even with quota left. This is
      expected. The 12 s floor in `broll_common.py` handles it. Do not lower
      the floor. Do not add a browser scraper.
- [ ] Openverse hangs with no reply. Every request has an 8 s timeout. On
      timeout the chain moves on. If a whole run stalls at Openverse, set
      `sources.openverse: false` for the job.
- [ ] Wikimedia returns files with licences outside CC0/CC BY/CC BY-SA/PD.
      They are rejected before download. If a beat has zero candidates after
      Wikimedia, that is correct behaviour.
- [ ] Internet Archive derivative missing (`h.264` or `MPEG4` not in
      metadata): skip the item. Do not download the original.
- [ ] Prelinger item is not public domain: `licenseurl` filter rejects it.
      Do not override.
- [ ] Duplicate clips across the video: pHash distance < 8 rejects them;
      I8 blocks reuse within 2,700 frames. If QC still sees duplicates,
      the pHash was taken from a black or letterboxed frame; check
      `cropdetect` ran.

## Transcription and timing

- [ ] Words with `conf 0.3` are interpolated (untimed by the aligner). A
      beat starting on one may cut early or late. Re-run alignment with the
      glossary or accept; ±50 ms is invisible at 2 to 6 s cut lengths.
- [ ] A cut that feels inside a word: check `LEAD_MS` is 80 to 120 and that
      `prevWord.endMs + 40` did not push the cut later. The log line for
      that beat says which.
- [ ] Total frame drift: impossible if durations are by subtraction. If the
      validator reports I1, someone converted ms to frames outside
      `msToFrame`. Grep for `* 30` and `/ 1000`.

## Director

- [ ] Schema failure three times in a row: the stage falls back to the
      rule-based planner for that section and logs it. Check the prompt
      file; most failures are a missing `grid` on a `grid-*` layout or text
      that is not a verbatim substring.
- [ ] Director repeats layouts: the Brain overrides (rule 5) and logs it.
      This is fine occasionally. If every section does it, tighten the
      history the prompt shows.

## Brain and validator

- [ ] Validator I5 (text not verbatim): a correction changed the transcript
      after the Director ran. Re-run `direct` for that section.
- [ ] Validator I11 (credit missing): a CC BY or Pexels asset has no
      attribution string. Fix `assets.json`, not `timeline.json`.
- [ ] Determinism test fails: some code path uses `Math.random`, `Date`, or
      object key order from a network response. Sort inputs; use the seeded
      RNG.
- [ ] Shot under 45 frames after quantisation: expected to merge; the log
      says which neighbour. If many merge, the segmenter produced beats
      under 1.5 s; fix the segmenter.

## Prepare

- [ ] "HLG" or "arib-std-b67" in ffprobe of a source: it was mistagged and
      forced a slow HDR path once. Prepare stamps BT.709 on every re-encode.
      If a segment is slow, check the prepared file's colour tags.
- [ ] Prepared clip shorter than needed + transition: the Brain prefers the
      alternate; else `freezeAfterFrame` holds the last frame. Never loop.
- [ ] Portrait source in a full-screen layout: Brain rule 1 routes to
      `pip-over-blur`. If it rendered stretched, the asset's width/height
      in `assets.json` are wrong.

## Render

- [ ] `remotion render` falls back to OffthreadVideo: a prepared clip is not
      H.264 yuv420p. Re-run prepare for that beat. In CI
      `disallowFallbackToOffthreadVideo` makes this a hard error.
- [ ] Chunk times out (120 s per frame budget exceeded): a big blur,
      `ripple()`, or a WebGL LUT is in a component. Remove it; hosted
      runners have no GPU.
- [ ] Concat frame count mismatch: a Remotion segment did not normalise to
      GOP 30 or a chunk boundary is not a multiple of 30. `normalize-segment`
      output shows the mismatch; `chunks.json` shows the boundary.
- [ ] Black frames at a segment head: the entering media had no head
      padding for its transition. `headPadFrames` was not honoured by
      prepare. Check `assets.json` for that beat.
- [ ] Artifact download fails with "not found": the 1 day retention expired.
      Re-run the whole workflow.
- [ ] Wall clock over 40 minutes for a 40 minute video: check the FFmpeg
      routed share in `chunks.json` (target >= 50 percent) and that
      `--concurrency 2` is set.

## Audio

- [ ] Music audibly restarts at a section boundary: two sections with the
      same tag produced two items. P10 should have continued one item.
- [ ] SFX pile up: I6 should have dropped them. If the validator passed, the
      SFX are 45 frames apart but of the same family; the Director put too
      many `energetic` transitions in an `explain` section (cadence rule).
- [ ] Final loudness off target: run `loudnorm` print pass on `mix.m4a`;
      the narration was already at -16, so the offender is music base
      volume above 0.16.

## QC

- [ ] Vision QC flags "unreadable": text over a bright centred subject with
      no scrim. Scrim is mandatory over media (P7 rule 4). Check the text
      component.
- [ ] "credit-missing" on a Y1/Y2 clip: the `corner-credit` motiongfx item
      was not emitted or was covered by text. P7 rule 3 forbids the overlap;
      the log shows the collision decision.

## Adding a line

Format: `- [ ] <symptom>: <cause>. <fix>. (<date>, <job_id>)`. Put the code
fix in the same commit. If the fix is a new hard rule, it also needs an
invariant, a validator check and a property test (brain.md section 17).

## Found during the first proof run (2026-09-14, job worldeconomy)

- [ ] `npm ci` fails on the runner running `tsx scripts/ts/prepare_assets.ts`: npm treats a script literally named `prepare` as a lifecycle hook. Never name a package.json script `prepare`, `install`, `postinstall` or `prepublish`. Fixed by removing it; asset preparation is `scripts/py/prepare_assets.py`.
- [ ] Director output rejected with "must NOT have additional properties emphasisWordIds": the shotplan schema lacked the spec 7 field. Shots now carry optional `emphasisWordIds` and the Brain merges them into P3 emphasis. Any new Director field must be added to types.ts, the schema and director-system.md together.
- [ ] vitest picked up `whisper.cpp/examples/**/*.spec.js` after the local whisper.cpp install. `vitest.config.ts` now restricts tests to `tests/**`.
- [ ] Segmenter property test: absorbing a lone punctuation-split tail into a neighbour could push a beat over 6.0 s with no pause inside it. The segmenter now leaves an unmergeable short group alone and the Brain's P1 repair handles it in frames.
- [ ] Kenney zip links on kenney.nl change per release; scrape the asset page for the current `kenney.nl/media/pages/assets/.../*.zip` URL instead of hard-coding it. Kenney has no whooshes or risers; `whoosh-hard`, `riser-short` and `camera-shutter` tags still need Mixkit or YouTube Audio Library files.
- [ ] `AttributeError: module 'cv2' has no attribute 'CascadeClassifier'` in `pick_shot.py` on the runner: `scenedetect[opencv]` pulled OpenCV 5, which drops the Haar cascade from the core wheel. Pin `opencv-python-headless<4.13`, install plain `scenedetect`, and keep the face-edge penalty optional (returns 0 when unavailable).
