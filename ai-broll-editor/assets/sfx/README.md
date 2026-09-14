# SFX pack (build with `python3 scripts/py/build_sfx_pack.py`)

Download free, commercially safe sounds by hand and drop them into `assets/sfx/raw/<tag>/`.
Tags (folder names) must be exactly:

- `whoosh-soft/`
- `whoosh-hard/`
- `swoosh-short/`
- `pop/`
- `click/`
- `tick/`
- `impact-soft/`
- `glitch/`
- `camera-shutter/`
- `typewriter-key/`
- `riser-short/`
- `ding/`
- `counter-tick-loop/`

Recommended free sources (Freesound is excluded: its API is non-commercial only):

| Source | Licence | Notes |
|---|---|---|
| Mixkit (mixkit.co/free-sound-effects) | Mixkit License, commercial OK | whooshes, pops, clicks, UI, risers |
| Kenney (kenney.nl/assets?q=audio) | CC0 | bulk zips: UI clicks, pops, impacts |
| YouTube Audio Library (studio.youtube.com -> Audio Library -> Sound effects) | free for YouTube videos | whooshes, cameras, typewriter |

Whoosh direction: name files with `_ltr` or `_rtl` (e.g. `whoosh_ltr_01.wav`) and the manifest records `direction`.
Record provenance in `assets/sfx/raw/<tag>/SOURCES.json` as `{"<file>": {"source": "Mixkit", "license": "Mixkit License"}}`
or `{"*": {...}}` for a whole folder; files without an entry get `source: "unknown"` and a warning.
Output: 48 kHz mono, loudnorm I=-16 TP=-1.5, leading silence trimmed. Never commit the raw folder.
