#!/usr/bin/env python3
"""Stage: Groq whisper-large-v3-turbo transcription with word timestamps (spec 5.1).

Splits the 16 kHz/32 kbps narration into 600 s chunks with 2 s overlap, sends each
chunk to Groq, merges words (earlier chunk wins in the overlap) and writes
work/<id>/asr/groq.json = {"words":[{text,startMs,endMs,conf}], "engine": ...}.

Exit codes: 0 ok; 2 bad input; 3 Groq daily cap hit (caller must fall back to whisper.cpp).
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import anomaly, dump_json, job_dir, load_job_config, log, redact  # noqa: E402

EXIT_DAILY_CAP = 3
MODEL = "whisper-large-v3-turbo"


def audio_duration_s(src: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(src)], text=True
    )
    return float(out.strip())


def make_chunks(src: Path, out_dir: Path, chunk_s: int = 600, overlap_s: int = 2) -> list[tuple[Path, float]]:
    """Return [(chunk_path, offset_s)] where offset is the chunk's absolute start."""
    dur = audio_duration_s(src)
    out_dir.mkdir(parents=True, exist_ok=True)
    t, i, chunks = 0.0, 0, []
    while t < dur:
        start = max(0.0, t - overlap_s)
        p = out_dir / f"{src.stem}.c{i:03d}.mp3"
        if not p.exists():
            subprocess.run(
                ["ffmpeg", "-y", "-ss", f"{start:.3f}", "-i", str(src), "-t", str(chunk_s + 2 * overlap_s),
                 "-ac", "1", "-ar", "16000", "-b:a", "32k", str(p)],
                check=True, capture_output=True,
            )
        chunks.append((p, start))
        t += chunk_s
        i += 1
    return chunks


def merge_words(chunks_words: list[tuple[float, list[dict]]]) -> list[dict]:
    """Merge per-chunk words with absolute offsets; in overlaps keep the earlier chunk (spec 5.1)."""
    words: list[dict] = []
    for off, ws in chunks_words:
        for w in ws:
            s = float(w["start"]) + off
            e = float(w["end"]) + off
            text = str(w.get("word", w.get("text", ""))).strip()
            if not text:
                continue
            if words and s * 1000 < words[-1]["endMs"] - 50:
                continue
            words.append({"text": text, "startMs": int(round(s * 1000)), "endMs": int(round(e * 1000)), "conf": 1.0})
    return words


def _is_daily_cap(err: Exception) -> bool:
    msg = str(err).lower()
    return "429" in msg and any(k in msg for k in ("day", "daily", "rpd", "audio-seconds-per-day", "tpd"))


def _retry_after_s(err: Exception) -> Optional[float]:
    hdrs = getattr(getattr(err, "response", None), "headers", None)
    if hdrs:
        for k in ("retry-after", "x-ratelimit-reset-requests", "x-ratelimit-reset-audio-seconds"):
            v = hdrs.get(k)
            if v:
                try:
                    return float(str(v).rstrip("s"))
                except ValueError:
                    pass
    return None


def transcribe_chunk(client: Any, path: Path, language: str, prompt: str, retries: int = 5) -> list[dict]:
    for attempt in range(retries + 1):
        try:
            with open(path, "rb") as f:
                r = client.audio.transcriptions.create(
                    file=(path.name, f.read()), model=MODEL, response_format="verbose_json",
                    timestamp_granularities=["word", "segment"], language=language, prompt=prompt or None,
                    temperature=0.0,
                )
            words = getattr(r, "words", None)
            if words is None and isinstance(r, dict):
                words = r.get("words")
            return [dict(w) if not isinstance(w, dict) else w for w in (words or [])]
        except Exception as e:  # groq raises APIStatusError subclasses; keep import-free
            status = getattr(e, "status_code", None)
            if status is None and "429" in str(e):
                status = 429
            if status == 429 and _is_daily_cap(e):
                raise SystemExit(EXIT_DAILY_CAP) from None
            if status in (429,) or (isinstance(status, int) and status >= 500) or status is None:
                if attempt >= retries:
                    raise
                wait = _retry_after_s(e) or min(120.0, 5.0 * (2 ** attempt))
                log(f"[groq] {status or 'error'} on {path.name}; retry in {wait:.0f}s ({attempt + 1}/{retries}): {redact(str(e))[:160]}")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("unreachable")


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True, help="job id -> work/<id>/")
    ap.add_argument("--audio", help="override input (default work/<id>/narration16k_32k.mp3)")
    ap.add_argument("--chunk-s", type=int, default=600)
    ap.add_argument("--overlap-s", type=int, default=2)
    args = ap.parse_args(argv)

    job = job_dir(args.job)
    cfg = load_job_config(job)
    src = Path(args.audio) if args.audio else job / "narration16k_32k.mp3"
    if not src.exists():
        log(f"input audio not found: {src} (run the ingest stage first)")
        return 2
    if not os.environ.get("GROQ_API_KEY"):
        log("GROQ_API_KEY is not set")
        return 2
    try:
        from groq import Groq  # type: ignore
    except ImportError:
        log("the 'groq' package is missing: pip install groq")
        return 2

    tconf = cfg.get("transcription", {}) or {}
    glossary = str(tconf.get("glossary") or "")
    language = str(cfg.get("language") or "en")
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    chunks = make_chunks(src, job / "asr" / "chunks", args.chunk_s, args.overlap_s)
    log(f"[groq] {len(chunks)} chunk(s) of {args.chunk_s}s (+{args.overlap_s}s overlap)")
    per_chunk: list[tuple[float, list[dict]]] = []
    for i, (p, off) in enumerate(chunks):
        t0 = time.time()
        try:
            ws = transcribe_chunk(client, p, language, glossary)
        except SystemExit as e:
            if e.code == EXIT_DAILY_CAP:
                anomaly(job, "transcribe_groq", "Groq daily cap (429) reached; caller must fall back to whisper.cpp")
                return EXIT_DAILY_CAP
            raise
        if not ws:
            anomaly(job, "transcribe_groq", f"chunk {i} returned no words", chunk=p.name)
        per_chunk.append((off, ws))
        log(f"[groq] chunk {i + 1}/{len(chunks)}: {len(ws)} words in {time.time() - t0:.1f}s")
        if i + 1 < len(chunks):
            time.sleep(3.5)  # 20 RPM headroom
    words = merge_words(per_chunk)
    if not words:
        anomaly(job, "transcribe_groq", "no words transcribed at all")
        return 1
    dump_json(job / "asr" / "groq.json", {"engine": f"groq-{MODEL}", "language": language, "words": words})
    log(f"[groq] wrote {job / 'asr' / 'groq.json'} ({len(words)} words)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
