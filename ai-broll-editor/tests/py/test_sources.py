import archive_org
import source_assets as S
import youtube_cc
from broll_common import normalise_query


def test_pexels_video_pick_1920_rendition(fixture):
    cands = S.parse_pexels_videos(fixture("pexels_videos.json"))
    assert len(cands) == 2
    c = cands[0]
    assert c.download_url.endswith("hd1080.mp4") and c.width == 1920 and c.height == 1080
    assert c.attribution == "Video by Jane Doe on Pexels" and c.license == "Pexels License"
    assert c.duration_ms == 14000 and c.kind == "video" and c.asset_id == "pexels_v_881234" and c.tier == "stock"
    # second video has no 1920 rendition: largest <= 1920 mp4 (the hls entry has no width)
    assert cands[1].download_url.endswith("b720.mp4") and cands[1].width == 1280


def test_pexels_photos(fixture):
    cands = S.parse_pexels_photos(fixture("pexels_photos.json"))
    assert len(cands) == 1
    c = cands[0]
    assert c.kind == "image" and "large2x" in c.download_url or "dpr=2" in c.download_url
    assert c.attribution == "Photo by Joey Farina on Pexels"
    assert c.width == 1880 and c.height == 1253
    assert c.asset_id == "pexels_p_2014422"


def test_openverse_filters_nc_and_uses_attribution(fixture):
    cands = S.parse_openverse(fixture("openverse.json"))
    ids = [c.cid for c in cands]
    assert ids == ["a1", "a3"]
    assert cands[0].attribution.startswith('"Eiffel Tower 1900" by Someone')
    assert cands[0].license == "CC BY 2.0" and cands[1].license == "CC0" and cands[1].ext == "png"


def test_wikimedia_license_filter_and_attribution(fixture):
    imgs = S.parse_wikimedia(fixture("wikimedia.json"), want_video=False)
    vids = S.parse_wikimedia(fixture("wikimedia.json"), want_video=True)
    assert [c.cid for c in imgs] == ["101", "104"]
    assert imgs[0].download_url.endswith("1920px-Eiffel.jpg") and imgs[0].width == 1920
    assert imgs[0].attribution == "Foo Bar, CC BY-SA 4.0, via Wikimedia Commons"
    assert [c.cid for c in vids] == ["103"] and vids[0].kind == "video" and vids[0].duration_ms == 42500
    assert S.wikimedia_license_ok("CC BY 4.0") and S.wikimedia_license_ok("Public domain") and S.wikimedia_license_ok("CC0")
    assert not S.wikimedia_license_ok("CC BY-NC-SA 3.0") and not S.wikimedia_license_ok("CC BY-ND 2.0")
    assert not S.wikimedia_license_ok("Copyrighted free use")


def test_nasa_search_and_manifest(fixture):
    items = S.parse_nasa_search(fixture("nasa_search.json"))
    assert [i["nasa_id"] for i in items] == ["PIA12345", "KSC-1"]
    url = S.pick_nasa_file(fixture("nasa_manifest.json"), "image")
    assert url.endswith("~large.jpg")
    c = S.nasa_candidate(items[0], url)
    assert c.attribution == "NASA" and c.kind == "image" and c.license.startswith("Public Domain")
    assert S.pick_nasa_file(["a~orig.mp4", "a~medium.mp4"], "video").endswith("~medium.mp4")


def test_archive_search_filters_licences(fixture):
    items = archive_org.parse_search(fixture("archive_search.json"))
    assert [i["identifier"] for i in items] == ["SteelAnd1957"]
    assert archive_org.attribution(items[0]) == "Steel and America (Internet Archive, http://creativecommons.org/publicdomain/mark/1.0/)"
    assert archive_org.parse_runtime("27:33") == 1653.0
    assert archive_org.license_label(items[0]["licenseurl"]) == "Public Domain"
    assert archive_org.license_ok("https://creativecommons.org/licenses/by-sa/4.0/")
    assert not archive_org.license_ok("https://creativecommons.org/licenses/by-nc/4.0/")


def test_archive_derivative_and_djvu_window(fixture):
    meta = fixture("archive_meta.json")
    der = archive_org.pick_derivative(meta)
    assert der["name"] == "SteelAnd1957.mp4" and der["height"] == 480
    assert der["url"] == "https://archive.org/download/SteelAnd1957/SteelAnd1957.mp4"
    text = "a" * 5000 + " the steel furnace pours " + "b" * 5000
    win = archive_org.keyword_window(text, ["furnace"], runtime_s=1000.0)
    assert win is not None and 440 < win[0] < 480 and win[1] - win[0] == 60
    assert archive_org.keyword_window(text, ["zzz"], 1000.0) is None


