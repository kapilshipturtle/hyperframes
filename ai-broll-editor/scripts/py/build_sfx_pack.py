#!/usr/bin/env python3
"""Build the SFX and music packs (spec 17).

Input layout (raw downloads, organised by hand):
  assets/sfx/raw/<tag>/*.{mp3,wav}      tag in types.ts SfxTag (whoosh-soft, pop, click, ...)
  assets/music/raw/<mood>/*.mp3         mood in types.ts MusicTag (upbeat-corporate, calm-piano, ...)
  optional SOURCES.json in each raw folder: {"<file or *>": {"source": "...", "license": "..."}}
  optional <file>.json sidecar next to a music file: {"bpm": 96}

Output:
  assets/sfx/<tag>-NN.mp3   loudnorm I=-16 TP=-1.5, 48 kHz mono, leading silence trimmed
  assets/music/<mood>-NN.mp3 loudnorm I=-20, stereo
  assets/sfx/manifest.json  [{tag,file,durationMs,source,license,direction?}]
  assets/music/manifest.json [{mood,file,bpm,durationMs,source,license}]
  assets/sfx/README.md, assets/music/README.md (where to download free packs; Mixkit, Kenney, YouTube Audio Library, Incompetech only)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import PKG_ROOT, dump_json, load_json, log, media_info, run  # noqa: E402

SFX_TAGS = ["whoosh-soft", "whoosh-hard", "swoosh-short", "pop", "click", "tick", "impact-soft", "glitch",
            "camera-shutter", "typewriter-key", "riser-short", "ding", "counter-tick-loop"]
MUSIC_TAGS = ["upbeat-corporate", "calm-piano", "tension-drone", "documentary-ambient", "tech-minimal", "hopeful-strings"]
AUDIO_EXT = {".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aiff", ".aif"}
DEFAULT_BPM = 120

SFX_README = """# SFX pack (build with `python3 scripts/py/build_sfx_pack.py`)

Download free, commercially safe sounds by hand and drop them into `assets/sfx/raw/<tag>/`.
Tags (folder names) must be exactly:

""" + "\n".join(f"- `{t}/`" for t in SFX_TAGS) + """

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
"""

MUSIC_README = """# Music pack (build with `python3 scripts/py/build_sfx_pack.py`)

Drop tracks into `assets/music/raw/<mood>/` where mood is exactly one of:

""" + "\n".join(f"- `{t}/`" for t in MUSIC_TAGS) + """

Recommended free sources:

| Source | Licence | Notes |
|---|---|---|
| YouTube Audio Library (studio.youtube.com -> Audio Library -> Music) | free for YouTube videos, some need attribution | filter by mood/genre; "Attribution not required" is safest |
| Incompetech (incompetech.com/music) | CC BY 4.0 | credit "Kevin MacLeod (incompetech.com)" in the description |

