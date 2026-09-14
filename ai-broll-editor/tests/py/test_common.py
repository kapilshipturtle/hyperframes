import json

import pytest

import broll_common as C
import emphasis as E


class FakeClock:
    def __init__(self):
        self.t = 1000.0
        self.sleeps = []

    def now(self):
        return self.t

    def sleep(self, s):
        self.sleeps.append(s)
        self.t += s


def test_pacer_enforces_floor():
    clk = FakeClock()
    p = C.Pacer(12.0, clock=clk.now, sleep=clk.sleep)
    assert p.wait() == 0.0            # first call: no wait
    clk.t += 3.0
    waited = p.wait()
    assert waited == pytest.approx(9.0)  # 12 s floor
    clk.t += 20.0
    assert p.wait() == 0.0            # enough time elapsed
    assert clk.sleeps == [pytest.approx(9.0)]


class FakeResp:
    def __init__(self, status, headers=None, body=None):
        self.status_code = status
        self.headers = headers or {}
        self._body = body if body is not None else {"ok": True}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


class FakeSession:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def get(self, url, params=None, headers=None, timeout=None, stream=False):
        self.calls.append({"url": url, "params": params, "timeout": timeout})
        return self.responses.pop(0)


def test_http_backoff_on_429_honours_reset_and_timeout():
    sess = FakeSession([FakeResp(429, {"X-Ratelimit-Reset": "30"}), FakeResp(200)])
    slept = []
    data = C.http_get_json("https://api.pexels.com/videos/search", params={"query": "x"}, session=sess,
                           sleep=slept.append, backoff_s=2.0)
    assert data == {"ok": True}
    assert len(sess.calls) == 2 and all(c["timeout"] == C.HTTP_TIMEOUT_S for c in sess.calls)
    assert slept == [30.0]  # reset header wins over 2 s backoff


def test_http_gives_up_after_retries():
    sess = FakeSession([FakeResp(500), FakeResp(503)])
    with pytest.raises(C.HttpError) as ei:
        C.http_get_json("https://x/y", session=sess, retries=1, sleep=lambda s: None)
    assert ei.value.status == 503


def test_http_4xx_raises_immediately():
    sess = FakeSession([FakeResp(404, body={"error": "nope"})])
    with pytest.raises(C.HttpError):
        C.http_get_json("https://x/y", session=sess, sleep=lambda s: None)
    assert len(sess.calls) == 1


def test_disk_cache_ttl(tmp_path):
    clk = FakeClock()
    cache = C.DiskCache(tmp_path, ttl_s=24 * 3600, clock=clk.now)
    assert cache.get("pexels", "videos|city") is None
    cache.put("pexels", "videos|city", {"videos": []})
    assert cache.get("pexels", "videos|city") == {"videos": []}
    clk.t += 24 * 3600 + 1
    assert cache.get("pexels", "videos|city") is None


def test_normalise_query():
    assert C.normalise_query("The Steel Factories, at Dusk") == C.normalise_query("dusk steel factory")
    assert C.normalise_query("City skyline") == "city skyline"


def test_redact_hides_keys(monkeypatch):
    monkeypatch.setenv("PEXELS_API_KEY", "abcdef123456")
    assert "abcdef123456" not in C.redact("Authorization: abcdef123456 and ?key=zzz")
    assert "key=<redacted>" in C.redact("https://x/?key=zzz&q=1")


def test_emphasis_formula_z_within_section():
    words = [{"id": i, "text": "w", "startMs": i * 500, "endMs": i * 500 + (400 if i == 2 else 200), "rms": (-10 if i == 2 else -30)}
             for i in range(4)]
    words[3]["startMs"], words[3]["endMs"] = 1900, 2100  # gap before word 3 = 200 (<250), duration unchanged
    beats = {"sections": [{"id": "s1", "beatIds": ["b1"], "startMs": 0, "endMs": 5000}],
             "beats": [{"id": "b1", "wordIds": [0, 1, 2, 3], "emphasisWordIds": [2]}]}
    e = E.compute_emphasis(words, beats)
    assert set(e) == {0, 1, 2, 3}
    # word 2: z(rms)=sqrt(3)=1.732, z(dur)=1.732, gap 300>250 ->1, director ->1
    assert e[2] == pytest.approx(0.45 * 1.7321 + 0.25 * 1.7321 + 0.15 + 0.15, abs=1e-3)
    assert e[2] >= 1.0 and e[1] < 0.5
    assert e[0] == pytest.approx(0.45 * -0.57735 + 0.25 * -0.57735 + 0.15, abs=1e-3)  # first word: gapBefore inf -> +0.15
