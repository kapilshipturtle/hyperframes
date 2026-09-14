#!/usr/bin/env python3
"""Stage: WhisperX forced alignment on CPU (spec 5.1).

Reads work/<id>/asr/groq.json, groups words into <=15-word / sentence segments,
aligns against work/<id>/narration16k.wav with wav2vec2 and writes
work/<id>/asr/aligned.json = {"words":[{text,startMs|null,endMs|null,conf}]}.
`--skip` copies groq.json through unchanged (engine noted) so the pipeline can run without torch.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))
from broll_common import anomaly, dump_json, job_dir, load_job_config, load_json, log  # noqa: E402


def group_segments(raw: list[dict], max_words: int = 15) -> list[dict]:
    segs, buf = [], []
    for w in raw:
        buf.append(w)
        if len(buf) >= max_words or str(w["text"]).endswith((".", "?", "!")):
            segs.append(_seg(buf))
            buf = []
    if buf:
        segs.append(_seg(buf))
    return segs


def _seg(buf: list[dict]) -> dict:
    return {"start": buf[0]["startMs"] / 1000.0, "end": buf[-1]["endMs"] / 1000.0,
            "text": " ".join(str(x["text"]) for x in buf)}


def flatten_aligned(aligned: dict) -> list[dict]:
    out = []
    for s in aligned.get("segments", []):
        for w in s.get("words", []):
            timed = "start" in w and "end" in w and w["start"] is not None
            out.append({
                "text": str(w.get("word", "")).strip(),
                "startMs": int(round(w["start"] * 1000)) if timed else None,
                "endMs": int(round(w["end"] * 1000)) if timed else None,
                "conf": float(w.get("score", 0.9)) if timed else 0.3,
            })
    return [w for w in out if w["text"]]


def main(argv: Optional[list[str]] = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--job", required=True)
    ap.add_argument("--skip", action="store_true", help="copy groq.json through without aligning")
    ap.add_argument("--audio", help="override wav (default work/<id>/narration16k.wav)")
    args = ap.parse_args(argv)

    job = job_dir(args.job)
    src = job / "asr" / "groq.json"
    if not src.exists():
        log(f"missing {src}; run transcribe_groq.py first")
        return 2
    raw = load_json(src)
    out_path = job / "asr" / "aligned.json"
    cfg = load_job_config(job) if (job / "job.yaml").exists() else {}
    language = str(cfg.get("language") or raw.get("language") or "en")

    if args.skip or (cfg.get("transcription", {}) or {}).get("align") is False:
        dump_json(out_path, {"engine": raw.get("engine", "groq") + "+noalign", "language": language, "words": raw["words"]})
        log(f"[align] --skip: copied {len(raw['words'])} words through to {out_path}")
        return 0

    wav = Path(args.audio) if args.audio else job / "narration16k.wav"
    if not wav.exists():
        log(f"missing {wav}; run the ingest stage first (or pass --skip)")
        return 2
    try:
        import whisperx  # type: ignore
    except ImportError:
        log("whisperx is not installed (pip install -r scripts/py/requirements.txt) - or run with --skip")
        return 2

    audio = whisperx.load_audio(str(wav))
    segs = group_segments(raw["words"])
    log(f"[align] {len(segs)} segments, loading wav2vec2 align model for '{language}' on cpu")
    model_a, meta = whisperx.load_align_model(language_code=language, device="cpu")
    aligned = whisperx.align(segs, model_a, meta, audio, "cpu", return_char_alignments=False)
    words = flatten_aligned(aligned)
    untimed = sum(1 for w in words if w["startMs"] is None)
    if untimed:
        anomaly(job, "align_whisperx", f"{untimed}/{len(words)} words left untimed by aligner (interpolated downstream)")
    if len(words) < 0.8 * len(raw["words"]):
        anomaly(job, "align_whisperx", f"aligner returned {len(words)} words vs {len(raw['words'])} input")
    dump_json(out_path, {"engine": raw.get("engine", "groq") + "+whisperx-align", "language": language, "words": words})
    log(f"[align] wrote {out_path} ({len(words)} words)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
