#!/usr/bin/env python3
"""Deterministic FFmpeg asset preparation (spec 9).

Reads work/<id>/assets.json and the needed lengths:
  --need work/<id>/prepare-needs.json  {beatId: {neededFrames, headPadFrames}}   (from the TS Brain)
  else beats.json durations + 0.2 s (headPadFrames from assets.json when the Brain wrote them).
Per chosen asset:
  video   -> prepared/<beatId>.mp4  trimmed from inMs - headPad, exact length, spec 9 filter chain,
             bt709 tags, GOP 30, no audio; tpad clone freeze when the source is short (never loop)
  SD/arch -> lanczos upscale to 1440x1080 inside a 1920x1080 letterbox
  portrait-> height 1080, width kept (the Brain routes it to pip-over-blur)
  image   -> prepared/<beatId>.jpg oversized 2560x1440 for Ken Burns
Writes preparedPath back into assets.json and prepared/manifest.json; skips work whose inputs hash unchanged.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import FPS, anomaly, dump_json, job_dir, load_json, log, media_info, run  # noqa: E402

SAFETY_S = 0.2
ENCODE = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
          "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
          "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-movflags", "+faststart"]
VF_FULL = "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,format=yuv420p"
VF_SD = "scale=1440:1080:flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,setsar=1,format=yuv420p"
VF_PORTRAIT = "scale=-2:1080:flags=lanczos,fps=30,setsar=1,format=yuv420p"
VF_IMAGE = "scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440"
VF_IMAGE_PORTRAIT = "scale=-2:1440:flags=lanczos"


def load_needs(job: Path, need_path: Optional[Path], assets: dict) -> dict[str, dict]:
    """{beatId: {neededFrames, headPadFrames}}"""
    if need_path and need_path.exists():
        raw = load_json(need_path)
        out = {}
        for bid, v in raw.items():
            out[bid] = {"neededFrames": int(v.get("neededFrames", 0)), "headPadFrames": int(v.get("headPadFrames", 0) or 0)}
        return out
    if need_path:
        anomaly(job, "prepare_assets", f"{need_path} missing; deriving needs from beats.json + 0.2 s")
    bpath = job / "beats.json"
    if not bpath.exists():
        raise SystemExit(f"neither prepare-needs.json nor {bpath} exists")
    beats = load_json(bpath)["beats"]
    out = {}
    for b in beats:
        frames = int(round((b["endMs"] - b["startMs"]) / 1000.0 * FPS)) + int(round(SAFETY_S * FPS))
        head = 0
        a = (assets.get(b["id"]) or {}).get("chosen")
        if a and a.get("headPadFrames"):
            head = int(a["headPadFrames"])
        out[b["id"]] = {"neededFrames": max(frames, 45), "headPadFrames": head}
    return out


def plan_video(asset: dict, need: dict, src_info: dict) -> dict:
    """Compute the trim plan: start_s, length_s, freeze_s, filter chain, notes."""
    head_pad_frames = int(need.get("headPadFrames") or asset.get("headPadFrames") or 0)
    total_frames = int(need["neededFrames"]) + head_pad_frames
    length_s = total_frames / FPS + SAFETY_S
    in_s = asset["inMs"] / 1000.0
    head_s = head_pad_frames / FPS
    start_s = in_s - head_s
    notes = []
    if start_s < 0:
        notes.append(f"head pad {head_pad_frames}f not available; presentation holds frame 0")
        start_s = 0.0
    src_dur = src_info["durationMs"] / 1000.0
    available = max(0.0, src_dur - start_s) if src_dur > 0 else length_s
    freeze_s = 0.0
    if available + 1e-3 < length_s:
        freeze_s = round(length_s - available, 3)
        notes.append(f"source short by {freeze_s:.2f}s; freezing last frame (tpad, never loop)")
    portrait = src_info["width"] and src_info["height"] and src_info["width"] < src_info["height"]
    sd = bool(asset.get("sd")) or (0 < src_info["height"] < 720 and not portrait)
    if portrait:
        vf, path = VF_PORTRAIT, "portrait"
    elif sd:
        vf, path = VF_SD, "sd-letterbox"
    else:
        vf, path = VF_FULL, "full"
    if freeze_s > 0:
        vf = f"{vf},tpad=stop_mode=clone:stop_duration={freeze_s:.3f}"
    return {"start_s": round(start_s, 3), "length_s": round(length_s, 3), "freeze_s": freeze_s, "vf": vf, "path": path,
            "notes": notes, "headPadFrames": head_pad_frames}


def prepare_video(src: Path, dest: Path, plan: dict) -> None:
    cmd = ["ffmpeg", "-y", "-ss", f"{plan['start_s']:.3f}", "-i", str(src), "-t", f"{plan['length_s']:.3f}", "-an",
           "-vf", plan["vf"], *ENCODE, str(dest)]
    run(cmd)


def prepare_image(src: Path, dest: Path, src_info: dict) -> str:
    portrait = src_info["width"] and src_info["height"] and src_info["width"] < src_info["height"]
    vf = VF_IMAGE_PORTRAIT if portrait else VF_IMAGE
    run(["ffmpeg", "-y", "-i", str(src), "-vf", vf, "-frames:v", "1", "-q:v", "2", "-pix_fmt", "yuvj420p", str(dest)])
    return "image-portrait" if portrait else "image"


def input_hash(src: Path, asset: dict, need: dict) -> str:
    st = src.stat()
    key = json.dumps({"src": str(src), "size": st.st_size, "mtime": int(st.st_mtime), "inMs": asset.get("inMs"),
                      "outMs": asset.get("outMs"), "need": need, "sd": asset.get("sd"), "kind": asset.get("kind"),
                      "encode": ENCODE, "vf": [VF_FULL, VF_SD, VF_PORTRAIT, VF_IMAGE]}, sort_keys=True)
    return hashlib.sha1(key.encode()).hexdigest()


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--need", help="prepare-needs.json from the Brain (default work/<id>/prepare-needs.json)")
    ap.add_argument("--only-beats", help="comma-separated beat ids")
    ap.add_argument("--force", action="store_true", help="ignore the hash cache")
    args = ap.parse_args(argv)
    job = job_dir(args.job)
    apath = job / "assets.json"
    if not apath.exists():
        log(f"missing {apath}; run source_assets.py first")
        return 2
    assets = load_json(apath)
    need_path = Path(args.need) if args.need else job / "prepare-needs.json"
    needs = load_needs(job, need_path, assets)
    only = set(args.only_beats.split(",")) if args.only_beats else None
    out_dir = job / "prepared"
    out_dir.mkdir(parents=True, exist_ok=True)
    mpath = out_dir / "manifest.json"
    manifest: dict = load_json(mpath) if mpath.exists() else {}

    done = skipped = failed = 0
    for bid, entry in sorted(assets.items()):
        if only and bid not in only:
            continue
        chosen = entry.get("chosen") if isinstance(entry, dict) else None
        if not chosen:
            continue
        need = needs.get(bid)
        if not need:
            anomaly(job, "prepare_assets", f"{bid}: no needed length known; skipping", beatId=bid)
            failed += 1
            continue
        src = Path(chosen["localPath"])
        if not src.is_absolute():
            src = job / src
        if not src.exists():
            anomaly(job, "prepare_assets", f"{bid}: source missing {src}", beatId=bid)
            failed += 1
            continue
        h = input_hash(src, chosen, need)
        ext = ".mp4" if chosen["kind"] == "video" else ".jpg"
        dest = out_dir / f"{bid}{ext}"
        rel = f"prepared/{dest.name}"
        prev = manifest.get(bid)
        if not args.force and prev and prev.get("hash") == h and dest.exists() and dest.stat().st_size > 0:
            chosen["preparedPath"] = rel
            skipped += 1
            continue
        try:
            info = media_info(src)
            if chosen["kind"] == "video" and not info["isImage"]:
                plan = plan_video(chosen, need, info)
                prepare_video(src, dest, plan)
                for n in plan["notes"]:
                    anomaly(job, "prepare_assets", f"{bid}: {n}", beatId=bid)
                rec = {"hash": h, "path": rel, "kind": "video", "plan": plan}
            else:
                mode = prepare_image(src, dest, info)
                rec = {"hash": h, "path": rel, "kind": "image", "plan": {"path": mode}}
            out_info = media_info(dest)
            rec["out"] = {k: out_info[k] for k in ("width", "height", "fps", "durationMs")}
            if rec["kind"] == "video":
                want = need["neededFrames"] + int(need.get("headPadFrames") or 0)
                got = int(round(out_info["durationMs"] / 1000.0 * FPS))
                if got < want:
                    anomaly(job, "prepare_assets", f"{bid}: prepared {got} frames < needed {want}", beatId=bid)
                if out_info["hasAudio"]:
                    anomaly(job, "prepare_assets", f"{bid}: prepared file unexpectedly has audio", beatId=bid)
            manifest[bid] = rec
            chosen["preparedPath"] = rel
            done += 1
            log(f"[prepare] {bid}: {rel} ({rec['plan'].get('path')}) {rec['out']}")
        except Exception as e:  # noqa: BLE001
            anomaly(job, "prepare_assets", f"{bid}: ffmpeg failed: {e}", beatId=bid)
            failed += 1
        dump_json(mpath, manifest)
    dump_json(apath, assets)
    log(f"[prepare] done={done} skipped(unchanged)={skipped} failed={failed}")
    return 1 if failed and not done and not skipped else 0


if __name__ == "__main__":
    sys.exit(main())
