#!/usr/bin/env python3
"""Internet Archive public-domain film helper (spec 8.5), used by source_assets.py.

  search(query)                -> [{identifier,title,licenseurl,runtime}] filtered to PD / CC licences
  metadata(identifier)         -> raw metadata JSON
  pick_derivative(meta)        -> best h.264 / MPEG4 file dict (largest <= 1920 wide, prefers 720p+)
  djvu_window(identifier, kws) -> (startS, endS) 60 s window near the first keyword hit in <id>_djvu.txt
  attribution(item)            -> "<title> (Internet Archive, <licenseurl>)"

CLI: archive_org.py search "steel factory" | archive_org.py meta <identifier>
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import HTTP_TIMEOUT_S, Pacer, http_get, http_get_json, log  # noqa: E402

SEARCH_URL = "https://archive.org/advancedsearch.php"
META_URL = "https://archive.org/metadata/{id}"
DOWNLOAD_URL = "https://archive.org/download/{id}/{file}"
PACER = Pacer(1.0)

_OK_LICENSE = re.compile(r"(publicdomain|creativecommons\.org/licenses/(by|by-sa)/|creativecommons\.org/publicdomain|/zero/|/mark/)", re.I)
_BAD_LICENSE = re.compile(r"(/by-nc|/by-nd|/nc-|noncommercial|-nd/)", re.I)


def license_ok(licenseurl: Optional[str], collections: Optional[list] = None) -> bool:
    """Keep public-domain dedications and CC BY / BY-SA only. Prelinger membership alone is NOT enough."""
    if not licenseurl:
        return False
    if isinstance(licenseurl, list):
        licenseurl = licenseurl[0] if licenseurl else ""
    if _BAD_LICENSE.search(licenseurl):
        return False
    return bool(_OK_LICENSE.search(licenseurl))


def license_label(licenseurl: str) -> str:
    u = (licenseurl or "").lower()
    if "publicdomain/zero" in u or "/zero/" in u:
        return "CC0"
    if "publicdomain" in u or "/mark/" in u:
        return "Public Domain"
    if "/by-sa/" in u:
        return "CC BY-SA"
    if "/by/" in u:
        return "CC BY"
    return licenseurl or "unknown"


def parse_search(data: dict) -> list[dict]:
    docs = (data.get("response") or {}).get("docs") or []
    out = []
    for d in docs:
        lic = d.get("licenseurl")
        if isinstance(lic, list):
            lic = lic[0] if lic else None
        if not license_ok(lic):
            continue
        title = d.get("title")
        if isinstance(title, list):
            title = title[0] if title else None
        out.append({"identifier": d.get("identifier"), "title": title or d.get("identifier"),
                    "licenseurl": lic, "runtime": d.get("runtime")})
    return [o for o in out if o["identifier"]]


def search(query: str, rows: int = 20, session=None) -> list[dict]:
    q = f"({query}) AND mediatype:(movies) AND (licenseurl:*publicdomain* OR licenseurl:*creativecommons* OR collection:(prelinger))"
    params = {"q": q, "fl[]": ["identifier", "title", "licenseurl", "runtime"], "rows": rows, "output": "json"}
    data = http_get_json(SEARCH_URL, params=params, timeout=HTTP_TIMEOUT_S, pacer=PACER, session=session)
    return parse_search(data)


def metadata(identifier: str, session=None) -> dict:
    return http_get_json(META_URL.format(id=identifier), timeout=HTTP_TIMEOUT_S, pacer=PACER, session=session)


def _to_int(v) -> int:
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def pick_derivative(meta: dict, max_width: int = 1920) -> Optional[dict]:
    """Prefer h.264 / MPEG4 mp4 derivatives; largest width <= max_width; return the file dict + url."""
    files = meta.get("files") or []
    ident = (meta.get("metadata") or {}).get("identifier") or meta.get("dir", "").split("/")[-1]
    cands = []
    for f in files:
        name = f.get("name", "")
        fmt = str(f.get("format", "")).lower()
        if not name.lower().endswith((".mp4", ".m4v")):
            continue
        if not any(k in fmt for k in ("h.264", "mpeg4", "mp4")):
            continue
        w = _to_int(f.get("width"))
        h = _to_int(f.get("height"))
        if w and w > max_width:
            continue
        rank = (1 if "h.264" in fmt else 0, h, _to_int(f.get("size")))
        cands.append((rank, {"name": name, "format": f.get("format"), "width": w, "height": h,
                             "size": _to_int(f.get("size")), "length": f.get("length"),
                             "url": DOWNLOAD_URL.format(id=ident, file=name)}))
    if not cands:
        return None
    cands.sort(key=lambda c: c[0], reverse=True)
    return cands[0][1]


def djvu_text(identifier: str, meta: dict, session=None) -> Optional[str]:
    names = [f.get("name") for f in meta.get("files") or [] if str(f.get("name", "")).endswith("_djvu.txt")]
    if not names:
        return None
    try:
        r = http_get(DOWNLOAD_URL.format(id=identifier, file=names[0]), timeout=HTTP_TIMEOUT_S, pacer=PACER, session=session)
        return r.text
    except Exception as e:  # noqa: BLE001
        log(f"[archive] djvu fetch failed for {identifier}: {e}")
        return None


def keyword_window(text: str, keywords: list[str], runtime_s: float, window_s: float = 60.0) -> Optional[tuple[float, float]]:
    """Map the first keyword hit's character position onto the runtime proportionally; return a 60 s window."""
    if not text or runtime_s <= 0:
        return None
    low = text.lower()
    pos = -1
    for kw in keywords:
        kw = kw.lower().strip()
        if len(kw) < 3:
            continue
        p = low.find(kw)
        if p >= 0 and (pos < 0 or p < pos):
            pos = p
    if pos < 0:
        return None
    frac = pos / max(1, len(low))
    centre = frac * runtime_s
    start = max(0.0, centre - window_s / 2)
    end = min(runtime_s, start + window_s)
    return (round(start, 1), round(end, 1))


def parse_runtime(rt) -> float:
    """'1:23:45' | '12:34' | '734' -> seconds."""
    if rt is None:
        return 0.0
    if isinstance(rt, list):
        rt = rt[0] if rt else None
    s = str(rt or "").strip()
    if not s:
        return 0.0
    parts = s.split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        return float(parts[0])
    except ValueError:
        return 0.0


def attribution(item: dict) -> str:
    return f"{item.get('title') or item.get('identifier')} (Internet Archive, {item.get('licenseurl') or 'public domain'})"


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query")
    m = sub.add_parser("meta")
    m.add_argument("identifier")
    args = ap.parse_args(argv)
    if args.cmd == "search":
        print(json.dumps(search(args.query), indent=2))
    else:
        meta = metadata(args.identifier)
        print(json.dumps({"derivative": pick_derivative(meta), "license": (meta.get("metadata") or {}).get("licenseurl")}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