def test_query_consolidation_string_and_embedding():
    pairs = [("b1", "city skyline aerial dusk"), ("b2", "Aerial dusk city skyline"), ("b3", "the steel factories"),
             ("b4", "steel factory"), ("b5", "coffee cup")]
    cl = S.consolidate_queries(pairs)
    assert len(cl) == 3
    members = {tuple(sorted(b for b, _ in v["members"])) for v in cl.values()}
    assert ("b1", "b2") in members and ("b3", "b4") in members and ("b5",) in members
    assert normalise_query("The Steel Factories!") == normalise_query("steel factory")

    def fake_embed(texts):
        # make "coffee cup" identical to the first representative so they merge
        vecs = []
        for t in texts:
            vecs.append([1.0, 0.0] if ("skyline" in t or "coffee" in t) else [0.0, 1.0])
        return vecs
    cl2 = S.consolidate_queries(pairs, embed=fake_embed)
    assert len(cl2) == 2
    big = max(cl2.values(), key=lambda v: len(v["members"]))
    assert sorted(b for b, _ in big["members"]) == ["b1", "b2", "b5"]


def test_resolve_sources_respects_toggles_and_override():
    cfg = {"sources": {"pexels": True, "openverse": False, "wikimedia": True, "nasa": True, "archiveorg": False},
           "youtube": True, "youtube_short_clip": False}
    assert S.resolve_sources(cfg, None) == ["pexels_video", "pexels_photo", "wikimedia", "nasa", "youtube_y1"]
    assert S.resolve_sources(cfg, "nasa,pexels") == ["pexels_video", "pexels_photo", "nasa"]
    cfg["youtube_short_clip"] = True
    assert S.resolve_sources(cfg, "youtube") == ["youtube_y1", "youtube_y2"]


def test_youtube_filters_and_vtt(fixture=None):
    items = [
        {"id": "ok1", "snippet": {"title": "How steel is made", "channelTitle": "Foundry TV", "categoryId": "27"},
         "status": {"license": "creativeCommon", "madeForKids": False, "privacyStatus": "public"}, "contentDetails": {"duration": "PT12M5S"}},
        {"id": "kid", "snippet": {"title": "x", "channelTitle": "c", "categoryId": "27"}, "status": {"license": "creativeCommon", "madeForKids": True}, "contentDetails": {}},
        {"id": "mus", "snippet": {"title": "song", "channelTitle": "c", "categoryId": "10"}, "status": {"license": "creativeCommon"}, "contentDetails": {}},
        {"id": "trl", "snippet": {"title": "Big Movie - Official Trailer", "channelTitle": "c", "categoryId": "1"}, "status": {"license": "creativeCommon"}, "contentDetails": {}},
        {"id": "std", "snippet": {"title": "fine", "channelTitle": "c", "categoryId": "27"}, "status": {"license": "youtube"}, "contentDetails": {"duration": "PT4M"}},
    ]
    y1 = youtube_cc.filter_videos(items, "y1")
    assert [v["videoId"] for v in y1] == ["ok1"] and y1[0]["durationS"] == 725
    y2 = youtube_cc.filter_videos(items, "y2")
    assert [v["videoId"] for v in y2] == ["ok1", "std"]
    vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nhello <c>there</c>\n\n00:12:40.500 --> 00:12:43.000\nthe steel furnace glows\n"
    cues = youtube_cc.parse_vtt(vtt)
    assert cues[1][2] == "the steel furnace glows"
    win = youtube_cc.find_window(cues, ["furnace"], 1000)
    assert win == (741.8, 781.8)
    assert youtube_cc.Y2_MAX_MS < 5000 and youtube_cc.Y1_MAX_MS == 6000
    assert youtube_cc.attribution_for("y1", "Foundry TV") == "Foundry TV (CC BY)"
    assert youtube_cc.attribution_for("y2", "Foundry TV") == "Source: Foundry TV"


def test_youtube_refuses_on_ci(monkeypatch):
    monkeypatch.setenv("GITHUB_ACTIONS", "true")
    monkeypatch.delenv("BROLL_ALLOW_YOUTUBE", raising=False)
    monkeypatch.setenv("YOUTUBE_API_KEY", "x")
    ok, why = youtube_cc.allowed_here()
    assert not ok and "hosted" in why
    monkeypatch.setenv("BROLL_ALLOW_YOUTUBE", "1")
    assert youtube_cc.allowed_here()[0]
