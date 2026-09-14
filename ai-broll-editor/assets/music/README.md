# Music pack (build with `python3 scripts/py/build_sfx_pack.py`)

Drop tracks into `assets/music/raw/<mood>/` where mood is exactly one of:

- `upbeat-corporate/`
- `calm-piano/`
- `tension-drone/`
- `documentary-ambient/`
- `tech-minimal/`
- `hopeful-strings/`

Recommended free sources:

| Source | Licence | Notes |
|---|---|---|
| YouTube Audio Library (studio.youtube.com -> Audio Library -> Music) | free for YouTube videos, some need attribution | filter by mood/genre; "Attribution not required" is safest |
| Incompetech (incompetech.com/music) | CC BY 4.0 | credit "Kevin MacLeod (incompetech.com)" in the description |

BPM: add a sidecar `<track>.json` with `{"bpm": 96}` next to the file (or let librosa estimate it when installed;
otherwise the pack builder assumes 120 and warns). The Brain loops at bar boundaries computed from bpm (spec 11.12).
Provenance: `assets/music/raw/<mood>/SOURCES.json` as in the SFX pack.
Output: 48 kHz stereo, loudnorm I=-20.
