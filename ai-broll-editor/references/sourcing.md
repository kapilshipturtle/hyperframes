# Asset sourcing: real footage only

Source: spec-v3 section 8 with the Pixabay-removal amendment. Pixabay is not
used anywhere. Pexels is the primary and only paid-tier-free stock source, so
it is paced and cached.

## 8.1 Source chain and stop rule

For each shot, try in order. Stop at the first candidate with
`clipScore >= threshold` (0.26 default, `brain.clip_threshold`; `importance
5` beats need 0.30, `brain.hero_threshold`) that passes the filters
(duration, orientation, dedupe, watermark).

1. Pexels videos
2. Pexels photos
3. Openverse images
4. Wikimedia Commons images and video
5. NASA (space, earth, aviation topics)
6. Internet Archive public domain film (historical, industrial, mid-century)
7. YouTube Y1 (Creative Commons; home machine only)
8. YouTube Y2 (opt-in, under 5 s; home machine only)
9. Typographic card from the beat's own words. Never fails. Never AI.

User assets override the chain: media placed in `work/<job>/assets/user/`
and tagged to a beat (`user-assets.json`: `{"b_0042": "assets/user/my.mp4"}`)
are preferred over every source. They still go through prepare and the
validator.

`job.yaml` `sources.*` toggles turn a source off; the order never changes.

## 8.3 Pexels (primary)

```
GET https://api.pexels.com/videos/search?query=...&orientation=landscape&size=medium&per_page=15
GET https://api.pexels.com/v1/search?query=...&orientation=landscape&size=large&per_page=15
Authorization: <PEXELS_API_KEY>
```

Published limits: 200 requests per hour, 20,000 per month. 429 comes with
`X-Ratelimit-Reset`. Measured stricter than published: back-to-back calls
get 429 even with quota left.

Rules enforced in `scripts/py/broll_common.py`:
- 12 s floor between requests (`PEXELS_FLOOR_S = 12.0`). Not configurable
  below this.
- Exponential backoff on 429; honour `X-Ratelimit-Reset`.
- Cache 24 h by normalised query (`~/.cache/ai-broll-editor/` or
  `BROLL_CACHE_DIR`). Normalised = lowercase, punctuation stripped,
  whitespace collapsed, stop words removed.
- Store `"Video by <name> on Pexels"` (or Photo) for `credits`.
- Never drive a browser to scrape Pexels.
- Apply for the free unlimited tier once the tool is real.

Budget: about 500 beats consolidate to about 150 query clusters. 150 calls at
12 s is 30 minutes. Query consolidation in the Director stage is what keeps
sourcing under an hour.

## 8.4 Openverse, Wikimedia Commons, NASA

Openverse (keyless anonymous):
```
GET https://api.openverse.org/v1/images/?q=Eiffel+tower+1900&license_type=commercial&aspect_ratio=wide&size=large&page_size=20
```
Returns `license`, `license_url`, `attribution`. Always use a request timeout
(8 s, `HTTP_TIMEOUT_S`). Openverse has been observed to hang with no reply.
On timeout, skip to the next source; never retry more than once.

Wikimedia Commons:
```
https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+Eiffel+tower&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1920&format=json
```
Use `filetype:video` for video. Read `extmetadata.LicenseShortName`. Keep
only CC0, CC BY, CC BY-SA and PD. Anything else is rejected before download.
CC BY and CC BY-SA need credit lines; the Brain checks I11.

NASA (public domain):
```
https://images-api.nasa.gov/search?q=nebula&media_type=image,video
```
Asset manifests give direct file URLs. Use only for space, earth
observation and aviation beats; CLIP scoring rejects it elsewhere.

## 8.5 Internet Archive public domain film

Search:
```
https://archive.org/advancedsearch.php?q=(steel+factory)+AND+mediatype:(movies)+AND+(licenseurl:*publicdomain*+OR+collection:(prelinger))&fl[]=identifier&fl[]=title&fl[]=licenseurl&fl[]=runtime&rows=20&output=json
```
Files: `https://archive.org/metadata/<identifier>`, then download the
`h.264` or `MPEG4` derivative from
`https://archive.org/download/<identifier>/<file>`.

