"""Shared helpers for the ai-broll-editor Python stages.

Paths, job resolution, paced/cached HTTP with hard timeouts, ffprobe helpers,
anomaly logging and query normalisation. Stdlib + requests only; anything heavy
is imported lazily inside the stage that needs it.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Optional

PKG_ROOT = Path(__file__).resolve().parents[2]
HTTP_TIMEOUT_S = 8.0
PEXELS_FLOOR_S = 12.0       # ceiling after a real 429 (measured safe)
PEXELS_BASE_S = 2.0         # starting interval; adaptive pacer relaxes back to this after successes
CACHE_TTL_S = 24 * 3600
FPS = 30

SECRET_ENV_NAMES = ("PEXELS_API_KEY", "GROQ_API_KEY", "YOUTUBE_API_KEY", "OPENVERSE_CLIENT_SECRET")


# ----------------------------------------------------------------------------
# paths / job
# ----------------------------------------------------------------------------
def job_dir(job_id: str) -> Path:
    """work/<id>/ relative to the package root (absolute paths pass through)."""
    p = Path(job_id)
    if p.is_absolute() or job_id.startswith("work/"):
        return p.resolve() if p.is_absolute() else (PKG_ROOT / p).resolve()
    return (PKG_ROOT / "work" / job_id).resolve()


def cache_dir() -> Path:
    d = os.environ.get("BROLL_CACHE_DIR") or str(Path.home() / ".cache" / "ai-broll-editor")
    p = Path(d)
    p.mkdir(parents=True, exist_ok=True)
    return p


def load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def dump_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)


def load_yaml(path: Path) -> dict:
    try:
        import yaml  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise SystemExit("PyYAML is required to read job.yaml: pip install pyyaml") from e
    with open(path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    if not isinstance(data, dict):
        raise SystemExit(f"{path}: expected a mapping at the top level")
    return data


def load_job_config(job: Path) -> dict:
    p = job / "job.yaml"
    if not p.exists():
        raise SystemExit(f"missing {p}; copy templates/job.yaml there first")
    return load_yaml(p)


# ----------------------------------------------------------------------------
# logging (never print secrets)
# ----------------------------------------------------------------------------
def redact(text: str) -> str:
    for name in SECRET_ENV_NAMES:
        v = os.environ.get(name)
        if v and len(v) >= 6:
            text = text.replace(v, f"<{name}>")
    text = re.sub(r"([?&](?:key|api_key|client_id)=)[^&\s]+", r"\1<redacted>", text)
    return text


def log(msg: str, *, stream=None) -> None:
    (stream or sys.stderr).write(redact(msg).rstrip("\n") + "\n")
    (stream or sys.stderr).flush()


def anomaly(job: Optional[Path], stage: str, msg: str, **extra: Any) -> None:
    """Loud record of anything skipped or degraded. Never silent."""
    line = {"ts": int(time.time()), "stage": stage, "msg": redact(msg), **extra}
    log(f"[anomaly:{stage}] {msg}")
    if job is not None:
        try:
            job.mkdir(parents=True, exist_ok=True)
            with open(job / "anomalies.log.jsonl", "a", encoding="utf-8") as f:
                f.write(json.dumps(line, ensure_ascii=False) + "\n")
        except OSError as e:  # pragma: no cover
            log(f"[anomaly:{stage}] could not write anomalies log: {e}")


def append_jsonl(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ----------------------------------------------------------------------------
# query normalisation (spec 7 consolidation, cache keys)
# ----------------------------------------------------------------------------
_STOP = {"a", "an", "the", "of", "in", "on", "at", "and", "with", "to", "for", "from", "by"}


def normalise_query(q: str) -> str:
    q = q.lower()
    q = re.sub(r"[^a-z0-9\s]", " ", q)
    toks = [t for t in q.split() if t and t not in _STOP]
    # crude singularisation so "factories" and "factory" cluster
    out = []
    for t in toks:
        if len(t) > 4 and t.endswith("ies"):
            t = t[:-3] + "y"
        elif len(t) > 3 and t.endswith("s") and not t.endswith("ss"):
            t = t[:-1]
        out.append(t)
    return " ".join(sorted(set(out)))


def sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()


def file_sha1(path: Path, chunk: int = 1 << 20) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


# ----------------------------------------------------------------------------
# pacing + cache + HTTP
# ----------------------------------------------------------------------------
@dataclass
class Pacer:
    """Enforces a minimum interval between calls; clock/sleep injectable for tests."""

    min_interval_s: float
    clock: Callable[[], float] = time.monotonic
    sleep: Callable[[float], None] = time.sleep
    _last: Optional[float] = field(default=None, init=False)

    def wait(self) -> float:
        now = self.clock()
        waited = 0.0
        if self._last is not None:
            due = self._last + self.min_interval_s
            if now < due:
                waited = due - now
                self.sleep(waited)
        self._last = self.clock()
        return waited

    def mark(self) -> None:
        self._last = self.clock()

    # Adaptive pacing: start fast, jump to the measured-safe ceiling on a real 429, relax after successes.
    ceiling_s: float = field(default=0.0)      # 0 = fixed interval (legacy behaviour)
    base_s: float = field(default=0.0)
    def penalise(self) -> None:
        if self.ceiling_s > 0:
            self.min_interval_s = self.ceiling_s
    def relax(self) -> None:
        if self.ceiling_s > 0 and self.min_interval_s > self.base_s:
            self.min_interval_s = max(self.base_s, self.min_interval_s - 1.0)


@dataclass
class DiskCache:
    root: Path
    ttl_s: float = CACHE_TTL_S
    clock: Callable[[], float] = time.time

    def _path(self, ns: str, key: str) -> Path:
        d = self.root / ns
        d.mkdir(parents=True, exist_ok=True)
        return d / (sha1(key) + ".json")

    def get(self, ns: str, key: str) -> Optional[Any]:
        p = self._path(ns, key)
        if not p.exists():
            return None
        try:
            with open(p, "r", encoding="utf-8") as f:
                rec = json.load(f)
        except (OSError, json.JSONDecodeError):
            return None
        if self.clock() - float(rec.get("ts", 0)) > self.ttl_s:
            return None
        return rec.get("data")

    def put(self, ns: str, key: str, data: Any) -> None:
        p = self._path(ns, key)
        with open(p, "w", encoding="utf-8") as f:
            json.dump({"ts": self.clock(), "key": key, "data": data}, f)


class HttpError(RuntimeError):
    def __init__(self, status: int, msg: str, headers: Optional[dict] = None):
        super().__init__(msg)
        self.status = status
        self.headers = headers or {}


def _requests():
    try:
        import requests  # type: ignore
    except ImportError as e:  # pragma: no cover
        raise SystemExit("the 'requests' package is required: pip install requests") from e
    return requests


def http_get(
    url: str,
    *,
    params: Optional[dict] = None,
    headers: Optional[dict] = None,
    timeout: float = HTTP_TIMEOUT_S,
    pacer: Optional[Pacer] = None,
    retries: int = 4,
    backoff_s: float = 2.0,
    sleep: Callable[[float], None] = time.sleep,
    session: Any = None,
    stream: bool = False,
):
    """GET with hard timeout, 429/5xx exponential backoff honouring X-Ratelimit-Reset / Retry-After."""
    requests = _requests()
    sess = session or requests
    last_err: Optional[Exception] = None
    for attempt in range(retries + 1):
        if pacer is not None:
            pacer.wait()
        try:
            r = sess.get(url, params=params, headers=headers, timeout=timeout, stream=stream)
        except requests.RequestException as e:  # network/timeout
            last_err = e
            if attempt >= retries:
                break
            sleep(backoff_s * (2 ** attempt))
            continue
        if r.status_code == 429 or 500 <= r.status_code < 600:
            last_err = HttpError(r.status_code, f"HTTP {r.status_code} from {redact(url)}", dict(r.headers))
            if attempt >= retries:
                break
            wait = backoff_s * (2 ** attempt)
            reset = r.headers.get("X-Ratelimit-Reset") or r.headers.get("Retry-After")
            if reset:
                try:
                    rv = float(reset)
                    # header is either seconds-until-reset or an epoch; treat big values as epoch
                    if rv > 1e9:
                        rv = max(0.0, rv - time.time())
                    wait = max(wait, min(rv, 900.0))
                except ValueError:
                    pass
            if r.status_code == 429 and pacer is not None:
                pacer.penalise()
            log(f"[http] {r.status_code} on {redact(url)}; retrying in {wait:.0f}s (attempt {attempt + 1}/{retries})")
            sleep(wait)
            continue
        if r.status_code >= 400:
            raise HttpError(r.status_code, f"HTTP {r.status_code} from {redact(url)}: {r.text[:200]}", dict(r.headers))
        if pacer is not None:
            pacer.relax()
        return r
    assert last_err is not None
    raise last_err


def http_get_json(url: str, **kw) -> Any:
    r = http_get(url, **kw)
    try:
        return r.json()
    except ValueError as e:
        raise HttpError(r.status_code, f"non-JSON response from {redact(url)}: {r.text[:120]}") from e


def download(url: str, dest: Path, *, headers: Optional[dict] = None, timeout: float = HTTP_TIMEOUT_S,
             max_bytes: int = 600 * 1024 * 1024, pacer: Optional[Pacer] = None) -> Path:
    """Stream a file to dest (skip if it already exists and is non-empty)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    r = http_get(url, headers=headers, timeout=timeout, stream=True, pacer=pacer)
    tmp = dest.with_suffix(dest.suffix + ".part")
    n = 0
    with open(tmp, "wb") as f:
        for chunk in r.iter_content(chunk_size=1 << 16):
            if not chunk:
                continue
            n += len(chunk)
            if n > max_bytes:
                f.close()
                tmp.unlink(missing_ok=True)
                raise RuntimeError(f"download exceeded {max_bytes} bytes: {redact(url)}")
            f.write(chunk)
    if n == 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"empty download: {redact(url)}")
    os.replace(tmp, dest)
    return dest


