#!/usr/bin/env python3
"""Cross-check tool: per-word emphasis exactly as spec 11.4.

  emph = 0.45*z(rms) + 0.25*z(duration) + 0.15*(gapBefore > 250 ms) + 0.15*(director emphasisWordIds contains id)

z-scores are computed within each section of beats.json (words not covered by any
section form one extra pseudo-section). Writes work/<id>/emphasis.json {wordId: weight}.
The TS Brain recomputes this itself; use this to diff against it.
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import anomaly, dump_json, job_dir, load_json, log  # noqa: E402

STRONG = 1.0
MEDIUM = 0.5


def zscores(vals: list[float]) -> list[float]:
    n = len(vals)
    if n == 0:
        return []
    mean = sum(vals) / n
    var = sum((v - mean) ** 2 for v in vals) / n
    sd = math.sqrt(var)
    if sd < 1e-9:
        return [0.0] * n
    return [(v - mean) / sd for v in vals]


def section_word_groups(words: list[dict], beats: dict) -> list[list[int]]:
    """Word-id groups per section (from beats.wordIds); leftovers become one extra group."""
    by_beat = {b["id"]: b for b in beats.get("beats", [])}
    groups: list[list[int]] = []
    seen: set[int] = set()
    for sec in beats.get("sections", []):
        ids: list[int] = []
        for bid in sec.get("beatIds", []):
            b = by_beat.get(bid)
            if b:
                ids.extend(int(i) for i in b.get("wordIds", []))
        if not ids:  # fall back to time range
            ids = [w["id"] for w in words if sec["startMs"] <= w["startMs"] < sec["endMs"]]
        ids = [i for i in ids if i not in seen]
        seen.update(ids)
        if ids:
            groups.append(ids)
    rest = [w["id"] for w in words if w["id"] not in seen]
    if rest:
        groups.append(rest)
    return groups


def compute_emphasis(words: list[dict], beats: dict, director_ids: Optional[set[int]] = None) -> dict[int, float]:
    by_id = {int(w["id"]): w for w in words}
    if director_ids is None:
        director_ids = set()
        for b in beats.get("beats", []):
            director_ids.update(int(i) for i in b.get("emphasisWordIds", []) or [])
    out: dict[int, float] = {}
    for ids in section_word_groups(words, beats):
        ws = [by_id[i] for i in ids if i in by_id]
        if not ws:
            continue
        rms = [float(w.get("rms", -30.0)) for w in ws]
        dur = [float(w["endMs"] - w["startMs"]) for w in ws]
        zr, zd = zscores(rms), zscores(dur)
        for k, w in enumerate(ws):
            prev = by_id.get(int(w["id"]) - 1)
            gap_before = (w["startMs"] - prev["endMs"]) if prev else 10_000
            e = 0.45 * zr[k] + 0.25 * zd[k] + 0.15 * (1.0 if gap_before > 250 else 0.0) \
                + 0.15 * (1.0 if int(w["id"]) in director_ids else 0.0)
            out[int(w["id"])] = round(e, 4)
    return out


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--sections", help="beats.json path (default work/<id>/beats.json)")
    ap.add_argument("--transcript", help="default work/<id>/transcript.json")
    ap.add_argument("--out", help="default work/<id>/emphasis.json")
    args = ap.parse_args(argv)
    job = job_dir(args.job)
    tpath = Path(args.transcript) if args.transcript else job / "transcript.json"
    bpath = Path(args.sections) if args.sections else job / "beats.json"
    if not tpath.exists():
        log(f"missing {tpath}")
        return 2
    words = load_json(tpath)["words"]
    beats = load_json(bpath) if bpath.exists() else {"sections": [], "beats": []}
    if not bpath.exists():
        anomaly(job, "emphasis", f"{bpath} missing; z-scores computed over the whole transcript")
    if not any("rms" in w for w in words):
        anomaly(job, "emphasis", "no rms on words; z(rms) is 0 everywhere")
    emph = compute_emphasis(words, beats)
    out = Path(args.out) if args.out else job / "emphasis.json"
    dump_json(out, {str(k): v for k, v in sorted(emph.items())})
    strong = sum(1 for v in emph.values() if v >= STRONG)
    medium = sum(1 for v in emph.values() if MEDIUM <= v < STRONG)
    log(f"[emphasis] {out}: {len(emph)} words, {strong} strong (>=1.0), {medium} medium (>=0.5)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
