---
name: ai-broll-editor
description: End-to-end automated B-roll video editor using real stock and archival footage only. Use whenever the user provides narration, voiceover, podcast or talking-head audio (or video) and wants a finished, professionally edited video with B-roll clips and images, transitions, motion graphics, text overlays, sound effects, colour grading or captions rendered with Remotion (or HyperFrames). Trigger on "make a video from this audio", "add b-roll", "edit this voiceover", "faceless video", "documentary edit", "render with remotion", "fix the timing", "swap this clip", "re-render section 3", or any request to turn speech into an edited visual video, and for setting up or debugging the GitHub Actions render pipeline.
---

# ai-broll-editor

Turn a 25 to 40 minute narration into a professionally edited B-roll video.
Real footage and real images only. Every cut, transition, text, sound and
music segment lands on the exact frame a deterministic placement engine (the
Brain) chose from word-level timestamps. Remotion and FFmpeg render exactly
what `timeline.json` says. Heavy work runs free on GitHub Actions.

Package code: `~/hyperframes/ai-broll-editor/` (public repo
`kapilshipturtle/hyperframes`). All commands below run from that directory.
Job directory: `ai-broll-editor/work/<job_id>/`, created from
`templates/job.yaml`.

Full specification: `references/spec-v3.md` in the package. The files under
`references/` in this skill are the working documents; read them, not the
spec, unless a detail is missing.

## Non-negotiable rules

1. Before touching any Remotion code, install and read the Remotion skills:
   `npx skills add remotion-dev/skills`, then read `/remotion-best-practices`.
2. Run the stages in order. Every stage reads and writes files in the job
   directory. Do not skip one because its output "looks right".
3. Never bypass the Brain or the validator. Never edit `timeline.json` or
   `chunks.json` by hand. If a placement is wrong, fix the input or the rule
   and re-run. Read `references/brain.md` before touching placement code.
4. Never generate AI images or video. The visual fallback chain ends in a
   typographic card built from the narration's own words. That is the only
   fallback.
5. Treat YouTube exactly as `references/youtube-policy.md` says. Y1
   (Creative Commons) only when `youtube: true`. Y2 only when the user sets
   `youtube_short_clip: true` for this job after reading the policy. Both
   run on the home machine only. This is not legal advice.
6. Pixabay is not used. Do not add it back. The chain is Pexels videos ->
   Pexels photos -> Openverse -> Wikimedia Commons -> NASA -> Internet
   Archive -> YouTube Y1 -> YouTube Y2 (opt-in) -> typographic card.
7. Finish every job with the QC loop. A render that has not been through QC
   stills and vision review is not done.
8. One conversion function: `msToFrame` in `scripts/ts/types.ts`. Durations
   are by subtraction. See `references/timing-contract.md`.
9. Bugs go into the skill. Every failure found during a run becomes a
   checklist line in `references/troubleshooting.md` plus a code or doc fix,
   in the same commit, at the time it is found.
10. Always a fresh run. Do not reuse an old job's plans or assets as answers
    for a new job.

## Ask first

Put these to the user as one short checklist before creating `job.yaml`.
Offer every option; do not recommend one.

- [ ] Style preset: `documentary` | `energetic` | `calm` | `tech`.
- [ ] Grade: `clean-cool` | `warm-film` | `teal-orange` |
      `muted-documentary` | `high-contrast-bw` | `vibrant` | `night` |
      `vintage`. The Director may set a per-section grade on top.
- [ ] Captions: on or off (off is the default for 16:9 long-form).
- [ ] Music: on or off. SFX: on or off.
- [ ] YouTube tiers: none | Y1 (Creative Commons only) | Y1 + Y2 (opt-in,
      under 5 s, no audio, credited, listed in the report). Point to
      `references/youtube-policy.md` before Y2.
- [ ] Sources to enable: Pexels, Openverse, Wikimedia Commons, NASA,
      Internet Archive (order is fixed; toggles only). Any user media to
      drop into `work/<job>/assets/user/`?