# ----------------------------------------------------------------------------
# ffmpeg / ffprobe
# ----------------------------------------------------------------------------
def run(cmd: list[str], *, check: bool = True, timeout: Optional[float] = None) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, check=check, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError as e:
        raise SystemExit(f"required binary not found: {cmd[0]}") from e
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"{cmd[0]} failed ({e.returncode}): {redact((e.stderr or '')[-800:])}") from e


def ffprobe_json(path: Path) -> dict:
    p = run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)])
    return json.loads(p.stdout or "{}")


def media_info(path: Path) -> dict:
    """{width,height,fps,durationMs,hasVideo,hasAudio,codec}"""
    info = ffprobe_json(path)
    v = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in info.get("streams", []) if s.get("codec_type") == "audio"), None)
    dur = float(info.get("format", {}).get("duration") or 0.0)
    fps = None
    if v:
        rate = v.get("avg_frame_rate") or v.get("r_frame_rate") or "0/1"
        try:
            num, den = rate.split("/")
            fps = float(num) / float(den) if float(den) else None
        except (ValueError, ZeroDivisionError):
            fps = None
        if v.get("duration") and not dur:
            dur = float(v["duration"])
    return {
        "width": int(v.get("width", 0)) if v else 0,
        "height": int(v.get("height", 0)) if v else 0,
        "fps": round(fps, 3) if fps else None,
        "durationMs": int(round(dur * 1000)),
        "hasVideo": v is not None,
        "hasAudio": a is not None,
        "codec": v.get("codec_name") if v else None,
        "isImage": bool(v) and (v.get("codec_name") in {"mjpeg", "png", "webp", "gif", "bmp", "tiff"} or dur == 0),
    }


def ms_to_frame(ms: float) -> int:
    return int(round(ms / 1000.0 * FPS))


def frame_to_ms(f: int) -> int:
    return int(round(f / FPS * 1000.0))


def env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def chunked(it: Iterable, n: int) -> Iterable[list]:
    buf: list = []
    for x in it:
        buf.append(x)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf
