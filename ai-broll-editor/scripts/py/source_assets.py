#!/usr/bin/env python3
"""Asset sourcing chain (spec 8.1 as amended, 7 query consolidation, 8.3-8.8, 22 user assets).

Chain: user asset -> pexels videos -> pexels photos -> openverse -> wikimedia -> nasa -> archiveorg
       -> youtube y1 -> youtube y2 (opt-in) -> none (the Brain then builds a typographic card).
Inputs : work/<id>/plans/*.json (ShotPlan), work/<id>/beats.json, work/<id>/job.yaml
Outputs: work/<id>/assets.json (types.ts Assets), work/<id>/sourcing.log.jsonl (one line per beat),
         downloads under work/<id>/assets/<source>_<kind>_<id>.<ext>
Pexels is paced adaptively (2 s, jumping to a 12 s floor after a real 429, relaxing back on success), backed off on 429 (X-Ratelimit-Reset) and cached 24 h by normalised query.
Every HTTP request has an 8 s timeout. Nothing is ever generated.
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
import archive_org  # noqa: E402
import pick_shot  # noqa: E402
import score_clip  # noqa: E402
from broll_common import (HTTP_TIMEOUT_S, PEXELS_BASE_S, PEXELS_FLOOR_S, DiskCache, HttpError, Pacer, anomaly, append_jsonl,  # noqa: E402
                          cache_dir, download, dump_json, http_get_json, job_dir, load_job_config, load_json, log,
                          media_info, normalise_query, run)

CHAIN = ["pexels_video", "pexels_photo", "openverse", "wikimedia", "nasa", "archiveorg", "youtube_y1", "youtube_y2"]
SOURCE_OF = {"pexels_video": "pexels", "pexels_photo": "pexels", "openverse": "openverse", "wikimedia": "wikimedia",
             "nasa": "nasa", "archiveorg": "archiveorg", "youtube_y1": "youtube", "youtube_y2": "youtube"}
TIER_OF = {"pexels": "stock", "openverse": "stock", "wikimedia": "stock", "nasa": "archival", "archiveorg": "archival",
           "youtube_y1": "y1", "youtube_y2": "y2", "user": "user"}
EMBED_THRESHOLD = 0.92
MIN_VIDEO_MS = 1500
WATERMARK_REJECT = 0.5
LETTERBOX_REJECT = 0.25
PHASH_MIN = 8
IA_MAX_MB = 300

PEXELS_PACER = Pacer(PEXELS_BASE_S, ceiling_s=PEXELS_FLOOR_S, base_s=PEXELS_BASE_S)  # adaptive: 2 s, 12 s after a 429
OTHER_PACER = Pacer(1.0)
_WIKI_OK = re.compile(r"^(cc0|cc[\s-]by(?:[\s-]sa)?(?:[\s-]\d(\.\d)?)?|public domain|pd[\s-]|pd$)", re.I)
_WIKI_BAD = re.compile(r"\b(nc|nd)\b", re.I)


# ----------------------------------------------------------------------------
# candidates
# ----------------------------------------------------------------------------
@dataclass
class Candidate:
    source: str            # AssetSource
    step: str              # chain step
    kind: str              # video | image
    cid: str               # id at the source
    download_url: str
    src_url: str           # page URL for provenance
    license: str
    attribution: Optional[str]
    width: int = 0
    height: int = 0
    duration_ms: int = 0
    ext: str = "mp4"
    channel_title: Optional[str] = None
    source_video_id: Optional[str] = None
    local_path: Optional[Path] = None   # pre-downloaded (user, youtube)
    thumb_url: Optional[str] = None      # small preview for CLIP pre-scoring before the full download
    extra: dict = field(default_factory=dict)

    @property
    def asset_id(self) -> str:
        safe = re.sub(r"[^A-Za-z0-9_-]+", "-", str(self.cid))[:80]
        return f"{self.source}_{'v' if self.kind == 'video' else 'p'}_{safe}"

    @property
    def tier(self) -> str:
        return TIER_OF.get(self.step, TIER_OF.get(self.source, "stock"))


# ----------------------------------------------------------------------------
# response parsers (pure; unit-tested on fixtures)
# ----------------------------------------------------------------------------
def pick_pexels_file(files: list[dict], max_width: int = 1920) -> Optional[dict]:
    mp4 = [f for f in files if str(f.get("file_type", "")).lower() == "video/mp4" and f.get("link")]
    exact = [f for f in mp4 if int(f.get("width") or 0) == max_width]
    if exact:
        return max(exact, key=lambda f: (int(f.get("height") or 0), float(f.get("fps") or 0)))
    fit = [f for f in mp4 if 0 < int(f.get("width") or 0) <= max_width]
    if fit:
        return max(fit, key=lambda f: (int(f.get("width") or 0), int(f.get("height") or 0)))
    return None


def parse_pexels_videos(data: dict) -> list[Candidate]:
    out = []
    for v in data.get("videos", []) or []:
        f = pick_pexels_file(v.get("video_files") or [])
        if not f:
            continue
        user = (v.get("user") or {}).get("name") or "Unknown"
        out.append(Candidate(source="pexels", step="pexels_video", kind="video", cid=str(v["id"]), download_url=f["link"],
                             src_url=v.get("url", ""), license="Pexels License", attribution=f"Video by {user} on Pexels",
                             width=int(f.get("width") or v.get("width") or 0), height=int(f.get("height") or v.get("height") or 0),
                             duration_ms=int(float(v.get("duration") or 0) * 1000), ext="mp4",
                             thumb_url=v.get("image"),
                             extra={"fps": f.get("fps"), "quality": f.get("quality")}))
    return out


def parse_pexels_photos(data: dict) -> list[Candidate]:
    out = []
    for p in data.get("photos", []) or []:
        src = p.get("src") or {}
        link = src.get("large2x") or src.get("large") or src.get("original")
        if not link:
            continue
        w, h = int(p.get("width") or 0), int(p.get("height") or 0)
        if "large2x" in src and w > 1880 and h:
            # large2x is served at 1880 px wide, keep aspect
            h = int(round(h * 1880.0 / w))
            w = 1880
        out.append(Candidate(source="pexels", step="pexels_photo", kind="image", cid=str(p["id"]), download_url=link,
                             src_url=p.get("url", ""), license="Pexels License",
                             attribution=f"Photo by {p.get('photographer') or 'Unknown'} on Pexels", width=w, height=h, ext="jpg",
                             thumb_url=src.get("medium")))
    return out


def parse_openverse(data: dict) -> list[Candidate]:
    out = []
    for r in data.get("results", []) or []:
        lic = str(r.get("license") or "").lower()
        if not r.get("url") or "nc" in lic.split("-") or "nd" in lic.split("-"):
            continue
        label = f"CC {lic.upper()} {r.get('license_version') or ''}".strip() if lic not in ("cc0", "pdm") else ("CC0" if lic == "cc0" else "Public Domain")
        ext = "jpg"
        m = re.search(r"\.(jpe?g|png|webp|gif)(?:\?|$)", r["url"], re.I)
        if m:
            ext = m.group(1).lower().replace("jpeg", "jpg")
        out.append(Candidate(source="openverse", step="openverse", kind="image", cid=str(r.get("id")), download_url=r["url"],
                             src_url=r.get("foreign_landing_url") or r["url"], license=label,
                             attribution=r.get("attribution") or f"{r.get('title') or 'Image'} by {r.get('creator') or 'unknown'} ({label})",
                             width=int(r.get("width") or 0), height=int(r.get("height") or 0), ext=ext))
    return out


def wikimedia_license_ok(short: str) -> bool:
    s = (short or "").strip()
    if not s or _WIKI_BAD.search(s):
        return False
    return bool(_WIKI_OK.search(s))


def _strip_html(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def parse_wikimedia(data: dict, want_video: bool = False) -> list[Candidate]:
    out = []
    pages = ((data.get("query") or {}).get("pages") or {})
    items = pages.values() if isinstance(pages, dict) else pages
    for pg in items:
        ii = (pg.get("imageinfo") or [None])[0]
        if not ii:
            continue
        em = ii.get("extmetadata") or {}
        short = (em.get("LicenseShortName") or {}).get("value", "")
        if not wikimedia_license_ok(short):
            continue
        mime = str(ii.get("mime") or "")
        is_video = mime.startswith("video/") or str(ii.get("url", "")).lower().endswith((".webm", ".ogv", ".mp4"))
        if is_video != want_video:
            continue
        artist = _strip_html((em.get("Artist") or {}).get("value", "")) or "Wikimedia Commons contributor"
        url = ii.get("url") if is_video else (ii.get("thumburl") or ii.get("url"))
        if not url:
            continue
        w = int(ii.get("thumbwidth") or ii.get("width") or 0) if not is_video else int(ii.get("width") or 0)
        h = int(ii.get("thumbheight") or ii.get("height") or 0) if not is_video else int(ii.get("height") or 0)
        ext = url.rsplit(".", 1)[-1].lower()[:4] if "." in url.rsplit("/", 1)[-1] else ("webm" if is_video else "jpg")
        title = str(pg.get("title", "")).replace("File:", "")
        out.append(Candidate(source="wikimedia", step="wikimedia", kind="video" if is_video else "image",
                             cid=str(pg.get("pageid") or title), download_url=url,
                             src_url=ii.get("descriptionurl") or f"https://commons.wikimedia.org/wiki/{pg.get('title', '')}",
                             license=short, attribution=f"{artist}, {short}, via Wikimedia Commons", width=w, height=h,
                             duration_ms=int(float(ii.get("duration") or 0) * 1000), ext=ext, extra={"title": title}))
    return out


def parse_nasa_search(data: dict) -> list[dict]:
    """[{nasa_id,title,media_type,manifest}] from images-api search."""
    out = []
    for it in ((data.get("collection") or {}).get("items") or []):
        d = (it.get("data") or [{}])[0]
        if d.get("media_type") not in ("image", "video") or not it.get("href"):
            continue
        out.append({"nasa_id": d.get("nasa_id"), "title": d.get("title"), "media_type": d["media_type"], "manifest": it["href"],
                    "preview": next((l.get("href") for l in it.get("links") or [] if l.get("rel") == "preview"), None)})
    return out


def pick_nasa_file(manifest: list[str], media_type: str) -> Optional[str]:
    if media_type == "image":
        for pref in ("~large.jpg", "~medium.jpg", "~orig.jpg", "~orig.png", "~large.png"):
            for u in manifest:
                if u.lower().endswith(pref):
                    return u
        return next((u for u in manifest if u.lower().endswith((".jpg", ".png"))), None)
    for pref in ("~medium.mp4", "~mobile.mp4", "~orig.mp4", "~small.mp4"):
        for u in manifest:
            if u.lower().endswith(pref):
                return u
    return next((u for u in manifest if u.lower().endswith(".mp4")), None)


def nasa_candidate(item: dict, file_url: str) -> Candidate:
    kind = "video" if item["media_type"] == "video" else "image"
    ext = "mp4" if kind == "video" else ("png" if file_url.lower().endswith(".png") else "jpg")
    return Candidate(source="nasa", step="nasa", kind=kind, cid=str(item["nasa_id"]), download_url=file_url,
                     src_url=f"https://images.nasa.gov/details/{item['nasa_id']}", license="Public Domain (NASA)",
                     attribution="NASA", ext=ext, extra={"title": item.get("title")})


# ----------------------------------------------------------------------------
# query consolidation (spec 7)
# ----------------------------------------------------------------------------
class UnionFind:
    def __init__(self, n: int):
        self.p = list(range(n))

    def find(self, a: int) -> int:
        while self.p[a] != a:
            self.p[a] = self.p[self.p[a]]
            a = self.p[a]
        return a

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.p[max(ra, rb)] = min(ra, rb)


def consolidate_queries(pairs: list[tuple[str, str]], embed: Optional[Callable[[list[str]], Any]] = None,
                        threshold: float = EMBED_THRESHOLD) -> dict[str, dict]:
    """pairs = [(beatId, query)] -> {clusterKey: {"query": representative, "members": [(beatId, query)], "norms": [...]}}.

    Stage 1: exact normalised-string match. Stage 2 (optional): text-embedding cosine >= threshold merges clusters.
    """
    by_norm: dict[str, list[tuple[str, str]]] = {}
    order: list[str] = []
    for bid, q in pairs:
        n = normalise_query(q)
        if not n:
            continue
        if n not in by_norm:
            by_norm[n] = []
            order.append(n)
        by_norm[n].append((bid, q))
    if embed is not None and len(order) > 1:
        reps = [by_norm[n][0][1] for n in order]
        try:
            vecs = embed(reps)
        except Exception as e:  # noqa: BLE001
            log(f"[consolidate] embedding failed ({e}); string clustering only")
            vecs = None
        if vecs is not None:
            uf = UnionFind(len(order))
            for i in range(len(order)):
                for j in range(i + 1, len(order)):
                    sim = float(sum(a * b for a, b in zip(vecs[i], vecs[j])))
                    if sim >= threshold:
                        uf.union(i, j)
            merged: dict[int, list[str]] = {}
            for i, n in enumerate(order):
                merged.setdefault(uf.find(i), []).append(n)
            out: dict[str, dict] = {}
            for root, norms in merged.items():
                members = [m for n in norms for m in by_norm[n]]
                out[order[root]] = {"query": by_norm[order[root]][0][1], "members": members, "norms": norms}
            return out
    return {n: {"query": by_norm[n][0][1], "members": by_norm[n], "norms": [n]} for n in order}


# ----------------------------------------------------------------------------
# the sourcer
# ----------------------------------------------------------------------------
class Sourcer:
    def __init__(self, job: Path, cfg: dict, *, sources: list[str], dry_run: bool, accept_unscored: bool,
                 max_per_query: int, max_candidates: int, session=None):
        self.job = job
        self.current_threshold = 0.26
        self.cfg = cfg
        self.sources = sources
        self.dry_run = dry_run
        self.accept_unscored = accept_unscored
        self.max_per_query = max_per_query
        self.max_candidates = max_candidates
        self.session = session
        self.cache = DiskCache(cache_dir())
        self.assets_dir = job / "assets"
        self.assets_dir.mkdir(parents=True, exist_ok=True)
        self.search_cache: dict[tuple[str, str], list[Candidate]] = {}
        self.taken: set[str] = set()
        self.chosen_hashes: list = []
        self.eval_cache: dict[tuple[str, str], dict] = {}
        self.pexels_key = os.environ.get("PEXELS_API_KEY", "")
        self.calls = 0

    # -- search per step -----------------------------------------------------
    def _cached_json(self, ns: str, key: str, fetch: Callable[[], Any]) -> Any:
        hit = self.cache.get(ns, key)
        if hit is not None:
            return hit
        data = fetch()
        self.calls += 1
        self.cache.put(ns, key, data)
        return data

    def search(self, step: str, query: str) -> list[Candidate]:
        key = (step, normalise_query(query))
        if key in self.search_cache:
            return self.search_cache[key]
        try:
            cands = self._search_uncached(step, query)
        except HttpError as e:
            anomaly(self.job, "source_assets", f"{step} search failed for '{query}': {e}")
            cands = []
        except Exception as e:  # noqa: BLE001
            anomaly(self.job, "source_assets", f"{step} search error for '{query}': {type(e).__name__}: {e}")
            cands = []
        self.search_cache[key] = cands
        return cands

    def _search_uncached(self, step: str, query: str) -> list[Candidate]:
        nq = normalise_query(query)
        if step == "pexels_video":
            if not self.pexels_key:
                raise HttpError(401, "PEXELS_API_KEY not set")
            data = self._cached_json("pexels", f"videos|{nq}", lambda: http_get_json(
                "https://api.pexels.com/videos/search", params={"query": query, "orientation": "landscape", "size": "medium", "per_page": 15},
                headers={"Authorization": self.pexels_key}, timeout=HTTP_TIMEOUT_S, pacer=PEXELS_PACER, session=self.session))
            return parse_pexels_videos(data)
        if step == "pexels_photo":
            if not self.pexels_key:
                raise HttpError(401, "PEXELS_API_KEY not set")
            data = self._cached_json("pexels", f"photos|{nq}", lambda: http_get_json(
                "https://api.pexels.com/v1/search", params={"query": query, "orientation": "landscape", "size": "large", "per_page": 15},
                headers={"Authorization": self.pexels_key}, timeout=HTTP_TIMEOUT_S, pacer=PEXELS_PACER, session=self.session))
            return parse_pexels_photos(data)
        if step == "openverse":
            data = self._cached_json("openverse", nq, lambda: http_get_json(
                "https://api.openverse.org/v1/images/", params={"q": query, "license_type": "commercial", "aspect_ratio": "wide",
                                                              "size": "large", "page_size": 20},
                timeout=HTTP_TIMEOUT_S, pacer=OTHER_PACER, retries=1, session=self.session))
            return parse_openverse(data)
        if step == "wikimedia":
            out: list[Candidate] = []
            for ftype, want_video in (("bitmap", False), ("video", True)):
                data = self._cached_json("wikimedia", f"{ftype}|{nq}", lambda: http_get_json(
                    "https://commons.wikimedia.org/w/api.php",
                    params={"action": "query", "generator": "search", "gsrsearch": f"filetype:{ftype} {query}", "gsrnamespace": 6,
                            "gsrlimit": 20, "prop": "imageinfo", "iiprop": "url|extmetadata|size|mime", "iiurlwidth": 1920, "format": "json"},
                    headers={"User-Agent": "ai-broll-editor/0.1 (https://github.com/kapilshipturtle/hyperframes)"},
                    timeout=HTTP_TIMEOUT_S, pacer=OTHER_PACER, session=self.session))
                out.extend(parse_wikimedia(data, want_video=want_video))
            return out
        if step == "nasa":
            data = self._cached_json("nasa", nq, lambda: http_get_json(
                "https://images-api.nasa.gov/search", params={"q": query, "media_type": "image,video"},
                timeout=HTTP_TIMEOUT_S, pacer=OTHER_PACER, session=self.session))
            out = []
            for item in parse_nasa_search(data)[:8]:
                try:
                    manifest = self._cached_json("nasa", f"manifest|{item['nasa_id']}", lambda: http_get_json(
                        item["manifest"], timeout=HTTP_TIMEOUT_S, pacer=OTHER_PACER, session=self.session))
                except Exception as e:  # noqa: BLE001
                    log(f"[nasa] manifest failed for {item['nasa_id']}: {e}")
                    continue
                url = pick_nasa_file(manifest if isinstance(manifest, list) else [], item["media_type"])
                if url:
                    out.append(nasa_candidate(item, url))
            return out
        if step == "archiveorg":
            data = self._cached_json("archiveorg", nq, lambda: archive_org.search(query, session=self.session))
            items = data if isinstance(data, list) and data and isinstance(data[0], dict) and "identifier" in data[0] else archive_org.parse_search(data)
            out = []
            for it in items[:6]:
                try:
                    meta = self._cached_json("archiveorg", f"meta|{it['identifier']}", lambda: archive_org.metadata(it["identifier"], session=self.session))
                except Exception as e:  # noqa: BLE001
                    log(f"[archive] metadata failed for {it['identifier']}: {e}")
                    continue
                der = archive_org.pick_derivative(meta)
                if not der or der["size"] > IA_MAX_MB * 1024 * 1024:
                    continue
                runtime = archive_org.parse_runtime(it.get("runtime")) or float(der.get("length") or 0)
                out.append(Candidate(source="archiveorg", step="archiveorg", kind="video", cid=it["identifier"], download_url=der["url"],
                                     src_url=f"https://archive.org/details/{it['identifier']}", license=archive_org.license_label(it.get("licenseurl") or ""),
                                     attribution=archive_org.attribution(it), width=der["width"], height=der["height"],
                                     duration_ms=int(runtime * 1000), ext="mp4",
                                     extra={"identifier": it["identifier"], "meta_files": [f.get("name") for f in meta.get("files") or []],
                                            "runtime_s": runtime}))
            return out
        if step in ("youtube_y1", "youtube_y2"):
            import youtube_cc

            tier = "y1" if step == "youtube_y1" else "y2"
            kws = [t for t in re.split(r"\s+", query) if len(t) >= 3]
            cands = youtube_cc.fetch_candidates(self.job, query, kws, tier, session=self.session)
            out = []
            for c in cands:
                if c["videoId"] in self.taken_video_ids():
                    continue
                out.append(Candidate(source="youtube", step=step, kind="video", cid=f"{c['videoId']}_{int(c['windowStart'])}",
                                     download_url="", src_url=f"https://www.youtube.com/watch?v={c['videoId']}", license=c["license"],
                                     attribution=c["attribution"], channel_title=c["channelTitle"], source_video_id=c["videoId"],
                                     local_path=Path(c["localPath"]), ext=Path(c["localPath"]).suffix.lstrip(".") or "mp4"))
            return out
        raise ValueError(f"unknown step {step}")

    def taken_video_ids(self) -> set[str]:
        return {t.split(":", 1)[1] for t in self.taken if t.startswith("yt:")}

    # -- evaluation --------------------------------------------------------------
    def fetch(self, c: Candidate) -> Path:
        if c.local_path and c.local_path.exists():
            return c.local_path
        dest = self.assets_dir / f"{c.source}_{c.kind}_{re.sub(r'[^A-Za-z0-9_-]+', '-', c.cid)[:80]}.{c.ext}"
        headers = {"User-Agent": "ai-broll-editor/0.1"} if c.source in ("wikimedia", "openverse") else None
        max_bytes = (IA_MAX_MB if c.source == "archiveorg" else 400) * 1024 * 1024
        # media CDNs are not rate limited like the search API; no pacer on downloads
        download(c.download_url, dest, headers=headers, timeout=HTTP_TIMEOUT_S, max_bytes=max_bytes)
        c.local_path = dest
        return dest

    def _archive_window(self, c: Candidate, local: Path, keywords: list[str]) -> tuple[Path, int]:
        """Cut a 60 s window near the djvu keyword hit (spec 8.5); returns (window_file, offset_ms)."""
        info = media_info(local)
        runtime_s = info["durationMs"] / 1000.0
        window = None
        if any(str(n).endswith("_djvu.txt") for n in c.extra.get("meta_files", [])):
            try:
                meta = {"files": [{"name": n} for n in c.extra.get("meta_files", [])]}
                text = archive_org.djvu_text(c.extra["identifier"], meta, session=self.session)
                window = archive_org.keyword_window(text or "", keywords, runtime_s)
            except Exception as e:  # noqa: BLE001
                log(f"[archive] djvu window failed: {e}")
        if window is None:
            # no text: take the window after the title cards (10% in), 60 s long
            start = min(max(0.0, runtime_s * 0.1), max(0.0, runtime_s - 60))
            window = (round(start, 1), round(min(runtime_s, start + 60), 1))
        if runtime_s <= 75:
            return local, 0
        wdest = local.with_name(f"{local.stem}_w{int(window[0])}.mp4")
        if not wdest.exists():
            run(["ffmpeg", "-y", "-ss", f"{window[0]:.1f}", "-i", str(local), "-t", f"{window[1] - window[0]:.1f}", "-an",
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(wdest)])
        return wdest, int(window[0] * 1000)

    def evaluate(self, c: Candidate, intent: str, need_ms: int, keywords: list[str]) -> dict:
        """Download + filters + score + in/out. Returns {ok, reject, asset}."""
        key = (c.asset_id, intent)
        if key in self.eval_cache:
            return self.eval_cache[key]
        res = self._evaluate(c, intent, need_ms, keywords)
        self.eval_cache[key] = res
        return res

    THUMB_MARGIN = 0.06   # a thumbnail scoring this far under the threshold is not worth a full download

    def prescore(self, c: Candidate, intent: str, threshold: float) -> Optional[float]:
        """CLIP-score the provider thumbnail (spec 8.6 scoring on frames, applied before the download). None = no thumbnail."""
        if not c.thumb_url or not score_clip.clip_available():
            return None
        dest = self.assets_dir / "thumbs" / f"{c.source}_{c.kind}_{re.sub(r'[^A-Za-z0-9_-]+', '-', c.cid)[:80]}.jpg"
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            if not dest.exists():
                download(c.thumb_url, dest, timeout=HTTP_TIMEOUT_S, max_bytes=5 * 1024 * 1024)
            return float(score_clip.score(intent, [dest]))
        except Exception as e:  # noqa: BLE001
            log(f"[prescore] {c.asset_id}: thumbnail failed ({type(e).__name__}); downloading the full file")
            return None

    def _evaluate(self, c: Candidate, intent: str, need_ms: int, keywords: list[str]) -> dict:
        reasons: list[str] = []
        pre = self.prescore(c, intent, self.current_threshold)
        if pre is not None and pre < self.current_threshold - self.THUMB_MARGIN:
            return {"ok": False, "reject": f"thumbnail pre-score {pre:.3f} < {self.current_threshold - self.THUMB_MARGIN:.2f}; not downloaded"}
        if pre is not None:
            reasons.append(f"thumbnail pre-score {pre:.3f}")
        try:
            local = self.fetch(c)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "reject": f"download failed: {type(e).__name__}: {str(e)[:120]}"}
        try:
            info = media_info(local)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "reject": f"unreadable media: {e}"}
        if not info["hasVideo"]:
            return {"ok": False, "reject": "no video stream"}
        kind = "image" if info["isImage"] else "video"
        if kind == "video" and info["durationMs"] < MIN_VIDEO_MS:
            return {"ok": False, "reject": f"too short ({info['durationMs']} ms)"}
        width, height = info["width"], info["height"]
        portrait = bool(width and height and width < height)
        if portrait:
            reasons.append("portrait: route to pip-over-blur")
        # spec 8.5 / 11.6 rule 2: the SD-archival treatment is for Internet Archive film, not a 1366 px stock clip (which upscales fine)
        sd = c.source == "archiveorg" and kind == "video" and 0 < height < 720
        probe = local
        offset_ms = 0
        if c.source == "archiveorg" and kind == "video":
            try:
                probe, offset_ms = self._archive_window(c, local, keywords)
            except Exception as e:  # noqa: BLE001
                reasons.append(f"archive window failed ({e}); whole film")
        # frames + filters
        try:
            frames = score_clip.frames(probe) if kind == "video" else [local]
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "reject": f"frame extraction failed: {e}"}
        if not frames:
            return {"ok": False, "reject": "no frames"}
        try:
            h = score_clip.phash(frames[len(frames) // 2])
            if any(score_clip.phash_distance(h, other) < PHASH_MIN for other in self.chosen_hashes):
                return {"ok": False, "reject": "duplicate (pHash < 8 to a chosen asset)"}
        except Exception as e:  # noqa: BLE001
            reasons.append(f"phash unavailable ({type(e).__name__})")
            h = None
        wm = max(score_clip.watermark_score(f) for f in frames)
        if wm > WATERMARK_REJECT:
            return {"ok": False, "reject": f"watermark heuristic {wm:.2f}"}
        if c.tier == "stock":
            lb = score_clip.letterbox(probe)
            if lb["fraction"] > LETTERBOX_REJECT:
                return {"ok": False, "reject": f"black borders {lb['fraction']:.0%}"}
        clip_score = score_clip.score(intent, frames)
        in_ms, out_ms, scene = 0, need_ms, None
        if kind == "video":
            picked = pick_shot.pick(probe, intent, need_ms, prefer_motion=True, work_dir=self.assets_dir)
            in_ms, out_ms = picked["inMs"] + offset_ms, picked["outMs"] + offset_ms
            scene = picked["sceneScore"]
            clip_score = max(clip_score, picked["clipScore"])
            reasons.extend(picked["reasons"])
        reasons.append("no watermark" if wm < 0.15 else f"watermark score {wm:.2f}")
        asset = {
            "assetId": c.asset_id, "kind": kind, "source": c.source, "srcUrl": c.src_url,
            "localPath": _rel(local, self.job),
            "inMs": int(in_ms), "outMs": int(out_ms), "width": width, "height": height,
            "fps": info["fps"], "durationMs": info["durationMs"], "clipScore": round(float(clip_score), 4),
            "sceneScore": scene, "license": c.license, "attribution": c.attribution, "tier": c.tier,
            "sd": sd, "channelTitle": c.channel_title, "sourceVideoId": c.source_video_id, "reasons": reasons,
        }
        if kind == "image":
            asset.pop("sceneScore")
            asset.pop("fps")
        if not sd:
            asset.pop("sd")
        if c.channel_title is None:
            asset.pop("channelTitle")
        if c.source_video_id is None:
            asset.pop("sourceVideoId")
        return {"ok": True, "asset": asset, "hash": h}

    # -- per beat ----------------------------------------------------------------
    def user_asset(self, beat_id: str) -> Optional[Candidate]:
        d = self.assets_dir / "user"
        if not d.exists():
            return None
        for p in sorted(d.iterdir()):
            if p.stem == beat_id and p.suffix.lower() in {".mp4", ".mov", ".mkv", ".webm", ".jpg", ".jpeg", ".png", ".webp"}:
                kind = "video" if p.suffix.lower() in {".mp4", ".mov", ".mkv", ".webm"} else "image"
                return Candidate(source="user", step="user", kind=kind, cid=beat_id, download_url="", src_url=str(p),
                                 license="user-provided", attribution=None, local_path=p, ext=p.suffix.lstrip("."))
        return None

    def source_beat(self, shot: dict, beat: dict, clusters: dict[str, dict]) -> dict:
        t0 = time.time()
        bid = shot["beatId"]
        importance = int(shot.get("importance", 3))
        brain = self.cfg.get("brain") or {}
        threshold = float(brain.get("hero_threshold", 0.30)) if importance >= 5 else float(brain.get("clip_threshold", 0.26))
        self.current_threshold = threshold
        intent = shot.get("visualIntent") or " ".join(shot.get("queries") or []) or beat.get("text", "")
        need_ms = max(1500, int(beat["endMs"] - beat["startMs"]) + 600)
        keywords = [t for q in shot.get("queries") or [] for t in re.split(r"\s+", q) if len(t) >= 3]
        scored: list[dict] = []
        tried = 0
        steps_tried: list[str] = []
        rejects: list[str] = []
        chosen: Optional[dict] = None

        ua = self.user_asset(bid)
        if ua:
            res = self.evaluate(ua, intent, need_ms, keywords)
            if res["ok"]:
                chosen = res["asset"]
                chosen["reasons"].insert(0, "user-provided asset wins over all sources (spec 22)")
                chosen["clipScore"] = max(chosen["clipScore"], threshold)
            else:
                anomaly(self.job, "source_assets", f"{bid}: user asset rejected: {res['reject']}", beatId=bid)

        for step in self.sources if chosen is None else []:
            steps_tried.append(step)
            for q in shot.get("queries") or []:
                cluster = clusters.get(normalise_query(q))
                cands = self.search(step, (cluster or {}).get("query", q))
                n_this = 0
                for c in cands:
                    if tried >= self.max_candidates or n_this >= self.max_per_query:
                        break
                    if c.asset_id in self.taken or (c.source_video_id and f"yt:{c.source_video_id}" in self.taken):
                        continue
                    if step in ("pexels_video", "wikimedia", "nasa", "archiveorg") and c.kind == "video" and c.duration_ms and c.duration_ms < MIN_VIDEO_MS:
                        continue
                    tried += 1
                    n_this += 1
                    yt_need = need_ms
                    if step == "youtube_y2":
                        import youtube_cc
                        yt_need = min(need_ms, youtube_cc.Y2_MAX_MS)
                    elif step == "youtube_y1":
                        import youtube_cc
                        yt_need = min(need_ms, youtube_cc.Y1_MAX_MS)
                    res = self.evaluate(c, intent, yt_need, keywords)
                    if not res["ok"]:
                        rejects.append(f"{c.asset_id}: {res['reject']}")
                        continue
                    a = res["asset"]
                    scored.append(a)
                    if a["clipScore"] >= threshold or (self.accept_unscored and not score_clip.clip_available()):
                        chosen = a
                        a["reasons"].insert(0, f"first candidate >= {threshold:.2f} at step {step} ({tried} tried)")
                        if self.accept_unscored and not score_clip.clip_available():
                            a["reasons"].insert(1, "ACCEPTED UNSCORED: open_clip unavailable")
                        if c.source_video_id:
                            import youtube_cc
                            youtube_cc.mark_used(self.job, c.source_video_id)
                            self.taken.add(f"yt:{c.source_video_id}")
                        if res.get("hash") is not None:
                            self.chosen_hashes.append(res["hash"])
                        break
                if chosen is not None or tried >= self.max_candidates:
                    break
            if chosen is not None or tried >= self.max_candidates:
                break

        if chosen is not None:
            self.taken.add(chosen["assetId"])
        alternates = sorted((a for a in scored if chosen is None or a["assetId"] != chosen["assetId"]),
                            key=lambda a: -a["clipScore"])[:2]
        for a in alternates:
            self.taken.add(a["assetId"])
        if chosen is None:
            anomaly(self.job, "source_assets", f"{bid}: no candidate >= {threshold:.2f} after {tried} tried "
                    f"(best {max((a['clipScore'] for a in scored), default=0):.3f}); Brain falls back to typographic-card", beatId=bid)
        append_jsonl(self.job / "sourcing.log.jsonl", {
            "beatId": bid, "importance": importance, "threshold": threshold, "intent": intent, "queries": shot.get("queries"),
            "chosen": chosen["assetId"] if chosen else None, "source": chosen["source"] if chosen else None,
            "clipScore": chosen["clipScore"] if chosen else None, "tried": tried, "steps": steps_tried,
            "alternates": [a["assetId"] for a in alternates], "rejects": rejects[:20], "elapsedS": round(time.time() - t0, 1),
            "clip": score_clip.clip_available(),
        })
        return {"chosen": chosen, "alternates": alternates}


# ----------------------------------------------------------------------------
def _rel(path: Path, base: Path) -> str:
    try:
        return str(path.resolve().relative_to(base.resolve()))
    except ValueError:
        return str(path)


def load_shots(job: Path) -> list[dict]:
    plans_dir = job / "plans"
    shots: list[dict] = []
    for p in sorted(plans_dir.glob("*.json")):
        if p.name.endswith(".raw.json"):
            continue
        plan = load_json(p)
        for s in plan.get("shots", []):
            s = dict(s)
            s["_sectionId"] = plan.get("sectionId")
            shots.append(s)
    if not shots:
        raise SystemExit(f"no ShotPlan json under {plans_dir}")
    return shots


def resolve_sources(cfg: dict, override: Optional[str]) -> list[str]:
    if override:
        wanted = [s.strip() for s in override.split(",") if s.strip()]
        steps = []
        for s in wanted:
            if s == "pexels":
                steps += ["pexels_video", "pexels_photo"]
            elif s == "youtube":
                steps += ["youtube_y1"] + (["youtube_y2"] if cfg.get("youtube_short_clip") else [])
            elif s in CHAIN:
                steps.append(s)
            else:
                raise SystemExit(f"unknown source '{s}' (pexels, openverse, wikimedia, nasa, archiveorg, youtube)")
        return [s for s in CHAIN if s in steps]
    src = cfg.get("sources") or {}
    steps = []
    if src.get("pexels", True):
        steps += ["pexels_video", "pexels_photo"]
    for s in ("openverse", "wikimedia", "nasa", "archiveorg"):
        if src.get(s, True):
            steps.append(s)
    if cfg.get("youtube"):
        steps.append("youtube_y1")
        if cfg.get("youtube_short_clip"):
            steps.append("youtube_y2")
    return steps


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--sources", help="override: comma list of pexels,openverse,wikimedia,nasa,archiveorg,youtube")
    ap.add_argument("--only-beats", help="comma-separated beat ids to (re)source; others kept from assets.json")
    ap.add_argument("--dry-run", action="store_true", help="print the consolidated search plan; no network")
    ap.add_argument("--no-embed", action="store_true", help="string clustering only (skip open_clip text embeddings)")
    ap.add_argument("--accept-unscored", action="store_true",
                    help="when open_clip is missing accept the first filter-passing candidate (score 0) instead of none")
    ap.add_argument("--max-per-query", type=int, default=4)
    ap.add_argument("--max-candidates", type=int, default=12, help="per beat, across all sources")
    args = ap.parse_args(argv)

    job = job_dir(args.job)
    cfg = load_job_config(job)
    beats_doc = load_json(job / "beats.json")
    beats = {b["id"]: b for b in beats_doc["beats"]}
    shots = load_shots(job)
    steps = resolve_sources(cfg, args.sources)
    if any(s.startswith("youtube") for s in steps):
        import youtube_cc
        ok, why = youtube_cc.allowed_here()
        if not ok:
            anomaly(job, "source_assets", f"YouTube steps disabled: {why}")
            steps = [s for s in steps if not s.startswith("youtube")]
    only = set(args.only_beats.split(",")) if args.only_beats else None
    todo = [s for s in shots if s["beatId"] in beats and (only is None or s["beatId"] in only)]
    missing = [s["beatId"] for s in shots if s["beatId"] not in beats]
    if missing:
        anomaly(job, "source_assets", f"{len(missing)} shots reference unknown beats: {missing[:5]}")

    pairs = [(s["beatId"], q) for s in todo for q in (s.get("queries") or [])]
    embed = None
    if not args.no_embed and not args.dry_run and score_clip.clip_available():
        embed = score_clip.text_embeddings
    clusters_by_key = consolidate_queries(pairs, embed=embed)
    clusters: dict[str, dict] = {}
    for key, cl in clusters_by_key.items():
        for n in cl["norms"]:
            clusters[n] = cl
    log(f"[source] {len(todo)} beats, {len(pairs)} queries -> {len(clusters_by_key)} clusters; steps: {', '.join(steps)}; "
        f"clip={'yes' if score_clip.clip_available() else 'NO'}")

    if args.dry_run:
        plan = {"job": str(job), "steps": steps, "beats": len(todo), "queries": len(pairs), "clusters": [
            {"query": cl["query"], "beats": sorted({b for b, _ in cl["members"]}), "variants": sorted({q for _, q in cl["members"]})}
            for cl in clusters_by_key.values()],
            "thresholds": {"default": (cfg.get("brain") or {}).get("clip_threshold", 0.26), "importance5": (cfg.get("brain") or {}).get("hero_threshold", 0.30)},
            "estimated_pexels_calls": 2 * len(clusters_by_key), "pexels_floor_s": PEXELS_FLOOR_S,
            "user_assets": sorted(p.name for p in (job / "assets" / "user").glob("*")) if (job / "assets" / "user").exists() else []}
        print(json.dumps(plan, indent=2))
        return 0

    if not score_clip.clip_available():
        anomaly(job, "source_assets", "open_clip not importable: clipScore is 0 for everything" +
                ("; --accept-unscored is ON (first filter-passing candidate wins)" if args.accept_unscored else
                 "; no beat will pass the threshold (pass --accept-unscored or install requirements.txt)"))

    apath = job / "assets.json"
    assets: dict = load_json(apath) if apath.exists() else {}
    sourcer = Sourcer(job, cfg, sources=steps, dry_run=False, accept_unscored=args.accept_unscored,
                      max_per_query=args.max_per_query, max_candidates=args.max_candidates)
    # keep already chosen assets out of the pool and in the dedupe set
    for bid, entry in assets.items():
        if only is not None and bid in only:
            continue
        ch = (entry or {}).get("chosen")
        if ch:
            sourcer.taken.add(ch["assetId"])
            lp = job / ch["localPath"]
            if lp.exists():
                try:
                    fr = score_clip.frames(lp) if ch["kind"] == "video" else [lp]
                    sourcer.chosen_hashes.append(score_clip.phash(fr[len(fr) // 2]))
                except Exception:  # noqa: BLE001
                    pass

    t0 = time.time()
    n_ok = 0
    for i, shot in enumerate(todo):
        beat = beats[shot["beatId"]]
        result = sourcer.source_beat(shot, beat, clusters)
        assets[shot["beatId"]] = result
        n_ok += 1 if result["chosen"] else 0
        dump_json(apath, assets)  # checkpoint after every beat
        log(f"[source] {i + 1}/{len(todo)} {shot['beatId']}: "
            f"{result['chosen']['assetId'] + ' ' + str(result['chosen']['clipScore']) if result['chosen'] else 'NONE'} "
            f"(+{len(result['alternates'])} alt) {time.time() - t0:.0f}s")
    log(f"[source] done: {n_ok}/{len(todo)} beats got an asset; {sourcer.calls} live API calls; {apath}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
