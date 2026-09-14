# Render playbook

Source: spec-v3 sections 13 and 19, adapted to this repo. Workflow file:
`.github/workflows/broll-render.yml` in `kapilshipturtle/hyperframes`.
Working directory inside the workflow: `ai-broll-editor`. A 40 minute video
is 72,000 frames.

## Where things run

| Stage | Where |
|---|---|
| Ingest, transcription, segmentation, Director, sourcing (Pexels, Openverse, Wikimedia, NASA), scoring, prepare, Brain, validator | laptop or runner (laptop is fine for everything up to prepare, but see troubleshooting: local ffmpeg 4.2 has no `xfade`) |
| Internet Archive downloads, YouTube Y1 and Y2 | home machine only |
| FFmpeg segments, Remotion matrix, normalize, audio mix, concat, QC stills | GitHub Actions `broll-render.yml` |
| Vision QC | Claude Code session |

## The standard run

```bash
cd ai-broll-editor
npm run brain -- --job $JOB && npm run validate -- --job $JOB
git add work/$JOB/{job.yaml,transcript.json,beats.json,shotplan.json,assets.json,timeline.json,chunks.json,placement.log.jsonl,duckCurve.json,prepared}
git commit -m "job: $JOB ready to render" && git push
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18
gh run watch
gh run download -n final-$JOB -D work/$JOB/out
```

`final-<job>` contains `final.mp4`, `report.md` and `credits.json`
(retention 7 days). Intermediate artifacts (`job-<job>`, `seg-<job>-*`) keep
for 1 day and are uncompressed.

Prepared assets must reach the runner. Commit `work/<job>/prepared/` (they
are pre-trimmed, a few MB each) or attach them to a release and let the
plan job fetch them. Do not make the runner re-download from Pexels; that
burns the paced quota.

## Workflow shape (spec 19)

Three jobs:

1. `plan`: checkout, Node 22, `npm ci`, cached Chrome
   (`~/.cache/remotion`), `npx remotion browser ensure`, `npm run brain`,
   `npm run validate`, `npm run chunks -- --route remotion` (matrix output),
   `npm run ffmpeg-segments`, upload `job-<job>`.
2. `render`: matrix over the chunks, `max-parallel: 18`,
   `fail-fast: false`. Each job renders one chunk with
   `remotion render remotion/src/index.ts Main --props=work/<job>/timeline.json --frames=a-b --codec h264 --crf 18 --x264-preset veryfast --muted --concurrency 2 --timeout 120000`,
   then `npm run normalize-segment`, then uploads `seg-<job>-<chunk>`.
3. `finish`: downloads everything, `npm run audio-mix`, `npm run concat`,
   `npm run qc-stills`, uploads `final-<job>`.

Inputs: `job_id` (required), `workers` (default 18), `runner` (default
`ubuntu-latest`). `concurrency: render-<job_id>`, no cancel-in-progress.
`NODE_OPTIONS=--max-old-space-size=6144`.

The validator runs inside `plan`. A failing validator ends the run before
any render minute is spent.

## Tier 0: correct Remotion settings (spec 13.1)

- `<Video>` from `@remotion/media` for all clips. Prepared clips are H.264
  yuv420p so the OffthreadVideo fallback never fires; set
  `disallowFallbackToOffthreadVideo` in CI to fail fast if it does.
- Pin `remotion` and every `@remotion/*` to one exact version (4.0.524 in
  `package.json`). Never mix.
- `--concurrency`: run `npx remotion benchmark remotion/src/index.ts Main --concurrencies=1,2,3,4`
  once per runner type. Expect 2 on a 4 vCPU hosted runner.
- Multi-process Chrome on Linux is the default since 4.0.137. Keep it.
- Encoder: drafts `--codec h264 --crf 20 --x264-preset veryfast`; final
  `--x264-preset medium --crf 18`. `render.draft: true` in `job.yaml`
  selects the draft flags.
- `--timeout 120000`. Avoid `ripple()`, WebGL LUTs, big blurs and
  `--gl=angle` on hosted runners (no GPU there).
- Preview: `--scale 0.5 --every-nth-frame 5 --x264-preset ultrafast`.

## Tier 1: GitHub Actions matrix (spec 13.2)

