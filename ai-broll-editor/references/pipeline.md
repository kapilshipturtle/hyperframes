# Pipeline: stage by stage

Every stage reads and writes files inside one job directory:
`ai-broll-editor/work/<job_id>/`. Planning files carry milliseconds.
`timeline.json` carries frames only. Nothing renders until the validator
exits 0.

Run every command from the package root (`ai-broll-editor/`). npm scripts
come from `package.json`. Python stages live in `scripts/py/` and take
`--job <job_id>`.

```
ingest -> transcribe -> align -> transcript.json -> segment -> direct
 -> source -> score/pick -> prepare -> brain -> validate -> chunks
 -> ffmpeg segments + remotion matrix -> normalize -> audio mix -> concat
 -> qc stills -> vision QC -> repair -> re-render changed segments
```

## Stage 0: job setup

Inputs: narration audio (mp3, wav, m4a, or a video file).

```bash
JOB=my-job-01
mkdir -p work/$JOB/{asr,sections,plans,assets,prepared,segments,qc,cache,yt}
cp templates/job.yaml work/$JOB/job.yaml
cp /path/to/narration.mp3 work/$JOB/input.mp3
$EDITOR work/$JOB/job.yaml     # job_id, input_audio, preset, grade, toggles
```

Outputs: `work/<job>/job.yaml`, `work/<job>/input.mp3`.

Ask the user the six questions in SKILL.md before editing `job.yaml`.

## Stage 1: ingest (spec 4)

```bash
npm run ingest -- --job $JOB
```

Runs FFmpeg only. Produces:

| File | Purpose |
|---|---|
| `narration16k.wav` | whisper.cpp and WhisperX input |
| `narration16k_32k.mp3` | Groq upload (40 min is about 9.6 MB) |
| `narration_norm.m4a` | loudnorm I=-16, 48 kHz AAC, the final voice track |
| `duration_s.txt` | ffprobe duration |
| `silences.txt` | silencedetect -35 dB, 0.4 s |
| `rms50ms.txt` | RMS every 50 ms; feeds emphasis (Brain P3) and ducking (P10) |

Runs on the runner or locally. Local ffmpeg 4.2 is fine for this stage.

## Stage 2: transcription (spec 5)

Default engine is Groq `whisper-large-v3-turbo` with word timestamps, then
WhisperX forced alignment on CPU.

```bash
export GROQ_API_KEY=...            # console.groq.com, free tier
python3 scripts/py/transcribe_groq.py --job $JOB        # -> asr/groq.json
python3 scripts/py/align_whisperx.py --job $JOB         # -> asr/aligned.json
python3 scripts/py/to_transcript_json.py --job $JOB     # -> transcript.json
python3 scripts/py/emphasis.py --job $JOB               # attaches rms + gapAfterMs
```

Groq chunks the audio in 600 s pieces with 2 s overlap; overlapping words
keep the earlier chunk. Groq free limits: 20 RPM, 2,000 RPD, 7,200 audio
seconds per hour, 28,800 per day, 25 MB per file. A 40 minute file is 2,400
audio seconds.

Offline fallback (no key, or Groq 429 on the daily cap):

```bash
npm run transcribe:whispercpp -- --job $JOB   # @remotion/install-whisper-cpp, small.en, --dtw
```

GPU option: WhisperX end to end on Kaggle or a self-hosted GPU
(`transcription.engine: whisperx`).

Post-processing (all engines) makes words monotonic and non-overlapping,
interpolates untimed tokens at conf 0.3, applies `corrections.json`
(`{"wrong": "right"}`) so on-screen text is right, attaches per-word `rms`
and `gapAfterMs`, and marks sentence and clause boundaries.

Output: `transcript.json` (spec 10.1).

## Stage 3: segmentation (spec 6)

```bash
npm run segment -- --job $JOB          # -> beats.json (beats + sections)
```

Deterministic TypeScript: sentences on `.?!` or gaps over 350 ms; long
sentences split at clause boundaries; short ones merged; every beat 1.5 to
6.0 s. Sections (chapters) come from one LLM call returning
`{chapters:[{title,startWordId,kind}]}` with kinds
`hook|explain|story|list|comparison|outro`, 90 to 240 s each, starting on
sentence starts. The segmenter validates it against `schemas/beats.schema.json`.

Never hand-segment. If beats look wrong, fix the transcript or the
segmenter, then re-run.

Output: `beats.json` (spec 10.2), `sections/sec_NN.prompt.txt` (Director
prompts, one per section).

## Stage 4: the Director (spec 7)

The Director is the only LLM step that touches the edit. It writes intent,
never times. It runs per section inside the Claude Code session, or in
batch:

```bash
npm run direct -- --job $JOB
# under the hood, per section:
# claude -p --output-format json --system-prompt-file references/director-system.md \
#   "$(cat work/$JOB/sections/sec_01.prompt.txt)" > work/$JOB/plans/sec_01.raw.json
```

