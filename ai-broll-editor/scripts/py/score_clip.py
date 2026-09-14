#!/usr/bin/env python3
"""Relevance scoring and rejection heuristics (spec 8.6).

  frames(video, n=3)         -> 3 sampled 320px JPEGs at 10%/50%/90%
  score(intent, paths)       -> max cosine(open_clip ViT-B-32 laion2b_s34b_b79k text, image); CPU; lazy load
  phash(path)                -> imagehash.phash
  watermark_score(path)      -> 0..1 heuristic: text-like high-contrast blobs in the lower 20% (OpenCV)
  letterbox(video_or_image)  -> {"top","bottom","left","right","fraction"} via ffmpeg cropdetect

`--self-test` renders a solid-colour image and exercises every function; when open_clip is
missing the score is 0 with a loud warning (nothing is downloaded).
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Optional, Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import log, media_info, run  # noqa: E402

MODEL_NAME = "ViT-B-32"
PRETRAINED = "laion2b_s34b_b79k"
PHASH_MIN_DISTANCE = 8

_model = None
_pre = None
_tok = None
_torch = None
_clip_unavailable_reason: Optional[str] = None


def clip_available() -> bool:
    try:
        import open_clip  # noqa: F401
        import torch  # noqa: F401
        return True
    except ImportError:
        return False


def _load():
    global _model, _pre, _tok, _torch, _clip_unavailable_reason
    if _model is not None or _clip_unavailable_reason is not None:
        return
    try:
        import open_clip  # type: ignore
        import torch  # type: ignore
    except ImportError as e:
        _clip_unavailable_reason = f"open_clip/torch not importable ({e}); install scripts/py/requirements.txt"
        log(f"[score_clip] WARNING: {_clip_unavailable_reason}; scores will be 0")
        return
    torch.set_num_threads(max(1, min(4, torch.get_num_threads())))
    _torch = torch
    _model, _, _pre = open_clip.create_model_and_transforms(MODEL_NAME, pretrained=PRETRAINED, device="cpu")
    _model.eval()
    _tok = open_clip.get_tokenizer(MODEL_NAME)


def frames(video: Path | str, n: int = 3, out_dir: Optional[Path] = None, width: int = 320) -> list[Path]:
    """Sample n frames spread over 10..90% of the duration (spec 8.6). Images return themselves."""
    video = Path(video)
    info = media_info(video)
    if info["isImage"] or info["durationMs"] <= 0:
        return [video]
    dur = info["durationMs"] / 1000.0
    out_dir = out_dir or video.parent
    out: list[Path] = []
    for i in range(n):
        t = dur * (0.1 + 0.8 * i / max(1, n - 1))
        p = out_dir / f"{video.stem}.f{i}.jpg"
        if not p.exists():
            run(["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={width}:-1",
                 "-q:v", "3", str(p)])
        if p.exists():
            out.append(p)
    return out


def frames_at(video: Path | str, times_s: Sequence[float], out_dir: Optional[Path] = None, width: int = 320) -> list[Path]:
    video = Path(video)
    out_dir = out_dir or video.parent
    out = []
    for i, t in enumerate(times_s):
        p = out_dir / f"{video.stem}.t{int(t * 1000):08d}.jpg"
        if not p.exists():
            run(["ffmpeg", "-y", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-vf", f"scale={width}:-1",
                 "-q:v", "3", str(p)])
        if p.exists():
            out.append(p)
    return out


def score(intent: str, paths: Sequence[Path | str]) -> float:
    """Max cosine similarity between the intent text and any of the frames (0 when CLIP is unavailable)."""
    _load()
    if _model is None:
        return 0.0
    from PIL import Image  # type: ignore

    torch = _torch
    imgs = []
    for p in paths:
        try:
            imgs.append(_pre(Image.open(p).convert("RGB")))
        except Exception as e:  # unreadable frame
            log(f"[score_clip] skip unreadable frame {p}: {e}")
    if not imgs:
        return 0.0
    with torch.no_grad():
        t = _model.encode_text(_tok([intent]))
        t = t / t.norm(dim=-1, keepdim=True)
        im = _model.encode_image(torch.stack(imgs))
        im = im / im.norm(dim=-1, keepdim=True)
        return float((im @ t.T).max())


def score_each(intent: str, paths: Sequence[Path | str]) -> list[float]:
    return [score(intent, [p]) for p in paths]


def text_embeddings(texts: Sequence[str]):
    """Normalised text embeddings (numpy) or None when CLIP is unavailable. Used by query consolidation."""
    _load()
    if _model is None:
        return None
    torch = _torch
    with torch.no_grad():
        t = _model.encode_text(_tok(list(texts)))
        t = t / t.norm(dim=-1, keepdim=True)
        return t.cpu().numpy()


def phash(path: Path | str):
    import imagehash  # type: ignore
    from PIL import Image  # type: ignore

    return imagehash.phash(Image.open(path).convert("RGB"))


def phash_distance(a, b) -> int:
    return int(a - b)


def is_duplicate(path: Path | str, chosen_hashes: Sequence, min_distance: int = PHASH_MIN_DISTANCE) -> bool:
    h = phash(path)
    return any(phash_distance(h, c) < min_distance for c in chosen_hashes)


def watermark_score(path: Path | str) -> float:
    """0..1: share of text-like high-contrast components in the lower 20% band (spec 8.6 heuristic).

    Method: grayscale -> lower 20% -> Canny edges -> connected components; count components whose
    height is 6..60 px, aspect 0.2..8 and whose interior contrast is high. Return min(1, hits / 12).
    Reads 'no watermark' when OpenCV is unavailable and logs the degradation.
    """
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore
    except ImportError:
        log("[score_clip] WARNING: opencv not importable; watermark heuristic disabled (reports 0)")
        return 0.0
    img = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return 0.0
    h, w = img.shape[:2]
    band = img[int(h * 0.8):, :]
    if band.size == 0:
        return 0.0
    scale = 640.0 / max(1, w)
    if scale < 1:
        band = cv2.resize(band, (int(band.shape[1] * scale), max(1, int(band.shape[0] * scale))))
    edges = cv2.Canny(band, 100, 200)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(closed, connectivity=8)
    hits = 0
    bh, bw = band.shape[:2]
    for i in range(1, n):
        x, y, cw, ch, area = stats[i]
        if not (6 <= ch <= 60 and 3 <= cw <= bw * 0.5):
            continue
        aspect = cw / float(ch)
        if not (0.2 <= aspect <= 8.0):
            continue
        roi = band[y:y + ch, x:x + cw]
        if roi.size and (float(np.percentile(roi, 95)) - float(np.percentile(roi, 5))) > 110:
            hits += 1
    return min(1.0, hits / 12.0)


_CROP_RE = re.compile(r"crop=(\d+):(\d+):(\d+):(\d+)")


def letterbox(path: Path | str, samples: int = 3) -> dict:
    """ffmpeg cropdetect over a few frames -> border sizes and fraction of frame area that is black border."""
    path = Path(path)
    info = media_info(path)
    W, H = info["width"], info["height"]
    if not W or not H:
        return {"top": 0, "bottom": 0, "left": 0, "right": 0, "fraction": 0.0}
    dur = info["durationMs"] / 1000.0
    crops = []
    times = [0.0] if info["isImage"] or dur <= 0 else [dur * (0.15 + 0.7 * i / max(1, samples - 1)) for i in range(samples)]
    for t in times:
        cmd = ["ffmpeg", "-hide_banner", "-ss", f"{t:.3f}", "-i", str(path), "-frames:v", "1",
               "-vf", "cropdetect=limit=24:round=2:reset=1", "-f", "null", "-"]
        p = subprocess.run(cmd, capture_output=True, text=True)
        for m in _CROP_RE.finditer(p.stderr):
            crops.append(tuple(int(g) for g in m.groups()))
    if not crops:
        return {"top": 0, "bottom": 0, "left": 0, "right": 0, "fraction": 0.0}
    # take the most conservative (largest content box) across samples
    cw = max(c[0] for c in crops)
    ch = max(c[1] for c in crops)
    cx = min(c[2] for c in crops)
    cy = min(c[3] for c in crops)
    top, left = max(0, cy), max(0, cx)
    bottom, right = max(0, H - (cy + ch)), max(0, W - (cx + cw))
    fraction = 1.0 - (cw * ch) / float(W * H)
    return {"top": top, "bottom": bottom, "left": left, "right": right, "fraction": round(max(0.0, fraction), 4)}


def self_test() -> int:
    with tempfile.TemporaryDirectory() as td:
        from PIL import Image  # type: ignore

        p = Path(td) / "solid.jpg"
        Image.new("RGB", (640, 360), (40, 120, 200)).save(p, quality=90)
        if not clip_available():
            log("[score_clip] self-test: open_clip missing -> score() returns 0 (WARNING)")
        s = score("a blue sky", [p])
        h = phash(p)
        wm = watermark_score(p)
        lb = letterbox(p)
        fr = frames(p)
        print({"score": round(s, 4), "phash": str(h), "watermark": wm, "letterbox": lb, "frames": [str(x) for x in fr],
               "clip": clip_available()})
        assert 0.0 <= s <= 1.0 and wm == 0.0 and fr == [p]
        return 0


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--intent", help="text intent to score against")
    ap.add_argument("media", nargs="*", help="video or image files")
    args = ap.parse_args(argv)
    if args.self_test:
        return self_test()
    if not args.intent or not args.media:
        ap.error("--intent and at least one media file are required (or --self-test)")
    for m in args.media:
        fr = frames(Path(m))
        print({"file": m, "score": round(score(args.intent, fr), 4), "watermark": max(watermark_score(f) for f in fr),
               "letterbox": letterbox(m)})
    return 0


if __name__ == "__main__":
    sys.exit(main())