- [ ] Brand: primary colour, accent colour, heading font, body font
      (defaults in `templates/job.yaml`).
- [ ] Proper nouns for the Whisper glossary and any known corrections.

## Environment

| Variable | Where | Notes |
|---|---|---|
| `PEXELS_API_KEY` | repo secret exists; export locally for sourcing | paced 12 s, cached 24 h |
| `GROQ_API_KEY` | user creates at console.groq.com (free); `gh secret set GROQ_API_KEY` | transcription; whisper.cpp fallback if absent or capped |
| `YOUTUBE_API_KEY` | optional | Data API for Y1/Y2 search; stage skipped without it |

Never paste a key into chat or a file. Never reuse a key seen in chat.
Tools: Node 22, ffmpeg (4.3+ for `xfade`, the laptop has 4.2 so segments
render on the runner), Python 3.10+ for the heavy Python stages, `gh` CLI
authenticated, Deno only on the home machine for YouTube.

## Where things run

- The Director (the only creative LLM step) runs inside this Claude Code
  session, or in batch with
  `claude -p --output-format json --system-prompt-file references/director-system.md`.
- Ingest, segmentation, Director, light sourcing, Brain and validator run
  locally or on the runner.
- Internet Archive downloads and YouTube run only on the home machine.
- FFmpeg segments, the Remotion matrix, mix, concat and QC stills run on
  GitHub Actions: workflow `broll-render.yml`, working directory
  `ai-broll-editor`. See `references/render-playbook.md`.

## The run

Stage details, inputs and outputs: `references/pipeline.md`.

```bash
cd ~/hyperframes/ai-broll-editor
JOB=<job_id>

# 0. job
mkdir -p work/$JOB/{asr,sections,plans,assets,prepared,segments,qc,cache,yt}
cp templates/job.yaml work/$JOB/job.yaml && cp <audio> work/$JOB/input.mp3
# edit work/$JOB/job.yaml from the answers above

# 1. ingest (FFmpeg: 16 kHz wav, 32k mp3 for Groq, loudnorm m4a, silences, RMS 50 ms)
npm run ingest -- --job $JOB

# 2. transcribe + align -> transcript.json
python3 scripts/py/transcribe_groq.py --job $JOB      # or: npm run transcribe:whispercpp -- --job $JOB
python3 scripts/py/align_whisperx.py --job $JOB
python3 scripts/py/to_transcript_json.py --job $JOB
python3 scripts/py/emphasis.py --job $JOB

# 3. segment -> beats.json (deterministic; never hand-segment)
npm run segment -- --job $JOB

# 4. direct -> shotplan.json (intent only; Ajv-validated; max 3 re-prompts; rule-based fallback)
npm run direct -- --job $JOB

# 5. source -> assets.json
python3 scripts/py/source_assets.py --job $JOB
python3 scripts/py/score_clip.py --job $JOB
python3 scripts/py/pick_shot.py --job $JOB
# home machine only, if enabled:
python3 scripts/py/youtube_cc.py --job $JOB
python3 scripts/py/archive_org.py --job $JOB

# 6. prepare -> prepared/*.mp4|jpg (exact length, 1080p30 yuv420p GOP 30, no audio)
npm run prepare -- --job $JOB

# 7. brain -> timeline.json, chunks.json, placement.log.jsonl, duckCurve.json
npm run brain -- --job $JOB

# 8. validate (exits non-zero before any render minute)
npm run validate -- --job $JOB

# 9. render on GitHub Actions
git add work/$JOB && git commit -m "job: $JOB ready" && git push
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18
gh run watch
gh run download -n final-$JOB -D work/$JOB/out

# 10. QC loop
npm run qc-stills -- --job $JOB
# review contact sheets with beat texts; write work/$JOB/qc/actions.json
npm run brain -- --job $JOB --repair work/$JOB/qc/actions.json
npm run validate -- --job $JOB
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18   # changed segments only
```

Self-hosted GPU runner: add `-f runner=self-hosted`. Flags and NVENC
settings are in `references/render-playbook.md`.

## QC loop

