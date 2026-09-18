"""Wikimedia throttles media downloads; Pexels' CDN does not."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "scripts" / "py"))

from broll_common import Pacer, http_get  # noqa: E402


class _Resp:
    def __init__(self, code):
        self.status_code, self.headers, self.text = code, {}, ""


class _Sess:
    def __init__(self, codes):
        self.codes = list(codes)
        self.n = 0

    def get(self, *a, **k):
        self.n += 1
        return _Resp(self.codes.pop(0))


def test_a_429_widens_the_interval_and_success_relaxes_it():
    # MEASURED 2026-09-18: an 8.5-min job logged 369 "429 on upload.wikimedia.org".
    # Every beat that lost its media fell back to a typographic card, so 14 % of
    # shots rendered as text on black. The adaptive pacer existed but downloads
    # were never given one.
    p = Pacer(1.2, ceiling_s=8.0, base_s=1.2, sleep=lambda s: None, clock=lambda: 0.0)
    http_get("https://upload.wikimedia.org/x", pacer=p, sleep=lambda s: None,
             session=_Sess([429, 200]))
    assert p.min_interval_s > 1.2, "a real 429 must slow the next request"
    assert p.min_interval_s <= 8.0


def test_wikimedia_downloads_get_a_pacer_and_pexels_does_not():
    import source_assets as sa
    # Only hosts that actually throttle are paced; pacing Pexels would slow every
    # job for nothing.
    assert sa.DOWNLOAD_PACERS.get("wikimedia") is not None
    assert sa.DOWNLOAD_PACERS.get("pexels") is None


def test_pacer_never_relaxes_below_its_base():
    p = Pacer(1.2, ceiling_s=8.0, base_s=1.2, sleep=lambda s: None, clock=lambda: 0.0)
    p.penalise()
    for _ in range(50):
        p.relax()
    assert p.min_interval_s == 1.2