Caveats:
- Prelinger's own FAQ: not every Prelinger film is public domain. Keep only
  items whose `licenseurl` is a public domain dedication or a CC licence.
- Most files are SD (480 lines). Mark `sd: true`. The Brain routes them
  through `pip-over-blur` or the `vintage` grade with letterbox so low
  resolution reads as intentional archival style.
- Find the moment: many films expose OCR text at `<identifier>_djvu.txt`.
  Locate the transcript keyword, take a 60 s window, run PySceneDetect.
- Downloads are large. Run `scripts/py/archive_org.py` on the home machine
  (spec 19: the `pre-source` stage runs only on `self-hosted`).

## 8.6 Relevance scoring and dedupe (all sources)

`scripts/py/score_clip.py`:
- `open_clip` ViT-B-32 (`laion2b_s34b_b79k`) on CPU, about 0.1 s per image.
- Videos: 3 frames at 10, 50 and 90 percent of duration, scaled to 320 px.
  `clipScore` = max cosine between the frame embeddings and the
  `visualIntent` text embedding.
- Images: one embedding.
- pHash per chosen frame.

Reject:
- pHash distance < 8 to any already chosen asset (duplicate).
- Portrait for a full-screen layout (the Brain routes to `pip-over-blur`
  instead of rejecting).
- Watermark heuristic: OpenCV text-like high-contrast blobs in the lower 20
  percent.
- Black borders (`cropdetect`).

Reuse limits (Brain I8): never the same asset within 2,700 frames, max 2
uses per project.

## 8.8 In-point selection inside a source clip

`scripts/py/pick_shot.py`, for stock and YouTube alike:

1. Source longer than 12 s: PySceneDetect `detect-adaptive` for shot
   boundaries. Otherwise treat as one shot.
2. For each shot at least as long as needed: `sceneScore` from FFmpeg
   `-vf "select='gte(scene,0)',metadata=print:key=lavfi.scene_score"` (mean
   frame difference; prefer moderate motion 0.02 to 0.15, penalise static
   < 0.005 and frantic > 0.3); `clipScore` on the middle frame;
   `faceCentre` penalty if a face is cut at the edge (OpenCV Haar cascade);
   `letterbox` penalty.
3. Choose the best shot. In-point = shot start + 0.4 s (skip the first frames
   after a cut). If the shot is longer than needed, pick the window with the
   highest `clipScore` on 3 sampled frames.
4. Record `inMs`, `outMs`, scores and `reasons[]` into `assets.json`.

Needed length = placement length + next transition length + 0.2 s. The
Brain may later add `headPadFrames` for a transition; prepare then trims
from `inMs - headPadFrames * 33.33` when the source has headroom.

## assets.json shape

```json
{ "b_0001": { "chosen": { "assetId": "pexels_v_881234", "kind": "video", "source": "pexels", "srcUrl": "...",
   "localPath": "assets/pexels_v_881234.mp4", "preparedPath": "prepared/b_0001.mp4", "inMs": 2000, "outMs": 5940,
   "width": 1920, "height": 1080, "fps": 30, "clipScore": 0.31, "sceneScore": 0.06, "license": "Pexels License",
   "attribution": "Video by X on Pexels", "tier": "stock",
   "reasons": ["best clipScore of 12 candidates", "moderate motion", "no watermark"] },
   "alternates": [ "...2 more candidates..." ] } }
```

`source` is one of `pexels | openverse | wikimedia | nasa | archiveorg |
youtube | user`. `tier` is one of `stock | archival | y1 | y2 | user`. Keep
2 alternates per beat; repair mode `swap-alternate` uses them without a new
search.

## Where sourcing runs

Pexels, Openverse, Wikimedia and NASA run anywhere (runner or laptop).
Internet Archive downloads and both YouTube tiers run only on the home
machine. Hosted CI IPs hit bot walls and large downloads waste runner
minutes.

## Report

`report.md` lists every beat that ended on a typographic card, every Y2
clip, and every CC BY credit, so the user can drop replacement media into
`assets/user/` before the final render.
