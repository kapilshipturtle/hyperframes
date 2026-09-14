# ai-broll-editor

Turn a long narration (25 to 40 minutes) into a professionally edited B-roll
video using real stock and archival footage only. No AI-generated visuals.
Word-level timestamps drive every cut; a deterministic placement engine (the
Brain) emits one validated `timeline.json`; Remotion and FFmpeg render exactly
that, in parallel, on free GitHub Actions minutes.

This directory is the code half of the Claude Code skill `ai-broll-editor`.
The skill's `SKILL.md` lives in `~/.claude/skills/ai-broll-editor/` and is
mirrored here; the `references/` documents are authored here and mirrored
into the skill. `scripts/skill-sync.sh` keeps both sides equal.

## Layout

```
ai-broll-editor/
  SKILL.md                    mirrored from the skill directory
  README.md
  references/                 spec-v3.md (full spec) + working docs (pipeline, brain, timing, effects,
                              director-system, sourcing, youtube-policy, render-playbook, audio-mix, troubleshooting)
  scripts/ts/                 ingest, transcribe_whispercpp, segment, direct, prepare_assets, brain/, validate,
                              chunks, ffmpeg_segments, normalize_segment, audio_mix, concat, qc_stills, types
  scripts/py/                 transcribe_groq, align_whisperx, to_transcript_json, emphasis, source_assets,
                              score_clip, pick_shot, youtube_cc, archive_org, build_sfx_pack, broll_common
  schemas/                    transcript, beats, shotplan, assets, timeline, chunks, credits (.schema.json)
  remotion/                   Root.tsx, Main.tsx, components/{layouts,transitions,text,motion,grades,graphics}
  assets/                     sfx/, music/, fonts/, overlays/ + manifests
  templates/job.yaml          per-job configuration template
  work/<job_id>/              one directory per job (planning files in ms, timeline.json in frames)
  scripts/skill-sync.sh       two-way mirror with the skill directory
../.github/workflows/broll-render.yml   plan -> 18-worker Remotion matrix -> finish
```

## Quick start

```bash
cd ai-broll-editor
npm ci
npx skills add remotion-dev/skills          # read /remotion-best-practices before editing remotion/
export PEXELS_API_KEY=... GROQ_API_KEY=...

JOB=demo01
mkdir -p work/$JOB/{asr,sections,plans,assets,prepared,segments,qc,cache,yt}
cp templates/job.yaml work/$JOB/job.yaml && cp narration.mp3 work/$JOB/input.mp3

npm run ingest -- --job $JOB
python3 scripts/py/transcribe_groq.py --job $JOB
python3 scripts/py/align_whisperx.py --job $JOB
python3 scripts/py/to_transcript_json.py --job $JOB
python3 scripts/py/emphasis.py --job $JOB
npm run segment -- --job $JOB
npm run direct -- --job $JOB
python3 scripts/py/source_assets.py --job $JOB
python3 scripts/py/score_clip.py --job $JOB
python3 scripts/py/pick_shot.py --job $JOB
npm run prepare -- --job $JOB
npm run brain -- --job $JOB
npm run validate -- --job $JOB

git add work/$JOB && git commit -m "job: $JOB ready" && git push
gh workflow run broll-render.yml -f job_id=$JOB -f workers=18
gh run watch
gh run download -n final-$JOB -D work/$JOB/out
```

Then the QC loop: `npm run qc-stills`, review, `npm run brain -- --repair`,
validate, re-run the workflow. Only segments with changed hashes re-render.
Full stage documentation: `references/pipeline.md`.

## Environment

- `PEXELS_API_KEY`: repo secret exists. Pexels is paced (12 s between
  requests) and cached 24 h. Pixabay is not used.
- `GROQ_API_KEY`: create free at console.groq.com; add with
  `gh secret set GROQ_API_KEY`. Without it transcription falls back to
  whisper.cpp on CPU.
- `YOUTUBE_API_KEY`: optional; YouTube stages run on the home machine only.
- Node 22, ffmpeg 4.3+ (`xfade`), Python 3.10+ for the heavy Python stages.

## Licence notes

- Code in this directory follows the repository licence.
- Remotion is used under the Remotion Free License, which covers individuals
  and companies of up to 3 people. Larger teams need a Remotion company
  licence. The renderer sits behind the `timeline.json` contract so
  HyperFrames (Apache 2.0) can replace it.
- Stock and archival media keep their own licences: Pexels License,
  Openverse commercial-filtered CC, Wikimedia CC0 / CC BY / CC BY-SA / PD,
  NASA and Internet Archive public domain. The pipeline writes every
  required credit to `credits.json` and the final credits card.
- Sound and music packs: Mixkit, Kenney (CC0), YouTube Audio Library,
  Incompetech (CC BY 4.0, credit in the description).
- YouTube: Tier Y1 uses Creative Commons videos only. Tier Y2 (opt-in,
  clips under 5 s, no audio, credited, reported) relies on a fair-use
  posture that no length rule guarantees, and downloading may conflict with
  YouTube's Terms of Service. Nothing in this repository is legal advice.
  Read `references/youtube-policy.md`; the user decides what to publish.