Each answer is Ajv-validated against `schemas/shotplan.schema.json`. On
failure the stage re-prompts with the errors (max 3), then falls back to the
rule-based planner. Read `references/director-system.md` for the exact
contract.

Query consolidation happens here: queries cluster by normalised string and
`open_clip` text-embedding cosine >= 0.92; one search per cluster; beats in
one cluster take different candidates.

Output: `plans/sec_NN.json` and the merged `shotplan.json` (spec 10.3).

## Stage 5: sourcing (spec 8)

```bash
export PEXELS_API_KEY=...
python3 scripts/py/source_assets.py --job $JOB     # chain: pexels -> openverse -> wikimedia -> nasa -> archive.org
python3 scripts/py/score_clip.py --job $JOB        # open_clip ViT-B-32 + pHash
python3 scripts/py/pick_shot.py --job $JOB         # PySceneDetect + in-point selection
```

Optional, home machine only (never on hosted CI):

```bash
python3 scripts/py/youtube_cc.py --job $JOB        # Y1, and Y2 only if youtube_short_clip: true
python3 scripts/py/archive_org.py --job $JOB       # Internet Archive downloads
```

Source chain and stop rule are in `references/sourcing.md`. YouTube rules
are in `references/youtube-policy.md`. User-supplied media in
`work/<job>/assets/user/` tagged to a beat beat every other source.

Output: `assets.json` (spec 10.4) with `chosen` and `alternates` per beat,
raw downloads in `assets/`.

## Stage 6: prepare (spec 9)

```bash
npm run prepare -- --job $JOB          # -> prepared/b_XXXX.mp4 | .jpg
```

FFmpeg pre-trims every asset to exact placement length plus the next
transition plus 0.2 s. 1920x1080, 30 fps, yuv420p, GOP 30, H.264 High 4.1,
BT.709 tags, no audio stream. SD archival is lanczos-upscaled and
letterboxed on purpose. Short sources freeze the last frame. Never loop.
Images for Ken Burns are oversized to 2560x1440.

## Stage 7: the Brain (spec 11)

```bash
npm run brain -- --job $JOB
```

Deterministic. Same inputs and seed produce byte-identical output. Emits
`timeline.json`, `chunks.json`, `placement.log.jsonl`, `audio-mix.json`,
`duckCurve.json`, and writes `headPadFrames` back into `assets.json`. Read
`references/brain.md` before changing anything here.

## Stage 8: validate (spec 12)

```bash
npm run validate -- --job $JOB
```

Independent of the Brain. Schema check, invariants I1 to I12 recomputed from
scratch, filesystem and ffprobe checks on every `media.src`, text substrings
verified against the transcript, transition durations, credits completeness,
determinism re-run. Exits non-zero before any render minute is spent. Never
skip it and never edit `timeline.json` by hand to get past it.

## Stage 9: render (spec 13, 19)

Heavy stages run on GitHub Actions. See `references/render-playbook.md`.

```bash
git add work/$JOB && git commit -m "job: $JOB plan" && git push
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18
gh run watch
gh run download -n final-$JOB -D work/$JOB/out
```

Locally the same steps are:

```bash
npm run chunks -- --job $JOB --workers 18 --route remotion
npm run ffmpeg-segments -- --job $JOB
npm run render -- work/$JOB/segments/seg_0002.mp4 --props=work/$JOB/timeline.json --frames=900-1499 --codec h264 --crf 18 --x264-preset veryfast --muted
npm run normalize-segment -- work/$JOB/segments/seg_0002.mp4
npm run audio-mix -- --job $JOB
npm run concat -- --job $JOB
```

Local render needs ffmpeg 4.3 or newer (`xfade`). The laptop has 4.2, so do
not attempt Tier 2 locally; use the workflow.

## Stage 10: QC loop (spec 15)

```bash
npm run qc-stills -- --job $JOB        # 2 stills per broll item, 1 per text item, contact sheets per section
```

Review the contact sheets with the beat texts in the Claude Code session.
Produce one action per flagged beat:

```
{beatId, issue: none|off-topic|watermark|text-cut|unreadable|black|duplicate|letterbox|credit-missing,
 action: ok|swap-alternate|move-text|drop-text|change-layout}
```

Save as `work/<job>/qc/actions.json`, then:

```bash
npm run brain -- --job $JOB --repair work/$JOB/qc/actions.json
npm run validate -- --job $JOB
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18   # only segments with changed hashes re-render
```

Final asserts: frame count equals `durationInFrames`; `blackdetect` finds
no black run over 15 frames outside intentional cards; A/V sync at three
points; loudness in range (-14 LUFS integrated).

## Deliverables

`work/<job>/final.mp4`, `report.md` (typographic cards, Y2 clips, swaps),
`credits.json`, `placement.log.jsonl`. Y2 clips are listed in the report so
the user can remove any before publishing.
