# Audio mix

Source: spec-v3 section 14 and 11.12. The mix is one FFmpeg command that
runs once in the `finish` job and takes seconds. Every delay and gain comes
from `timeline.json`. Nothing is re-derived from planning files.

## Stack

Bottom to top: `music` < `sfx` < `narration`. Narration is never moved,
never processed beyond the ingest loudnorm. Music ducks under speech. SFX
sit above music and below voice.

## Inputs

| File | From |
|---|---|
| `narration_norm.m4a` | ingest (loudnorm I=-16, TP=-1.5, LRA=11, 48 kHz AAC 192k) |
| `timeline.json` tracks `music[]`, `sfx[]` | Brain P9 and P10 |
| `duckCurve.json` | Brain P10 (one value per frame) |
| `rms50ms.txt` | ingest (source of the duck curve) |
| `assets/music/manifest.json`, `assets/sfx/manifest.json` | packs (spec 17) |

## Music layout (11.12)

- One track per section by `musicTag`. Consecutive sections with the same
  tag continue the same track without restart.
- Each `MusicItem`: `from = sectionStartFrame - 30` (starts under the
  previous section's last shot), `fadeInFrames 30`, `fadeOutFrames 45`, 60
  frame overlap crossfade with the next track.
- Track shorter than the section: loop at a bar boundary
  (`bar = 4 * 60 / bpm` seconds from the manifest) with a 2 frame crossfade.
  `loopAtFrames[]` records where. Never a hard restart.
- Base volume by mood: 0.10 to 0.16 (about -22 to -26 dB under voice).
- Music never plays over a `chapter-card` riser above 0.08.

## Ducking (11.12)

From `rms50ms.txt`:

```
speech(f) = RMS(f) > -40 dB
duck[f]   = speech(f) ? base * 0.45 : base
```

Smoothed with 12 frame attack and 24 frame release. Exported as
`duckCurve.json` with one value per frame.

- Remotion path: `<Audio volume={(f) => duck[f]} />` on the music item.
- FFmpeg path: `sidechaincompress` driven by a split of the narration
  (`threshold=0.02:ratio=8:attack=20:release=400`) as the fallback when the
  mixer cannot consume a per-frame curve.

Both paths produce the same audible result within a dB; the FFmpeg path is
what ships in `final.mp4` because the video is muxed once at the end.

## SFX gains (11.11)

Base gain by tag: whoosh 0.35, pop 0.30, click 0.25, impact 0.4, tick 0.12.
Strong-word multiplier 1.15. Section multiplier by kind. Hard cap 0.5.
Spacing 45 frames or more; tick trains count as one event.

## The mix command (spec 14)

```bash
ffmpeg -y -i narration_norm.m4a -i assets/music/upbeat-corporate-01.mp3 -i assets/sfx/whoosh-soft-02.mp3 -i assets/sfx/pop-01.mp3 -filter_complex "
 [1:a]atrim=0:95,afade=t=in:d=1,afade=t=out:st=93.5:d=1.5,volume=0.14[m];
 [0:a]asplit=2[voice][sc];
 [m][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[mduck];
 [2:a]adelay=3467|3467,volume=0.35[s1];
 [3:a]adelay=1333|1333,volume=0.30[s2];
 [voice][mduck][s1][s2]amix=inputs=4:normalize=0:dropout_transition=0,alimiter=limit=0.95[out]" -map "[out]" -c:a aac -b:a 192k mix.m4a
```

`npm run audio-mix -- --job <job>` generates this command from
`timeline.json`. Delays are `from / 30 * 1000` ms. Music `atrim`, `afade`
and loop points come from the `MusicItem`. `amix normalize=0` keeps the
gains as written.

## Final mux and loudness

```bash
ffmpeg -i video_only.mp4 -i mix.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4
```

Loudness target for YouTube: -14 LUFS integrated
(`loudnorm=I=-14:TP=-1:LRA=11` on the final mix). The QC asserts check the
result with a second `loudnorm` print pass.

## Checks

- Every `sfx.src` and `music.src` exists and is in its manifest (validator).
- No two SFX closer than 45 frames (I6).
- No music item above the cap; no restart within a section (I7).
- A/V sync at three points after mux.
- Y2 clips carry no audio stream; the mix never touches B-roll audio.

## Do not

- Do not normalise the narration a second time; ingest already did.
- Do not let music start on a hard restart at a section boundary; use the
  60 frame crossfade.
- Do not put SFX on hard cuts. If it sounds empty, the fix is in the
  Director's `transitionFamily`, not in the mixer.