Standard runners are free and unlimited for public repos. 6 h per job, 256
matrix jobs max, 20 concurrent jobs on the Free plan. `max-parallel: 18`
leaves headroom for `plan` and `finish`. Identical flags on every chunk,
`--frames=a-b`, GOP-aligned boundaries (multiples of 30), `-c copy` concat.

Artifact storage on the Free plan is 500 MB; `retention-days: 1` on
intermediates keeps it under.

## Tier 2: hybrid FFmpeg + Remotion (spec 13.3)

55 to 70 percent of beats are FFmpeg-routable (Brain P11). FFmpeg builds
those segments at 100 to 300 fps inside the `plan` job:

```bash
ffmpeg -y -i prepared/b_0001.mp4 -loop 1 -framerate 30 -t 3.5 -i prepared/b_0002.jpg -filter_complex "
 [0:v]fps=30,format=yuv420p[a];
 [1:v]zoompan=z='1+0.12*on/(30*3.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p[b];
 [a][b]xfade=transition=fade:duration=0.4:offset=3.34[v0];
 [v0]eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04,vignette=PI/5,format=yuv420p[v]" \
 -map "[v]" -frames:v 195 -r 30 -c:v libx264 -preset veryfast -crf 18 -g 30 -keyint_min 30 -sc_threshold 0 -profile:v high -level 4.1 -pix_fmt yuv420p -an segments/seg_0007.mp4
```

Remotion segments render with `--frames=a-b --muted`, then
`normalize-segment` re-encodes to matching profile, level and GOP only when
ffprobe shows a mismatch. Concat:
`ffmpeg -f concat -safe 0 -i list.txt -c copy video_only.mp4`, then assert
`nb_read_frames == durationInFrames`.

`xfade` needs ffmpeg 4.3 or newer. Hosted `ubuntu-latest` has it. The local
laptop (4.2) does not, so Tier 2 never runs locally.

## Tier 3: self-hosted runner on your PC (spec 13.4)

Free, has a GPU, has a home IP for YouTube. Pass `-f runner=self-hosted`.

Remotion flags: `--gl=angle-egl --chrome-mode=chrome-for-testing --hardware-acceleration=if-possible --video-bitrate 12M`
(drop `--crf`; NVENC has no crf).

FFmpeg segments: `-c:v h264_nvenc -preset p5 -rc vbr -cq 19 -b:v 0 -g 30`.

Jobs may run up to 5 days. The `pre-source` stage (YouTube, Internet
Archive) runs only when `runner == self-hosted`.

## Tier 4: browser preview (spec 13.5)

`renderMediaOnWeb()` from `@remotion/web-renderer`,
`licenseKey: "free-license"`, in desktop Chrome. For section previews only,
never the 40 minute final. The tab must stay open. Or use
`npm run studio` and scrub the timeline for individual frames.

## Incremental re-render (spec 13.6)

Each segment carries a hash: sha1(all items intersecting it + component
version + grade params). After a repair, the Brain re-hashes. The `plan` job
compares against the previous `job-<job>` artifact (or the self-hosted disk)
and emits only changed chunks to the matrix. Unchanged segments are restored
from the previous artifact. Target from milestone M11: swap 10 clips and
re-render only the affected segments in under 10 minutes.

If the previous artifact has expired (1 day), the whole video re-renders.
Keep `final-<job>` (7 days) and re-run within the day when iterating.

## Engine alternative (spec 13.7)

HyperFrames (Apache 2.0). `timeline.json` is renderer-agnostic; an adapter
maps items to `data-composition-id` scenes. Keep every renderer behind the
`timeline.json` boundary so this swap stays possible (D10, Remotion licence
insurance).

## Post-render asserts (spec 15.5)

- Frame count of `final.mp4` equals `durationInFrames`.
- `blackdetect`: no black run over 15 frames outside intentional cards.
- A/V sync checked at three points (start, middle, end) against word starts.
- Loudness: -14 LUFS integrated, true peak -1 dB.

## Budget (spec 21, free path, 40 minute video)

About 50 to 80 minutes wall clock, mostly unattended, at zero cost:
ingest 1 to 2, transcribe and align 4 to 6, plans 5 to 10, sourcing 5 to 12
(longer when Pexels pacing dominates), CLIP 3 to 5, prepare 5 to 8, Brain
seconds, FFmpeg segments 4 to 8, Remotion matrix 8 to 15, finish 2 to 3, QC
and targeted re-render 10 to 15.
