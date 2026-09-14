#!/usr/bin/env python3
"""Stage: ASR output -> work/<id>/transcript.json (spec 5.4, contract 10.1 / types.ts Transcript).

Input (auto-detected, or --input):
  * work/<id>/asr/aligned.json  {"words":[{text,startMs|null,endMs|null,conf}]}
  * work/<id>/asr/groq.json     same shape
  * whisper.cpp captions JSON from @remotion/install-whisper-cpp toCaptions:
    {"captions":[{text,startMs,endMs,timestampMs,confidence}]} (or a bare list)
Also reads (all optional, anomalies logged when missing):
  work/<id>/rms50ms.txt (ffmpeg ametadata), silences.txt (silencedetect), duration_s.txt,
  corrections.json (or job.yaml transcription.corrections).
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import anomaly, dump_json, job_dir, load_json, load_yaml, log  # noqa: E402

GAP_SPLIT_MS = 350
INTERP_CONF = 0.3
_PUNCT_RE = re.compile(r"^(\W*)(.*?)(\W*)$", re.S)


# ----------------------------------------------------------------------------
# input shapes
# ----------------------------------------------------------------------------
def load_words_any(data) -> tuple[list[dict], str]:
    """Return ([{text,startMs,endMs,conf}], engine). Accepts asr JSON or whisper.cpp captions."""
    engine = "unknown"
    if isinstance(data, dict) and "words" in data:
        engine = str(data.get("engine") or "groq")
        raw = data["words"]
        out = []
        for w in raw:
            out.append({"text": str(w.get("text", w.get("word", ""))).strip(),
                        "startMs": w.get("startMs"), "endMs": w.get("endMs"),
                        "conf": float(w.get("conf", 1.0)) if w.get("conf") is not None else 1.0})
        return [w for w in out if w["text"]], engine
    caps = data.get("captions") if isinstance(data, dict) else data
    if isinstance(caps, list):
        engine = "whispercpp"
        out = []
        for c in caps:
            text = str(c.get("text", "")).strip()
            if not text:
                continue
            conf = c.get("confidence")
            out.append({"text": text, "startMs": c.get("startMs"), "endMs": c.get("endMs"),
                        "conf": float(conf) if conf is not None else 1.0})
        return out, engine
    raise SystemExit("unrecognised ASR JSON shape (expected {words:[...]} or whisper.cpp {captions:[...]})")


# ----------------------------------------------------------------------------
# timing repair
# ----------------------------------------------------------------------------
def interpolate_untimed(words: list[dict]) -> int:
    """Fill startMs/endMs for runs of untimed tokens between timed neighbours; conf 0.3. Returns count."""
    n = len(words)
    filled = 0
    i = 0
    while i < n:
        if words[i]["startMs"] is not None and words[i]["endMs"] is not None:
            i += 1
            continue
        j = i
        while j < n and (words[j]["startMs"] is None or words[j]["endMs"] is None):
            j += 1
        left_end = words[i - 1]["endMs"] if i > 0 else None
        right_start = words[j]["startMs"] if j < n else None
        if left_end is None and right_start is None:
            # nothing is timed at all: lay out at 300 ms per token from 0
            left_end, right_start = 0, 300 * (j - i)
        elif left_end is None:
            left_end = max(0, right_start - 300 * (j - i))
        elif right_start is None:
            right_start = left_end + 300 * (j - i)
        span = max(right_start - left_end, 40 * (j - i))
        weights = [max(1, len(words[k]["text"])) for k in range(i, j)]
        total = float(sum(weights))
        t = float(left_end)
        for k, wgt in zip(range(i, j), weights):
            d = span * wgt / total
            words[k]["startMs"] = int(round(t))
            words[k]["endMs"] = int(round(t + d))
            words[k]["conf"] = INTERP_CONF
            t += d
            filled += 1
        i = j
    return filled


def enforce_monotonic(words: list[dict]) -> int:
    """startMs = max(startMs, prev.endMs); endMs >= startMs + 1. Returns number of adjusted words."""
    fixes = 0
    prev_end = 0
    for w in words:
        s, e = int(w["startMs"]), int(w["endMs"])
        if s < prev_end:
            s = prev_end
            fixes += 1
        if e <= s:
            e = s + 1
            fixes += 1
        w["startMs"], w["endMs"] = s, e
        prev_end = e
    return fixes


# ----------------------------------------------------------------------------
# corrections
# ----------------------------------------------------------------------------
def apply_corrections(words: list[dict], corrections: dict[str, str]) -> int:
    """Whole-token, case-insensitive replacement preserving surrounding punctuation and initial capital."""
    if not corrections:
        return 0
    table = {k.strip().lower(): v for k, v in corrections.items() if k.strip()}
    n = 0
    for w in words:
        m = _PUNCT_RE.match(w["text"])
        lead, core, trail = m.group(1), m.group(2), m.group(3)
        rep = table.get(core.lower())
        if rep is None:
            continue
        if core[:1].isupper() and rep[:1].islower():
            rep = rep[:1].upper() + rep[1:]
        w["text"] = f"{lead}{rep}{trail}"
        n += 1
    return n


# ----------------------------------------------------------------------------
# ffmpeg side files
# ----------------------------------------------------------------------------
_PTS_RE = re.compile(r"pts_time:\s*([0-9.]+)")
_RMS_RE = re.compile(r"lavfi\.astats\.Overall\.RMS_level=\s*(-?[0-9.]+|-inf|inf|nan)", re.I)


def parse_rms(text: str) -> list[tuple[float, float]]:
    """ametadata print output -> [(pts_time_s, rms_dB)]. -inf clamps to -90."""
    out: list[tuple[float, float]] = []
    t: Optional[float] = None
    for line in text.splitlines():
        m = _PTS_RE.search(line)
        if m and line.lstrip().startswith("frame:"):
            t = float(m.group(1))
            continue
        m = _RMS_RE.search(line)
        if m and t is not None:
            v = m.group(1).lower()
            val = -90.0 if v in ("-inf", "nan") else (0.0 if v == "inf" else float(v))
            out.append((t, max(-90.0, val)))
            t = None
    return out


def attach_rms(words: list[dict], bins: list[tuple[float, float]], bin_ms: float = 50.0) -> None:
    """Mean dB of 50 ms bins whose centre lies inside the word (nearest bin if none)."""
    if not bins:
        return
    import bisect

    starts = [b[0] * 1000.0 for b in bins]
    for w in words:
        lo = bisect.bisect_left(starts, w["startMs"] - bin_ms / 2)
        hi = bisect.bisect_right(starts, w["endMs"] - bin_ms / 2)
        vals = [bins[k][1] for k in range(lo, hi) if w["startMs"] <= starts[k] + bin_ms / 2 <= w["endMs"]]
        if not vals:
            k = min(max(0, bisect.bisect_left(starts, (w["startMs"] + w["endMs"]) / 2) - 1), len(bins) - 1)
            vals = [bins[k][1]]
        w["rms"] = round(sum(vals) / len(vals), 2)


_SIL_START = re.compile(r"silence_start:\s*(-?[0-9.]+)")
_SIL_END = re.compile(r"silence_end:\s*(-?[0-9.]+)")


def parse_silences(text: str) -> list[dict]:
    out = []
    cur: Optional[float] = None
    for line in text.splitlines():
        m = _SIL_START.search(line)
        if m:
            cur = float(m.group(1))
            continue
        m = _SIL_END.search(line)
        if m and cur is not None:
            out.append({"startMs": int(round(max(0.0, cur) * 1000)), "endMs": int(round(float(m.group(1)) * 1000))})
            cur = None
    return out


def silences_from_gaps(words: list[dict], min_ms: int = 400) -> list[dict]:
    out = []
    for a, b in zip(words, words[1:]):
        if b["startMs"] - a["endMs"] >= min_ms:
            out.append({"startMs": a["endMs"], "endMs": b["startMs"]})
    return out


# ----------------------------------------------------------------------------
# segments
# ----------------------------------------------------------------------------
def build_segments(words: list[dict]) -> list[dict]:
    segs: list[dict] = []
    buf: list[dict] = []

    def flush():
        if buf:
            segs.append({"id": len(segs), "text": " ".join(w["text"] for w in buf),
                         "startMs": buf[0]["startMs"], "endMs": buf[-1]["endMs"], "wordIds": [w["id"] for w in buf]})

    for i, w in enumerate(words):
        buf.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        if re.search(r"[.?!][\"'”’)]*$", w["text"]) or (nxt and nxt["startMs"] - w["endMs"] > GAP_SPLIT_MS):
            flush()
            buf = []
    flush()
    return segs


# ----------------------------------------------------------------------------
def build_transcript(raw_words: list[dict], *, engine: str, language: str, audio_path: str,
                     duration_ms: Optional[int], corrections: dict[str, str], rms_bins: list[tuple[float, float]],
                     silences: Optional[list[dict]], stats: Optional[dict] = None) -> dict:
    words = [dict(w) for w in raw_words]
    st = stats if stats is not None else {}
    st["interpolated"] = interpolate_untimed(words)
    st["monotonic_fixes"] = enforce_monotonic(words)
    st["corrections"] = apply_corrections(words, corrections)
    for i, w in enumerate(words):
        w["id"] = i
        w["conf"] = round(float(w.get("conf", 1.0)), 3)
    attach_rms(words, rms_bins)
    for i, w in enumerate(words):
        if i + 1 < len(words):
            w["gapAfterMs"] = max(0, words[i + 1]["startMs"] - w["endMs"])
    last_end = words[-1]["endMs"] if words else 0
    if duration_ms is None or duration_ms < last_end:
        duration_ms = last_end
    if words:
        words[-1]["gapAfterMs"] = max(0, duration_ms - last_end)
    ordered = [{k: w[k] for k in ("id", "text", "startMs", "endMs", "conf", "rms", "gapAfterMs") if k in w}
               for w in words]
    return {
        "audioPath": audio_path,
        "durationMs": int(duration_ms),
        "language": language,
        "engine": engine,
        "words": ordered,
        "segments": build_segments(ordered),
        "silences": silences if silences is not None else silences_from_gaps(ordered),
    }


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--input", help="ASR JSON (default: asr/aligned.json, else asr/groq.json, else asr/whispercpp.json)")
    ap.add_argument("--audio-path", default="narration_norm.m4a", help="value written to transcript.audioPath")
    ap.add_argument("--engine", help="override engine label")
    ap.add_argument("--out", help="default work/<id>/transcript.json")
    args = ap.parse_args(argv)

    job = job_dir(args.job)
    if args.input:
        src = Path(args.input)
    else:
        src = next((p for p in (job / "asr" / "aligned.json", job / "asr" / "groq.json",
                                job / "asr" / "whispercpp.json", job / "asr" / "captions.json") if p.exists()), None)
        if src is None:
            log(f"no ASR JSON found under {job / 'asr'}")
            return 2
    raw_words, engine = load_words_any(load_json(src))
    if not raw_words:
        log(f"{src}: no words")
        return 2
    engine = args.engine or engine

    cfg = load_yaml(job / "job.yaml") if (job / "job.yaml").exists() else {}
    language = str(cfg.get("language") or "en")
    corrections: dict[str, str] = dict((cfg.get("transcription") or {}).get("corrections") or {})
    cpath = job / "corrections.json"
    if cpath.exists():
        corrections.update({str(k): str(v) for k, v in load_json(cpath).items()})

    duration_ms: Optional[int] = None
    dpath = job / "duration_s.txt"
    if dpath.exists():
        try:
            duration_ms = int(round(float(dpath.read_text().strip().splitlines()[0]) * 1000))
        except (ValueError, IndexError):
            anomaly(job, "to_transcript_json", f"could not parse {dpath}")
    else:
        anomaly(job, "to_transcript_json", "duration_s.txt missing; durationMs falls back to the last word end")

    rms_bins: list[tuple[float, float]] = []
    rpath = job / "rms50ms.txt"
    if rpath.exists():
        rms_bins = parse_rms(rpath.read_text(errors="replace"))
        if not rms_bins:
            anomaly(job, "to_transcript_json", "rms50ms.txt parsed to zero bins")
    else:
        anomaly(job, "to_transcript_json", "rms50ms.txt missing; words carry no rms (emphasis degrades to duration only)")

    silences: Optional[list[dict]] = None
    spath = job / "silences.txt"
    if spath.exists():
        silences = parse_silences(spath.read_text(errors="replace"))
    else:
        anomaly(job, "to_transcript_json", "silences.txt missing; silences derived from word gaps >= 400 ms")

    stats: dict = {}
    tr = build_transcript(raw_words, engine=engine, language=language, audio_path=args.audio_path,
                          duration_ms=duration_ms, corrections=corrections, rms_bins=rms_bins, silences=silences,
                          stats=stats)
    if stats["interpolated"]:
        anomaly(job, "to_transcript_json", f"{stats['interpolated']} untimed tokens interpolated (conf 0.3)")
    out = Path(args.out) if args.out else job / "transcript.json"
    dump_json(out, tr)
    log(f"[transcript] {out}: {len(tr['words'])} words, {len(tr['segments'])} segments, {len(tr['silences'])} silences, "
        f"durationMs={tr['durationMs']}, monotonic fixes={stats['monotonic_fixes']}, corrections={stats['corrections']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
