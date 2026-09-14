import to_transcript_json as T


def w(text, s, e, conf=0.95):
    return {"text": text, "startMs": s, "endMs": e, "conf": conf}


def test_monotonic_non_overlapping():
    words = [w("a", 100, 400), w("b", 350, 600), w("c", 600, 590), w("d", 900, 1000)]
    fixes = T.enforce_monotonic(words)
    assert fixes >= 2
    for prev, cur in zip(words, words[1:]):
        assert cur["startMs"] >= prev["endMs"]
    assert all(x["endMs"] > x["startMs"] for x in words)
    assert words[1]["startMs"] == 400


def test_interpolation_between_neighbours():
    words = [w("hello", 0, 300), {"text": "big", "startMs": None, "endMs": None, "conf": 1.0},
             {"text": "wonderful", "startMs": None, "endMs": None, "conf": 1.0}, w("world", 1200, 1500)]
    n = T.interpolate_untimed(words)
    assert n == 2
    assert words[1]["startMs"] == 300 and words[2]["endMs"] == 1200
    assert words[1]["endMs"] == words[2]["startMs"]
    assert words[1]["conf"] == 0.3 and words[2]["conf"] == 0.3
    # longer token gets more time
    assert (words[2]["endMs"] - words[2]["startMs"]) > (words[1]["endMs"] - words[1]["startMs"])


def test_interpolation_at_edges():
    words = [{"text": "um", "startMs": None, "endMs": None, "conf": 1}, w("ok", 600, 900),
             {"text": "bye.", "startMs": None, "endMs": None, "conf": 1}]
    T.interpolate_untimed(words)
    assert words[0]["startMs"] >= 0 and words[0]["endMs"] <= 600
    assert words[2]["startMs"] == 900


def test_corrections_preserve_punctuation_and_case():
    words = [w("groc,", 0, 1), w("Groc", 1, 2), w("other", 2, 3)]
    n = T.apply_corrections(words, {"groc": "Groq"})
    assert n == 2
    assert words[0]["text"] == "Groq," and words[1]["text"] == "Groq" and words[2]["text"] == "other"


def test_rms_parsing_and_attach():
    text = """frame:0    pts:0       pts_time:0
lavfi.astats.Overall.RMS_level=-30.5
frame:1    pts:2400    pts_time:0.05
lavfi.astats.Overall.RMS_level=-20.5
frame:2    pts:4800    pts_time:0.1
lavfi.astats.Overall.RMS_level=-inf
frame:3    pts:7200    pts_time:0.15
lavfi.astats.Overall.RMS_level=-10
"""
    bins = T.parse_rms(text)
    assert bins == [(0.0, -30.5), (0.05, -20.5), (0.1, -90.0), (0.15, -10.0)]
    words = [w("a", 0, 100), w("b", 150, 200), w("c", 5000, 5100)]
    T.attach_rms(words, bins)
    # bins centred at 25 and 75 ms fall inside word a
    assert words[0]["rms"] == -25.5
    assert words[1]["rms"] == -10.0
    assert "rms" in words[2]  # nearest-bin fallback


def test_silences_parse():
    txt = "[silencedetect @ 0x1] silence_start: 4.38\n[silencedetect @ 0x1] silence_end: 5.01 | silence_duration: 0.63\n"
    assert T.parse_silences(txt) == [{"startMs": 4380, "endMs": 5010}]


def test_build_transcript_shape_segments_and_gaps():
    raw = [w("Today", 120, 410), w("we", 430, 600), w("build.", 620, 1000), w("Next", 1500, 1800),
           {"text": "thing", "startMs": None, "endMs": None, "conf": 1.0}, w("done", 2400, 2700)]
    tr = T.build_transcript(raw, engine="test", language="en", audio_path="narration_norm.m4a", duration_ms=3000,
                            corrections={}, rms_bins=[], silences=None)
    assert set(tr) == {"audioPath", "durationMs", "language", "engine", "words", "segments", "silences"}
    assert [x["id"] for x in tr["words"]] == list(range(6))
    assert tr["words"][0]["gapAfterMs"] == 20
    assert tr["words"][-1]["gapAfterMs"] == 300
    # sentence on punctuation, gap split (>350 ms) between 'build.' and 'Next' already, and 'thing'->'done' gap
    assert tr["segments"][0]["wordIds"] == [0, 1, 2]
    assert tr["segments"][0]["text"] == "Today we build."
    assert tr["durationMs"] == 3000
    assert tr["silences"] == [{"startMs": 1000, "endMs": 1500}, {"startMs": 2000, "endMs": 2400}] or tr["silences"][0]["startMs"] == 1000


def test_load_words_whispercpp_shape():
    words, engine = T.load_words_any({"captions": [{"text": " Hi", "startMs": 0, "endMs": 200, "timestampMs": 100, "confidence": 0.8},
                                                    {"text": "", "startMs": 200, "endMs": 300}]})
    assert engine == "whispercpp" and words == [{"text": "Hi", "startMs": 0, "endMs": 200, "conf": 0.8}]