1. `qc-stills`: 2 frames per B-roll item (start + 8, midpoint), 1 per text
   item (from + 10), 640 px, contact sheets per section.
2. Review in this session with the beat texts. One line per flagged beat:
   `{beatId, issue: none|off-topic|watermark|text-cut|unreadable|black|duplicate|letterbox|credit-missing, action: ok|swap-alternate|move-text|drop-text|change-layout}`.
3. Brain repair mode applies the actions and re-runs only the affected
   passes. Validator. Re-render only segments whose hash changed.
4. Asserts: frame count equals `durationInFrames`; no black run over 15
   frames outside cards; A/V sync at three points; -14 LUFS.
5. Read `report.md`: typographic cards, Y2 clips, CC BY credits. Hand the
   list to the user before they publish.

## What the Brain does (short)

Eleven deterministic passes: beat repair, cut points (word start minus 100
ms), emphasis map from RMS, shot assignment with ten ordered layout
override rules, transition assignment (entering shot owns it, completes at
the cut frame), frame quantisation by subtraction, text placement with
readability and collision rules, motion graphics timing, SFX spacing 45
frames, music layout with RMS ducking, routing to FFmpeg or Remotion with
per-segment hashes. Twelve invariants asserted, then recomputed by the
validator. Every decision has a reason line in `placement.log.jsonl`.

Seed is sha1(job_id). Same inputs give byte-identical `timeline.json`.

## References

| File | Read when |
|---|---|
| `references/pipeline.md` | running or debugging any stage |
| `references/timing-contract.md` | anything touches ms, frames, durations |
| `references/brain.md` | before changing placement code |
| `references/director-system.md` | the system prompt for `claude -p`; changing the Director |
| `references/effects-catalogue.md` | layouts, transitions, text styles, grades, SFX and music tags |
| `references/sourcing.md` | asset chain, Pexels pacing, licence filters, scoring |
| `references/youtube-policy.md` | before enabling Y1 or Y2 |
| `references/render-playbook.md` | the workflow, tiers 0 to 4, incremental re-render, GPU flags |
| `references/audio-mix.md` | music, ducking, SFX gains, final mux |
| `references/troubleshooting.md` | any failure; add a line for every new one |

## Troubleshooting pointers

- Pexels 429 on back-to-back calls: expected; 12 s floor handles it. Never
  lower it, never scrape.
- Openverse hangs: 8 s timeout, chain moves on; disable the source for the
  job if it stalls a whole run.
- Groq 429 on the daily cap: fall back to `npm run transcribe:whispercpp`.
- `xfade` missing locally: ffmpeg 4.2; render on the runner.
- Python wheels fail locally: Python 3.8; use the runner or a 3.10+ venv.
- Grade seam at a segment boundary: fix the pair in `grades.json`, not the
  segment.
- Whisper misspells a name: glossary in `job.yaml`, then
  `corrections.json`, then re-run `to_transcript_json.py`.
- Validator I1 drift: someone converted ms to frames outside `msToFrame`.
- Validator I5 text not verbatim: transcript changed after the Director ran;
  re-run `direct` for that section.
- Artifact not found: 1 day retention expired; re-run the workflow.
- Full list with causes and fixes: `references/troubleshooting.md`.

## Licences

Remotion Free License covers individuals and companies up to 3 people.
Everything sits behind the `timeline.json` boundary so HyperFrames (Apache
2.0) can replace the renderer. Pexels, Openverse (commercial filter),
Wikimedia (CC0, CC BY, CC BY-SA, PD), NASA and Internet Archive public
domain need the credits the Brain emits. Music and SFX packs: Mixkit,
Kenney (CC0), YouTube Audio Library, Incompetech (CC BY). YouTube use is
described in `references/youtube-policy.md`; it is not legal advice.

## Keeping skill and package in sync

`scripts/skill-sync.sh` copies `SKILL.md` from this skill directory into
the package and `references/*.md` (except `spec-v3.md`) from the package
into this skill directory. Run it after editing either side. The skill
directory is the source of truth for `SKILL.md`; the package is the source
for references.
