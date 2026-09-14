#!/usr/bin/env python3
"""YouTube tiers Y1 (Creative Commons) and Y2 (opt-in, < 5.0 s) per spec 8.7.

Runs on the home machine only: refuses when GITHUB_ACTIONS is set unless the runner is
self-hosted (env BROLL_ALLOW_YOUTUBE=1). Requires YOUTUBE_API_KEY and yt-dlp (+ Deno for YouTube).

Flow per query: Data API search (videoLicense=creativeCommon for Y1) -> videos.list
(reject madeForKids, categoryId 10 Music / 17 Sports, trailer-ish titles) -> auto-subs VTT ->
first cue containing the query nouns -> 40 s window -> yt-dlp --download-sections (video only,
--force-keyframes-at-cuts, sleep flags, 90 s timeout) -> candidate file for pick_shot/CLIP.
One clip per source video per project (work/<id>/yt/used.json). Y1 <= 6.0 s, Y2 < 5.0 s.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import HTTP_TIMEOUT_S, Pacer, anomaly, dump_json, env_flag, http_get_json, job_dir, load_json, log  # noqa: E402

SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
Y1_MAX_MS = 6000
Y2_MAX_MS = 4966          # strictly < 5.0 s: 149 frames
WINDOW_S = 40
PER_SOURCE_TIMEOUT_S = 90
PACER = Pacer(1.0)
_TRAILER_RE = re.compile(r"\b(official\s+)?(trailer|teaser|music\s+video|full\s+match|highlights|lyric\s+video|MV)\b", re.I)
_REJECT_CATEGORIES = {"10": "music", "17": "sports"}
_TIME_RE = re.compile(r"(\d+):(\d+):(\d+)[.,](\d+)|(\d+):(\d+)[.,](\d+)")


class YoutubeRefused(RuntimeError):
    pass


def allowed_here() -> tuple[bool, str]:
    """Home machine only. CI runners hit the bot wall and violate the policy."""
    if os.environ.get("GITHUB_ACTIONS") and not env_flag("BROLL_ALLOW_YOUTUBE"):
        return False, ("refusing to run YouTube sourcing on a hosted GitHub Actions runner "
                       "(GITHUB_ACTIONS set, BROLL_ALLOW_YOUTUBE not set); use a self-hosted runner or run pre-source at home")
    if not os.environ.get("YOUTUBE_API_KEY"):
        return False, "YOUTUBE_API_KEY is not set"
    return True, "ok"


# ----------------------------------------------------------------------------
# Data API
# ----------------------------------------------------------------------------
def search(query: str, cc_only: bool, max_results: int = 10, session=None) -> list[str]:
    params = {"part": "snippet", "type": "video", "videoEmbeddable": "true", "videoDuration": "medium", "q": query,
              "maxResults": max_results, "key": os.environ["YOUTUBE_API_KEY"]}
    if cc_only:
        params["videoLicense"] = "creativeCommon"
    data = http_get_json(SEARCH_URL, params=params, timeout=HTTP_TIMEOUT_S, pacer=PACER, session=session)
    return parse_search_ids(data)


def parse_search_ids(data: dict) -> list[str]:
    return [it["id"]["videoId"] for it in data.get("items", []) if (it.get("id") or {}).get("videoId")]


def videos_list(ids: list[str], session=None) -> list[dict]:
    if not ids:
        return []
    params = {"part": "contentDetails,status,snippet", "id": ",".join(ids), "key": os.environ["YOUTUBE_API_KEY"]}
    data = http_get_json(VIDEOS_URL, params=params, timeout=HTTP_TIMEOUT_S, pacer=PACER, session=session)
    return data.get("items", [])


def filter_videos(items: list[dict], tier: str) -> list[dict]:
    """Apply the 8.7 rejections; return [{videoId,title,channelTitle,license,durationS,reasons}]."""
    out = []
    for it in items:
        vid = it.get("id")
        sn = it.get("snippet") or {}
        st = it.get("status") or {}
        cd = it.get("contentDetails") or {}
        title = sn.get("title", "")
        why: list[str] = []
        if st.get("madeForKids") or (st.get("selfDeclaredMadeForKids")):
            why.append("madeForKids")
        cat = str(sn.get("categoryId", ""))
        if cat in _REJECT_CATEGORIES:
            why.append(f"category {_REJECT_CATEGORIES[cat]}")
        if _TRAILER_RE.search(title):
            why.append("title looks like trailer/music/sports")
        if tier == "y1" and st.get("license") != "creativeCommon":
            why.append("not creativeCommon")
        if st.get("privacyStatus") not in (None, "public"):
            why.append("not public")
        if not st.get("embeddable", True):
            why.append("not embeddable")
        if why:
            log(f"[youtube] reject {vid} '{title[:50]}': {', '.join(why)}")
            continue
        out.append({"videoId": vid, "title": title, "channelTitle": sn.get("channelTitle", ""),
                    "license": st.get("license", "youtube"), "durationS": iso8601_duration_s(cd.get("duration", ""))})
    return out


def iso8601_duration_s(d: str) -> float:
    m = re.match(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", d or "")
    if not m:
        return 0.0
    days, h, mi, s = (int(x) if x else 0 for x in m.groups())
    return days * 86400 + h * 3600 + mi * 60 + s


# ----------------------------------------------------------------------------
# captions -> window
# ----------------------------------------------------------------------------
def _vtt_time(s: str) -> float:
    m = _TIME_RE.search(s)
    if not m:
        return 0.0
    if m.group(1) is not None:
        return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4)) / 1000.0
    return int(m.group(5)) * 60 + int(m.group(6)) + int(m.group(7)) / 1000.0


def parse_vtt(text: str) -> list[tuple[float, float, str]]:
    cues = []
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if "-->" in lines[i]:
            a, b = lines[i].split("-->")[:2]
            start, end = _vtt_time(a), _vtt_time(b.split()[0] if b.strip() else b)
            i += 1
            buf = []
            while i < len(lines) and lines[i].strip():
                buf.append(re.sub(r"<[^>]+>", "", lines[i]).strip())
                i += 1
            txt = " ".join(buf).strip()
            if txt and (not cues or cues[-1][2] != txt):
                cues.append((start, end, txt))
        i += 1
    return cues


def find_window(cues: list[tuple[float, float, str]], keywords: list[str], duration_s: float,
                window_s: float = WINDOW_S) -> Optional[tuple[float, float]]:
    kws = [k.lower() for k in keywords if len(k) >= 3]
    for start, end, txt in cues:
        low = txt.lower()
        if any(k in low for k in kws):
            centre = (start + end) / 2
            a = max(0.0, centre - window_s / 2)
            b = min(duration_s, a + window_s) if duration_s else a + window_s
            return (round(a, 1), round(b, 1))
    return None


def fetch_auto_subs(video_id: str, out_dir: Path) -> Optional[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = ["yt-dlp", "--write-auto-subs", "--sub-lang", "en", "--skip-download", "--sleep-requests", "2",
           "-o", str(out_dir / "%(id)s"), f"https://www.youtube.com/watch?v={video_id}"]
    try:
        subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=PER_SOURCE_TIMEOUT_S)
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        log(f"[youtube] subs fetch failed for {video_id}: {type(e).__name__}")
        return None
    hits = sorted(out_dir.glob(f"{video_id}*.vtt"))
    return hits[0] if hits else None


def _hms(s: float) -> str:
    s = int(s)
    return f"{s // 3600:02d}:{(s % 3600) // 60:02d}:{s % 60:02d}"


def download_section(video_id: str, start_s: float, end_s: float, out_dir: Path) -> Optional[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    dest = out_dir / f"{video_id}_{int(start_s)}.mp4"
    if dest.exists():
        return dest
    cmd = ["yt-dlp", "--download-sections", f"*{_hms(start_s)}-{_hms(end_s)}", "--force-keyframes-at-cuts",
           "-f", "bv*[height<=1080][ext=mp4]", "--sleep-requests", "2", "--sleep-interval", "3",
           "--no-playlist", "-o", str(out_dir / f"{video_id}_{int(start_s)}.%(ext)s"),
           f"https://www.youtube.com/watch?v={video_id}"]
    try:
        p = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=PER_SOURCE_TIMEOUT_S)
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        log(f"[youtube] download failed for {video_id}: {type(e).__name__}")
        return None
    if p.returncode != 0:
        log(f"[youtube] yt-dlp exit {p.returncode} for {video_id}: {p.stderr[-300:]}")
        return None
    hits = sorted(out_dir.glob(f"{video_id}_{int(start_s)}.*"))
    hits = [h for h in hits if h.suffix in (".mp4", ".webm", ".mkv")]
    return hits[0] if hits else None


# ----------------------------------------------------------------------------
# project-wide state
# ----------------------------------------------------------------------------
def used_ids(job: Path) -> set[str]:
    p = job / "yt" / "used.json"
    return set(load_json(p)) if p.exists() else set()


def mark_used(job: Path, video_id: str) -> None:
    ids = used_ids(job)
    ids.add(video_id)
    dump_json(job / "yt" / "used.json", sorted(ids))


def max_ms(tier: str) -> int:
    return Y1_MAX_MS if tier == "y1" else Y2_MAX_MS


def attribution_for(tier: str, channel: str) -> str:
    return f"{channel} (CC BY)" if tier == "y1" else f"Source: {channel}"


def fetch_candidates(job: Path, query: str, keywords: list[str], tier: str, max_videos: int = 3, session=None) -> list[dict]:
    """Search + filter + window + download up to max_videos section files.
    Returns [{localPath,videoId,channelTitle,title,license,attribution,windowStart}]; never raises for per-source errors."""
    ok, why = allowed_here()
    if not ok:
        raise YoutubeRefused(why)
    used = used_ids(job)
    t0 = time.time()
    ids = [i for i in search(query, cc_only=(tier == "y1"), session=session) if i not in used]
    vids = filter_videos(videos_list(ids, session=session), tier)
    out: list[dict] = []
    yt_dir = job / "yt"
    for v in vids:
        if len(out) >= max_videos:
            break
        src_t0 = time.time()
        vtt = fetch_auto_subs(v["videoId"], yt_dir)
        window = None
        if vtt:
            window = find_window(parse_vtt(vtt.read_text(errors="replace")), keywords, v["durationS"])
        if window is None:
            # no caption hit: sample the middle of the video (still one 40 s window)
            mid = v["durationS"] / 2 if v["durationS"] else 60
            window = (max(0.0, mid - WINDOW_S / 2), max(0.0, mid - WINDOW_S / 2) + WINDOW_S)
            log(f"[youtube] {v['videoId']}: no caption hit for {keywords}; using middle window")
        if time.time() - src_t0 > PER_SOURCE_TIMEOUT_S:
            log(f"[youtube] {v['videoId']}: over the 90 s per-source budget after subs; skipping")
            continue
        f = download_section(v["videoId"], window[0], window[1], yt_dir)
        if not f:
            continue
        out.append({"localPath": f, "videoId": v["videoId"], "channelTitle": v["channelTitle"], "title": v["title"],
                    "license": "CC BY" if tier == "y1" else "Standard YouTube License (Y2 fair-use posture)",
                    "attribution": attribution_for(tier, v["channelTitle"]), "windowStart": window[0], "tier": tier})
    log(f"[youtube] {tier} '{query}': {len(out)} section file(s) in {time.time() - t0:.0f}s")
    return out


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--query", required=True)
    ap.add_argument("--keywords", default="", help="comma-separated nouns to find in captions (default: query words)")
    ap.add_argument("--tier", choices=["y1", "y2"], default="y1")
    ap.add_argument("--max-videos", type=int, default=3)
    args = ap.parse_args(argv)
    job = job_dir(args.job)
    ok, why = allowed_here()
    if not ok:
        log(f"[youtube] {why}")
        return 3
    if args.tier == "y2":
        cfg = load_json(job / "job.json") if (job / "job.json").exists() else None
        if cfg is None:
            from broll_common import load_job_config
            cfg = load_job_config(job)
        if not cfg.get("youtube_short_clip"):
            log("[youtube] Y2 requested but job.yaml youtube_short_clip is false; refusing")
            return 3
    kws = [k.strip() for k in (args.keywords.split(",") if args.keywords else args.query.split()) if k.strip()]
    try:
        cands = fetch_candidates(job, args.query, kws, args.tier, args.max_videos)
    except YoutubeRefused as e:
        log(f"[youtube] {e}")
        return 3
    if not cands:
        anomaly(job, "youtube_cc", f"no candidates for '{args.query}' ({args.tier})")
    print(json.dumps([{**c, "localPath": str(c["localPath"])} for c in cands], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
