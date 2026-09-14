#!/usr/bin/env python3
"""In-point selection inside a source clip (spec 8.8).

  1. source > 12 s -> PySceneDetect detect-adaptive shot list; else one shot.
  2. per shot >= needed length: sceneScore = mean ffmpeg lavfi.scene_score (prefer 0.02..0.15,
     penalise < 0.005 and > 0.3), clipScore on the middle frame, face-at-edge penalty (Haar),
     letterbox penalty.
  3. best shot; inMs = shot start + 400 ms; if longer than needed, the window with the best
     clipScore on 3 sampled frames.
Returns {inMs,outMs,sceneScore,clipScore,reasons}. Heavy deps are optional: without scenedetect the
whole clip is one shot; without CLIP the clipScore is 0 and the choice rests on motion.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
import score_clip  # noqa: E402
from broll_common import log, media_info  # noqa: E402

HEAD_SKIP_MS = 400
SCENEDETECT_MIN_S = 12.0
_SCENE_RE = re.compile(r"lavfi\.scene_score=([0-9.]+)")


def detect_shots(video: Path, duration_ms: int) -> tuple[list[tuple[int, int]], str]:
    """[(startMs,endMs)] shots. PySceneDetect adaptive when > 12 s, else a single shot."""
    if duration_ms <= SCENEDETECT_MIN_S * 1000:
        return [(0, duration_ms)], "single shot (<= 12 s)"
    try:
        from scenedetect import AdaptiveDetector, detect  # type: ignore
    except ImportError:
        log("[pick_shot] WARNING: scenedetect not importable; treating source as one shot")
        return [(0, duration_ms)], "single shot (scenedetect missing)"
    try:
        scenes = detect(str(video), AdaptiveDetector(), show_progress=False)
    except Exception as e:  # scenedetect raises various video-open errors
        log(f"[pick_shot] WARNING: scenedetect failed ({e}); one shot")
        return [(0, duration_ms)], "single shot (scenedetect error)"
    shots = [(int(s.get_seconds() * 1000), int(e.get_seconds() * 1000)) for s, e in scenes]
    shots = [(a, b) for a, b in shots if b - a >= 500]
    if not shots:
        return [(0, duration_ms)], "single shot (no cuts found)"
    return shots, f"{len(shots)} shots (detect-adaptive)"


def scene_scores(video: Path, start_ms: int, end_ms: int) -> list[float]:
    """Per-frame lavfi.scene_score values for [start,end)."""
    cmd = ["ffmpeg", "-hide_banner", "-nostats", "-ss", f"{start_ms / 1000:.3f}", "-t", f"{(end_ms - start_ms) / 1000:.3f}",
           "-i", str(video), "-vf", "scale=320:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score",
           "-an", "-f", "null", "-"]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return [float(m.group(1)) for m in _SCENE_RE.finditer(p.stderr + p.stdout)]


def motion_penalty(mean_scene: float) -> tuple[float, str]:
    """Reward 0.02..0.15; penalise static (<0.005) and frantic (>0.3)."""
    if mean_scene < 0.005:
        return -0.08, f"static motion {mean_scene:.4f}"
    if mean_scene > 0.3:
        return -0.10, f"frantic motion {mean_scene:.3f}"
    if 0.02 <= mean_scene <= 0.15:
        return 0.05, f"moderate motion {mean_scene:.3f}"
    return 0.0, f"motion {mean_scene:.3f}"


def face_edge_penalty(frame_path: Path) -> tuple[float, Optional[str]]:
    """-0.06 when a detected face touches the frame edge (cut-off face). Haar cascade, cheap."""
    try:
        import cv2  # type: ignore
    except ImportError:
        return 0.0, None
    img = cv2.imread(str(frame_path))
    if img is None:
        return 0.0, None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(str(cascade_path))
    if cascade.empty():
        return 0.0, None
    faces = cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=4, minSize=(24, 24))
    h, w = gray.shape[:2]
    for (x, y, fw, fh) in faces:
        margin = max(2, int(0.02 * w))
        if x <= margin or y <= margin or x + fw >= w - margin or y + fh >= h - margin:
            return -0.06, "face cut at frame edge"
    return 0.0, ("face centred" if len(faces) else None)


def pick(video: Path, intent: str, need_ms: int, *, prefer_motion: bool = True, work_dir: Optional[Path] = None) -> dict:
    info = media_info(video)
    dur = info["durationMs"]
    work_dir = work_dir or video.parent
    reasons: list[str] = []
    if dur <= 0:
        return {"inMs": 0, "outMs": need_ms, "sceneScore": 0.0, "clipScore": 0.0, "reasons": ["no duration; freeze path"]}
    if info["isImage"]:
        fr = [video]
        cs = score_clip.score(intent, fr)
        return {"inMs": 0, "outMs": need_ms, "sceneScore": 0.0, "clipScore": round(cs, 4), "reasons": ["still image"]}

    shots, how = detect_shots(video, dur)
    reasons.append(how)
    lb = score_clip.letterbox(video)
    lb_pen = -0.08 if lb["fraction"] > 0.12 else 0.0
    if lb_pen:
        reasons.append(f"letterbox {lb['fraction']:.0%}")

    usable = [(a, b) for a, b in shots if (b - a) - HEAD_SKIP_MS >= need_ms] or None
    if usable is None:
        # nothing long enough: take the longest shot; prepare stage freezes the tail
        a, b = max(shots, key=lambda s: s[1] - s[0])
        usable = [(a, b)]
        reasons.append("no shot long enough; longest shot, tail will freeze")

    best = None
    for (a, b) in usable[:12]:
        ss = scene_scores(video, a, b)
        mean_scene = sum(ss) / len(ss) if ss else 0.0
        mpen, mreason = motion_penalty(mean_scene)
        if not prefer_motion:
            mpen = min(mpen, 0.0)
        mid = (a + b) / 2000.0
        fr = score_clip.frames_at(video, [mid], out_dir=work_dir)
        cs = score_clip.score(intent, fr) if fr else 0.0
        fpen, freason = face_edge_penalty(fr[0]) if fr else (0.0, None)
        total = cs + mpen + fpen + lb_pen
        cand = {"start": a, "end": b, "sceneScore": mean_scene, "clipScore": cs, "total": total,
                "reasons": [r for r in (mreason, freason) if r]}
        if best is None or total > best["total"]:
            best = cand
    assert best is not None
    a, b = best["start"], best["end"]
    in_ms = a + HEAD_SKIP_MS if (b - a) - HEAD_SKIP_MS >= need_ms else a
    # window search inside a long shot: 3 sampled frames per window, step ~ need/2
    span = b - in_ms
    clip_best = best["clipScore"]
    if span > need_ms * 1.5 and score_clip.clip_available():
        step = max(500, need_ms // 2)
        best_w, best_s = in_ms, -1.0
        t = in_ms
        while t + need_ms <= b and (t - in_ms) // step < 8:
            fr = score_clip.frames_at(video, [(t + need_ms * f) / 1000.0 for f in (0.1, 0.5, 0.9)], out_dir=work_dir)
            s = score_clip.score(intent, fr)
            if s > best_s:
                best_w, best_s = t, s
            t += step
        in_ms, clip_best = best_w, max(clip_best, best_s)
        reasons.append(f"window search over {span} ms")
    out_ms = min(b, in_ms + need_ms) if (b - in_ms) >= need_ms else b
    reasons.extend(best["reasons"])
    reasons.append(f"shot {a}-{b} ms, in-point +{in_ms - a} ms")
    return {"inMs": int(in_ms), "outMs": int(out_ms), "sceneScore": round(best["sceneScore"], 4),
            "clipScore": round(float(clip_best), 4), "reasons": reasons}


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--intent", required=True)
    ap.add_argument("--need-ms", type=int, required=True)
    ap.add_argument("--no-prefer-motion", action="store_true")
    args = ap.parse_args(argv)
    v = Path(args.video)
    if not v.exists():
        log(f"not found: {v}")
        return 2
    print(json.dumps(pick(v, args.intent, args.need_ms, prefer_motion=not args.no_prefer_motion), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