BPM: add a sidecar `<track>.json` with `{"bpm": 96}` next to the file (or let librosa estimate it when installed;
otherwise the pack builder assumes 120 and warns). The Brain loops at bar boundaries computed from bpm (spec 11.12).
Provenance: `assets/music/raw/<mood>/SOURCES.json` as in the SFX pack.
Output: 48 kHz stereo, loudnorm I=-20.
"""


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def read_sources(folder: Path) -> dict:
    p = folder / "SOURCES.json"
    if not p.exists():
        return {}
    try:
        return load_json(p)
    except (OSError, ValueError) as e:
        log(f"[pack] bad {p}: {e}")
        return {}


def provenance(folder: Path, fname: str, sources: dict) -> tuple[str, str]:
    rec = sources.get(fname) or sources.get("*") or {}
    src, lic = rec.get("source"), rec.get("license")
    if not src or not lic:
        log(f"[pack] WARNING: no source/licence recorded for {folder.name}/{fname}; set SOURCES.json")
    return src or "unknown", lic or "unknown"


def direction_from_name(name: str) -> Optional[str]:
    n = name.lower()
    if re.search(r"(^|[_\-\s])ltr([_\-\s.]|$)|left.?to.?right", n):
        return "ltr"
    if re.search(r"(^|[_\-\s])rtl([_\-\s.]|$)|right.?to.?left", n):
        return "rtl"
    return None


def normalise_sfx(src: Path, dest: Path) -> None:
    run(["ffmpeg", "-y", "-i", str(src), "-af",
         "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,loudnorm=I=-16:TP=-1.5:LRA=11",
         "-ac", "1", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "192k", str(dest)])


def normalise_music(src: Path, dest: Path) -> None:
    run(["ffmpeg", "-y", "-i", str(src), "-af", "loudnorm=I=-20:TP=-1.5:LRA=11", "-ac", "2", "-ar", "48000",
         "-c:a", "libmp3lame", "-b:a", "192k", str(dest)])


def estimate_bpm(path: Path, sidecar_default: Optional[int]) -> tuple[int, str]:
    sidecar = path.with_suffix(".json")
    if sidecar.exists():
        try:
            v = load_json(sidecar).get("bpm")
            if v:
                return int(round(float(v))), "sidecar"
        except (OSError, ValueError, TypeError):
            pass
    try:
        import librosa  # type: ignore

        y, sr = librosa.load(str(path), sr=22050, mono=True, duration=120)
        tempo = librosa.beat.tempo(y=y, sr=sr)
        bpm = int(round(float(tempo[0] if hasattr(tempo, "__len__") else tempo)))
        if 40 <= bpm <= 220:
            return bpm, "librosa"
    except ImportError:
        pass
    except Exception as e:  # noqa: BLE001
        log(f"[pack] librosa failed on {path.name}: {e}")
    if sidecar_default:
        return sidecar_default, "--bpm"
    log(f"[pack] WARNING: no bpm for {path.name}; assuming {DEFAULT_BPM} (add {sidecar.name} with {{\"bpm\": N}})")
    return DEFAULT_BPM, "default"


def build_sfx(root: Path) -> list[dict]:
    raw = root / "raw"
    manifest: list[dict] = []
    if not raw.exists():
        log(f"[pack] {raw} missing; nothing to build for SFX")
        return manifest
    for tag_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        tag = tag_dir.name
        if tag not in SFX_TAGS:
            log(f"[pack] WARNING: '{tag}' is not a known SfxTag; skipping folder {tag_dir}")
            continue
        sources = read_sources(tag_dir)
        files = sorted(p for p in tag_dir.iterdir() if p.suffix.lower() in AUDIO_EXT)
        if not files:
            log(f"[pack] WARNING: {tag_dir} has no audio files")
        for i, f in enumerate(files, 1):
            dest = root / f"{tag}-{i:02d}.mp3"
            normalise_sfx(f, dest)
            info = media_info(dest)
            source, lic = provenance(tag_dir, f.name, sources)
            entry = {"tag": tag, "file": f"sfx/{dest.name}", "durationMs": info["durationMs"], "source": source, "license": lic}
            d = direction_from_name(f.name)
            if d:
                entry["direction"] = d
            manifest.append(entry)
    missing = [t for t in SFX_TAGS if not any(m["tag"] == t for m in manifest)]
    if missing:
        log(f"[pack] WARNING: no SFX for tags: {', '.join(missing)} (the Brain will skip those sounds)")
    return manifest


def build_music(root: Path, bpm_override: Optional[int]) -> list[dict]:
    raw = root / "raw"
    manifest: list[dict] = []
    if not raw.exists():
        log(f"[pack] {raw} missing; nothing to build for music")
        return manifest
    for mood_dir in sorted(p for p in raw.iterdir() if p.is_dir()):
        mood = mood_dir.name
        if mood not in MUSIC_TAGS:
            log(f"[pack] WARNING: '{mood}' is not a known MusicTag; skipping folder {mood_dir}")
            continue
        sources = read_sources(mood_dir)
        files = sorted(p for p in mood_dir.iterdir() if p.suffix.lower() in AUDIO_EXT)
        for i, f in enumerate(files, 1):
            dest = root / f"{mood}-{i:02d}.mp3"
            normalise_music(f, dest)
            info = media_info(dest)
            bpm, how = estimate_bpm(f, bpm_override)
            source, lic = provenance(mood_dir, f.name, sources)
            manifest.append({"mood": mood, "file": f"music/{dest.name}", "bpm": bpm, "durationMs": info["durationMs"],
                             "source": source, "license": lic})
            log(f"[pack] {dest.name}: {info['durationMs']} ms, bpm {bpm} ({how})")
    missing = [t for t in MUSIC_TAGS if not any(m["mood"] == t for m in manifest)]
    if missing:
        log(f"[pack] WARNING: no music for moods: {', '.join(missing)}")
    return manifest


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--assets", default=str(PKG_ROOT / "assets"), help="assets root (default <pkg>/assets)")
    ap.add_argument("--bpm", type=int, help="fallback bpm for music without sidecar when librosa is missing")
    ap.add_argument("--readme-only", action="store_true", help="only (re)write the README files")
    args = ap.parse_args(argv)
    assets = Path(args.assets)
    (assets / "sfx").mkdir(parents=True, exist_ok=True)
    (assets / "music").mkdir(parents=True, exist_ok=True)
    (assets / "sfx" / "README.md").write_text(SFX_README, encoding="utf-8")
    (assets / "music" / "README.md").write_text(MUSIC_README, encoding="utf-8")
    if args.readme_only:
        log("[pack] README files written")
        return 0
    sfx = build_sfx(assets / "sfx")
    music = build_music(assets / "music", args.bpm)
    dump_json(assets / "sfx" / "manifest.json", sfx)
    dump_json(assets / "music" / "manifest.json", music)
    log(f"[pack] sfx manifest: {len(sfx)} files; music manifest: {len(music)} files")
    print(json.dumps({"sfx": len(sfx), "music": len(music)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
