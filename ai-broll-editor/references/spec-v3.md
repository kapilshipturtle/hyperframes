# AI B-ROLL EDITOR SKILL: FINAL BUILD SPECIFICATION v3

Date: 14 September 2026. Supersedes v1 and v2. This is the single file to hand to Claude Code.
Goal: a Claude skill that takes a 25 to 40 minute narration audio and produces a professionally edited B-roll video (real footage and real images only, no AI-generated visuals), with transitions, motion graphics, text overlays, sound effects, colour grading and optional captions, rendered with Remotion on GitHub Actions, using free tools and free tiers, with every element placed at the exact right frame.

> BUILD AMENDMENT (14 Sep 2026, user decision): **Pixabay is removed from the stack entirely.** Every Pixabay reference below is void. Source chain becomes: Pexels videos -> Pexels photos -> Openverse -> Wikimedia Commons -> NASA -> Internet Archive -> YouTube Y1 -> YouTube Y2 (opt-in) -> typographic card. Pexels is therefore the primary stock source and must be paced (measured: 429s on back-to-back calls even with quota left; a 12 s floor between requests is safe) and cached 24 h by normalised query. SFX/music packs come from Mixkit, Kenney (CC0), YouTube Audio Library, Incompetech. Everything else in this spec is followed as written. Rendering runs on GitHub Actions in the public repo `kapilshipturtle/hyperframes` (repo secret `PEXELS_API_KEY` exists).

How this file is organised
- Part A (Sections 1 to 3): decisions, free stack, the timing contract.
- Part B (Sections 4 to 10): every pipeline stage with ranked working solutions, commands and code.
- Part C (Section 11): THE BRAIN, the placement engine that decides where every clip, cut, transition, text, sound and music segment goes. This is the heart of the skill.
- Part D (Sections 12 to 16): validation, rendering speed tiers, audio mix, QC, effects catalogue.
- Part E (Sections 17 to 23): packs, skill layout, workflow YAML, build order, budget, risks, sources.

---

# PART A

## 1. LOCKED DECISIONS

| # | Decision | Reason |
|---|---|---|
| D1 | All timing derives from word-level timestamps. One frame conversion function. One validated `timeline.json`. Remotion and FFmpeg are dumb renderers of that JSON | Every tool that places B-roll accurately works this way |
| D2 | fps 30, 1920x1080, H.264 High 4.1 yuv420p, GOP 30, identical encoder params for every segment and chunk | Lossless `ffmpeg -c copy` concat of parallel renders |
| D3 | Every B-roll asset is pre-trimmed with FFmpeg to its exact placement length (max 6.0 s stock, max 5.0 s YouTube) before any render | Avoids Remotion's documented slowdown with long sources; makes decode trivial |
| D4 | NO AI-generated images or video anywhere. Visual fallback chain ends in a typographic card built from the narration's own words | User requirement: real B-roll only |
| D5 | Transcription default: Groq free tier `whisper-large-v3-turbo` with word timestamps, then WhisperX forced alignment on CPU. Offline fallback: whisper.cpp via `@remotion/install-whisper-cpp`. GPU option: WhisperX on Kaggle or own GPU | Free, fast, accurate (about ±50 ms after alignment) |
| D6 | Stock priority: Pexels (200 req/hour, paced) for all stock, Openverse / Wikimedia Commons / NASA / Internet Archive public domain for named entities and archival footage. (Pixabay removed.) | Rate limits and licences dictate order |
| D7 | YouTube in two tiers. Tier Y1: Creative Commons videos (licence-filtered via Data API), attributed. Tier Y2 (opt-in flag `youtube_short_clip: true`): non-CC videos, clips strictly under 5.0 s, no original audio, transformative commentary context, attribution card, one clip per source video per project. Both tiers run only on the user's home machine, never on hosted CI runners | See 8.7 |
| D8 | Planning LLM: the Claude Code session or `claude -p` in batch. The Brain (placement) is deterministic TypeScript, not an LLM | Creativity from the LLM, precision from code |
| D9 | Render: hybrid routing. Plain full-screen clip/image beats with cut or fade go through FFmpeg; everything else through Remotion; segments concatenated. 18-worker GitHub Actions matrix on a public repo or a self-hosted runner | 4 to 8x faster than single-runner Remotion |
| D10 | Remotion Free License covers individuals and companies up to 3 people. Keep the renderer behind the `timeline.json` boundary so HyperFrames (Apache 2.0) can replace it | Licence insurance |

## 2. THE FREE STACK

| Stage | Primary | Limits to design around | Fallback |
|---|---|---|---|
| Audio prep | FFmpeg | none | none |
| Transcription | Groq `whisper-large-v3-turbo`, `verbose_json`, `timestamp_granularities[]=word` | 20 RPM, 2,000 RPD, 7,200 audio s/hour, 28,800 audio s/day, 25 MB/file | whisper.cpp `small.en` on CPU; WhisperX `large-v3-turbo` on Kaggle |
| Alignment | WhisperX `align()` wav2vec2 on CPU | minutes for 40 min | Whisper native word times |
| Emphasis detection | FFmpeg `astats` RMS + pitch proxy + LLM emphasis flags | none | RMS only |
| Segmentation and Brain | deterministic TypeScript | none | none |
| Chapters and shot planning | Claude Code / `claude -p --output-format json` | subscription | Groq Llama free tier |
| Stock video + photos | Pexels `/videos/search`, `/v1/search` | 200 req/h published, measured stricter: pace 12 s, cache 24 h | Openverse (keyless), Wikimedia Commons, NASA Image API |
| Archival footage | Internet Archive advancedsearch (`mediatype:movies`, public domain filter), NASA, Wikimedia Commons video | quality is often SD | none |
| YouTube | Data API v3 `search.list` (`videoLicense=creativeCommon` for Y1) + `yt-dlp --download-sections` on home machine | 10,000 units/day; bot wall on CI IPs; JS runtime (Deno) needed | skip |
| Relevance scoring | `open_clip` ViT-B-32 CPU + pHash | about 0.1 s/image | Claude vision in QC |
| Shot picking | PySceneDetect 0.7 `detect-adaptive` on 30 to 60 s windows; FFmpeg `scene` score for in-point | windows only | FFmpeg `scdet` |
| SFX | local pack: Mixkit, Kenney (CC0), YouTube Audio Library | build once | Freesound previews (API non-commercial only) |
| Music | local pack: YouTube Audio Library, Incompetech (CC BY) | curate once | none |
| Render | Remotion 4.0.5xx, `@remotion/media` `<Video>`, `@remotion/transitions` | Free License up to 3 people | HyperFrames |
| Compute | GitHub Actions public repo (unlimited standard minutes, 20 concurrent jobs, 6 h/job) or self-hosted runner | no GPU on hosted | own PC with NVIDIA GPU |
| Preview | `@remotion/web-renderer` in desktop Chrome, `licenseKey: "free-license"` | tab must stay open | `--scale 0.5 --every-nth-frame 5` |
| Agent knowledge | `npx skills add remotion-dev/skills` | none | `npx skills add heygen-com/hyperframes` |

## 3. THE TIMING CONTRACT

```
words(ms) -> beats(ms) -> cut points(ms, on word starts, 100 ms lead) -> ONE function msToFrame -> frames
frame durations by subtraction -> timeline.json validated -> Remotion/FFmpeg render exactly that
```

Rules enforced by code:
1. Visual changes land on a word START, 80 to 120 ms early. Never inside a word.
2. Shot length 45 to 180 frames (1.5 to 6.0 s). YouTube Y2 clips 45 to 149 frames (under 5.0 s).
3. Transitions (8 to 18 frames) belong to the ENTERING shot and complete exactly at the cut frame.
4. Text is anchored to a word ID; ends 5 or more frames before its beat ends.
5. SFX anchor to transition-start or text-in frames; 45 or more frames apart.
6. `sum(broll durations) == msToFrame(durationMs)`; no gaps, no overlaps except declared transition overlaps.

---

# PART B: PIPELINE STAGES

## 4. INGEST

```bash
JOB=work/$JOB_ID; mkdir -p $JOB/{asr,plans,assets,prepared,segments,qc,cache}
ffmpeg -y -i input.mp3 -ac 1 -ar 16000 -c:a pcm_s16le $JOB/narration16k.wav          # whisper.cpp / WhisperX input
ffmpeg -y -i input.mp3 -ac 1 -ar 16000 -b:a 32k $JOB/narration16k_32k.mp3             # Groq upload (40 min = about 9.6 MB)
ffmpeg -y -i input.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k $JOB/narration_norm.m4a
ffprobe -v error -show_entries format=duration -of csv=p=0 input.mp3 > $JOB/duration_s.txt
ffmpeg -i input.mp3 -af "silencedetect=noise=-35dB:d=0.4" -f null - 2> $JOB/silences.txt
ffmpeg -i $JOB/narration_norm.m4a -af "astats=metadata=1:reset=1:length=0.05,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=$JOB/rms50ms.txt" -f null -
```

`rms50ms.txt` (RMS every 50 ms) feeds emphasis detection (11.4) and music ducking (14).

## 5. TRANSCRIPTION

### 5.1 Option A (default): Groq free tier, then WhisperX alignment

```python
# scripts/py/transcribe_groq.py
import os, json, subprocess
from groq import Groq
client = Groq(api_key=os.environ["GROQ_API_KEY"])

def chunks(src, chunk_s=600, overlap_s=2):
    dur = float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",src]))
    t, i, out = 0.0, 0, []
    while t < dur:
        p = f"{src}.c{i}.mp3"; start = max(0, t-overlap_s)
        subprocess.run(["ffmpeg","-y","-ss",str(start),"-i",src,"-t",str(chunk_s+2*overlap_s),"-ac","1","-ar","16000","-b:a","32k",p],check=True,capture_output=True)
        out.append((p,start)); t += chunk_s; i += 1
    return out

words=[]
for path, off in chunks("work/job/narration16k_32k.mp3"):
    with open(path,"rb") as f:
        r = client.audio.transcriptions.create(file=(os.path.basename(path), f.read()), model="whisper-large-v3-turbo",
              response_format="verbose_json", timestamp_granularities=["word","segment"], language="en",
              prompt=os.environ.get("GLOSSARY",""), temperature=0.0)
    for w in r.words:
        s, e = w["start"]+off, w["end"]+off
        if words and s*1000 < words[-1]["endMs"] - 50: continue          # overlap: keep earlier chunk
        words.append({"text": w["word"].strip(), "startMs": int(s*1000), "endMs": int(e*1000), "conf": 1.0})
json.dump({"words": words}, open("work/job/asr/groq.json","w"))
```

```python
# scripts/py/align_whisperx.py  (CPU is fine for align-only)
import whisperx, json
audio = whisperx.load_audio("work/job/narration16k.wav")
raw = json.load(open("work/job/asr/groq.json"))["words"]
segs, buf = [], []
for w in raw:
    buf.append(w)
    if len(buf) >= 15 or w["text"].endswith((".", "?", "!")):
        segs.append({"start": buf[0]["startMs"]/1000, "end": buf[-1]["endMs"]/1000, "text": " ".join(x["text"] for x in buf)}); buf = []
if buf: segs.append({"start": buf[0]["startMs"]/1000, "end": buf[-1]["endMs"]/1000, "text": " ".join(x["text"] for x in buf)})
model_a, meta = whisperx.load_align_model(language_code="en", device="cpu")
aligned = whisperx.align(segs, model_a, meta, audio, "cpu", return_char_alignments=False)
out=[]
for s in aligned["segments"]:
    for w in s["words"]:
        out.append({"text": w["word"], "startMs": int(w["start"]*1000) if "start" in w else None,
                    "endMs": int(w["end"]*1000) if "end" in w else None, "conf": float(w.get("score", 0.9)) if "start" in w else 0.3})
json.dump({"words": out}, open("work/job/asr/aligned.json","w"))
```

Groq free limits at time of writing: 20 RPM, 2,000 RPD, 7,200 audio seconds/hour, 28,800/day, 25 MB per file. A 40 minute video is 2,400 audio seconds: 3 videos per hour, 12 per day, for free. Known limit of WhisperX: word boundaries may still differ from a phonetic aligner (issue #1247) but ±50 ms is invisible at 2 to 6 s cut lengths.

### 5.2 Option B (offline CPU on the runner): whisper.cpp via Remotion

```ts
import {installWhisperCpp, downloadWhisperModel, transcribe, toCaptions} from "@remotion/install-whisper-cpp";
await installWhisperCpp({to: "whisper.cpp", version: "1.7.5"});
await downloadWhisperModel({model: "small.en", folder: "whisper.cpp"});           // medium.en for names, slower
const out = await transcribe({model: "small.en", whisperPath: "whisper.cpp", whisperCppVersion: "1.7.5",
  inputPath: "work/job/narration16k.wav", tokenLevelTimestamps: true, splitOnWord: true, language: "en"});
const {captions} = toCaptions({whisperCppOutput: out});   // text, startMs, endMs, timestampMs (t_dtw), confidence
```

`tokenLevelTimestamps: true` passes `--dtw`, which Remotion's docs recommend for accurate timings. Cache `whisper.cpp/` with `actions/cache`. Realistic: `small.en` 6 to 10x real time on a 4 vCPU runner.

### 5.3 Option C (GPU): WhisperX end to end

```bash
whisperx work/job/narration16k.wav --model large-v3-turbo --language en --batch_size 16 --compute_type float16 \
  --align_model WAV2VEC2_ASR_LARGE_LV60K_960H --output_format json --output_dir work/job/asr
```
Free GPUs: Kaggle (about 30 GPU h/week), Colab free, your own PC as a self-hosted runner.

### 5.4 Post-processing (all options) -> `transcript.json`

- Monotonic, non-overlapping words: `startMs = max(startMs, prev.endMs)`.
- Untimed tokens interpolated between neighbours, `conf 0.3`.
- Apply `corrections.json` (`{"wrong":"right"}`) so on-screen text is right.
- Attach per-word `rms` (mean of 50 ms RMS bins within the word) and `gapAfterMs` (silence to next word). The Brain uses both.
- Sentence and clause markers from punctuation; fallback gap > 350 ms.

## 6. SEGMENTATION (deterministic)

```ts
const MIN=1500, MAX=6000, GAP_SPLIT=350;
const CONJ = new Set(["and","but","because","so","which","while","then","or","when","although","however","since"]);
export function toBeats(words: Word[]): Beat[] {
  const sentences = splitWhere(words, (w, n) => /[.?!]$/.test(w.text) || (n && n.startMs - w.endMs > GAP_SPLIT));
  const beats = sentences.flatMap(splitLong);
  return mergeShort(beats).map(toBeat);
}
function splitLong(ws: Word[]): Word[][] {
  if (span(ws) <= MAX || ws.length < 4) return [ws];
  const idx = argmax(range(1, ws.length-2), i =>
      (/,$/.test(ws[i].text) ? 3 : 0) + (CONJ.has(ws[i+1].text.toLowerCase()) ? 2 : 0) + (ws[i+1].startMs - ws[i].endMs) / 200
      - Math.abs((i+1) - ws.length/2) / ws.length);          // prefer clause boundaries, big gaps, near the middle
  return [...splitLong(ws.slice(0, idx+1)), ...splitLong(ws.slice(idx+1))];
}
```

Sections (chapters): one LLM call with word IDs every 10 words returning `{chapters:[{title,startWordId,kind}]}`, kinds `hook|explain|story|list|comparison|outro`, 90 to 240 s each, starting on sentence starts. Validated by `beats.schema.json`.

## 7. THE DIRECTOR (LLM, creative intent only)

Runs per section via the Claude Code session or:
```bash
claude -p --output-format json --system-prompt-file references/director-system.md "$(cat work/job/sections/sec_01.prompt.txt)" > work/job/plans/sec_01.raw.json
```
Ajv-validate against `schemas/shotplan.schema.json`; on failure re-prompt with the errors (max 3); fallback rule-based planner.

The Director outputs INTENT, never times: `visualIntent`, `queries[]`, `layout` preference, `transitionFamily`, `text` (verbatim words + anchor word ID), `sfx` tags, `motion`, `mood`, `importance` (1 to 5), `emphasisWordIds`. The Brain (Section 11) turns intent into exact frames and may override layout or transition when constraints demand it; the Director is told this in its system prompt.

Director hard rules (verbatim in `references/director-system.md`):
- JSON only, schema exact, no times, reference beatId and wordId only.
- Queries: 2 to 5 concrete nouns/actions/places/materials a stock library understands. Abstract idea -> visual metaphor, query the metaphor. No query repeated within the last 10 beats.
- Text on 30 to 50 percent of beats; content is a verbatim substring of the beat or a number said in it; 1 to 6 words.
- Variety: no more than 2 identical layout families in a row; alternate wide / medium / close; alternate clip / image / motion graphic.
- Transition families by mood: energetic = zoom-punch, whip-pan, slide; calm = fade, luma-dissolve; documentary = cut, fade; tech = glitch, wipe.
- SFX only on visible transitions and text pops; none on hard cuts; max one per 1.5 s.
- Prefer full-screen clip or Ken Burns image for 55 to 70 percent of beats (FFmpeg-routable).
- Mark `importance 5` for the 3 to 5 most important beats per section (these get Pexels hero shots and priority in conflicts).

Query consolidation: cluster all queries by normalised string and `open_clip` text embedding cosine >= 0.92; one search per cluster; beats in a cluster take different candidates. Saves 60 to 80 percent of API calls.

## 8. ASSET SOURCING (real footage only)

### 8.1 Source chain and stop rule

For each shot, try in order and stop at the first candidate with `clipScore >= threshold` (0.26 default; `importance 5` beats require 0.30) that passes filters (duration, orientation, dedupe, watermark):
1. Pexels videos -> 2. Pexels photos -> 3. Openverse images -> 4. Wikimedia Commons images and video -> 5. NASA (space, earth, aviation topics) -> 6. Internet Archive public domain film (historical, industrial, mid-century topics) -> 7. YouTube Y1 (CC) -> 8. YouTube Y2 (opt-in, under 5 s) -> 9. Typographic card from the beat's own words (never fails, never AI).

### 8.2 (removed: Pixabay)

### 8.3 Pexels (primary)

`GET https://api.pexels.com/videos/search?query=...&orientation=landscape&size=medium&per_page=15`, header `Authorization: KEY`. Photos: `GET https://api.pexels.com/v1/search?query=...&orientation=landscape&size=large&per_page=15`. 200/hour, 20,000/month; 429 with `X-Ratelimit-Reset`. Measured stricter than published: pace with a 12 s floor between requests, exponential backoff on 429. Cache 24 h by normalised query. Store "Video by X on Pexels" for credits. Apply for free unlimited access once the tool is real. Never drive a browser to scrape Pexels.

### 8.4 Openverse, Wikimedia Commons, NASA

- Openverse: `GET https://api.openverse.org/v1/images/?q=Eiffel+tower+1900&license_type=commercial&aspect_ratio=wide&size=large&page_size=20` (keyless anonymous allowed). Returns `license`, `license_url`, `attribution`. Always use a request timeout (8 s); it has been observed to hang.
- Wikimedia: `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap+Eiffel+tower&gsrnamespace=6&gsrlimit=20&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1920&format=json`; for video use `filetype:video`. Read `extmetadata.LicenseShortName`, keep CC0, CC BY, CC BY-SA, PD.
- NASA: `https://images-api.nasa.gov/search?q=nebula&media_type=image,video` (public domain). Asset manifests give direct file URLs.

### 8.5 Internet Archive public domain film

Search: `https://archive.org/advancedsearch.php?q=(steel+factory)+AND+mediatype:(movies)+AND+(licenseurl:*publicdomain*+OR+collection:(prelinger))&fl[]=identifier&fl[]=title&fl[]=licenseurl&fl[]=runtime&rows=20&output=json`.
Files: `https://archive.org/metadata/<identifier>` then download the `h.264` or `MPEG4` derivative from `https://archive.org/download/<identifier>/<file>`.
Caution from Prelinger's own FAQ: not every Prelinger film is public domain; keep only items whose `licenseurl` is a public domain dedication or CC licence. Most files are SD (480 lines); route them through `pip-over-blur` or a "vintage" grade with letterbox so the low resolution reads as intentional archival style. Extract a shot with PySceneDetect on a 60 s window near the transcript keyword hit (the Archive exposes OCR/derived text for many films at `<identifier>_djvu.txt`).

### 8.6 Relevance scoring and dedupe (all sources)

```python
# scripts/py/score_clip.py
import open_clip, torch, subprocess, imagehash
from PIL import Image
model, _, pre = open_clip.create_model_and_transforms("ViT-B-32", pretrained="laion2b_s34b_b79k")
tok = open_clip.get_tokenizer("ViT-B-32")
def frames(video, n=3):
    dur=float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",video]))
    out=[]
    for i in range(n):
        t=dur*(0.1+0.8*i/max(1,n-1)); p=f"{video}.f{i}.jpg"
        subprocess.run(["ffmpeg","-y","-ss",str(t),"-i",video,"-frames:v","1","-vf","scale=320:-1",p],check=True,capture_output=True); out.append(p)
    return out
@torch.no_grad()
def score(intent, paths):
    t=model.encode_text(tok([intent])); t/=t.norm(dim=-1,keepdim=True)
    im=model.encode_image(torch.stack([pre(Image.open(p)) for p in paths])); im/=im.norm(dim=-1,keepdim=True)
    return float((im@t.T).max())
def phash(p): return imagehash.phash(Image.open(p))
```
Reject: pHash distance < 8 to any chosen asset; portrait for full-screen (route to `pip-over-blur` instead); watermark heuristic (OpenCV text-like high-contrast blobs in the lower 20 percent); black borders (`cropdetect`).

### 8.7 YouTube: two tiers, the honest version

Legal reality (not legal advice; the skill's README must say this): US fair use is decided on four factors (purpose and character including transformativeness and commerciality; nature of the work; amount and substantiality relative to the whole; effect on the market). There is no rule that clips under 5, 7 or 10 seconds are automatically fair use; a court found a two-second on-screen use actionable in Hirsch v. CBS, and Prince sent takedowns over six-second Vine clips. YouTube's Content ID matches on length and proportion as a proxy and cannot see context, so short clips can still be claimed. YouTube's Terms of Service also prohibit downloading content except where YouTube provides the means. Keeping clips very short, using only as much as needed to illustrate a point made in the narration, adding on-screen source attribution, never using the clip's audio, never using the "heart" of a work, and not substituting for the original all strengthen a fair-use posture; none of them guarantees it. Because of this:

- Tier Y1 (default when `youtube: true`): only `videoLicense=creativeCommon` results. Clips up to 6.0 s, attribution card at the end and small corner credit during the clip (CC BY requires credit).
- Tier Y2 (only when `youtube_short_clip: true` is set by the user, per job): non-CC results allowed; hard limits enforced by the validator: duration strictly less than 5.0 s (149 frames max), original audio always dropped, one clip per source video per project, never from music videos, film trailers, sports broadcasts or content flagged as "Made for Kids" (Data API `contentDetails`), the beat must contain narration that comments on or describes what the clip shows (the Brain checks that the clip's CLIP intent matches beat text with score >= 0.30), corner credit `Source: <channelTitle>` for the whole clip duration, and every Y2 asset is listed in `credits.json` and rendered on a final credits card. The job report lists all Y2 clips so the user can remove any before publishing.
- Both tiers run on the home machine only (self-hosted runner or the `pre-source` CLI). In 2026 YouTube scores IP reputation and requires a Proof-of-Origin token from its BotGuard JavaScript; data-centre and CI IPs frequently get "Sign in to confirm you're not a bot". yt-dlp requires a JavaScript runtime (Deno) for YouTube now.

Implementation:
```bash
# 1. search (Data API, 100 units per call, 10,000 units/day)
GET https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&videoDuration=medium&q=<query>&maxResults=10&key=KEY[&videoLicense=creativeCommon]
GET https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status,snippet&id=<ids>&key=KEY     # licence, madeForKids, category
# 2. find the moment inside the video from its captions
yt-dlp --write-auto-subs --sub-lang en --skip-download -o "work/job/yt/%(id)s" "https://www.youtube.com/watch?v=<id>"
#    parse .vtt, find first cue containing the query nouns, take a 40 s window centred on it
# 3. download only the window (home machine; Deno installed)
yt-dlp --download-sections "*00:12:40-00:13:20" --force-keyframes-at-cuts -f "bv*[height<=1080][ext=mp4]" \
  --sleep-requests 2 --sleep-interval 3 -o "work/job/yt/%(id)s_%(section_start)s.%(ext)s" "https://www.youtube.com/watch?v=<id>"
# 4. shot boundaries, then pick the best shot with CLIP; trim to <= 6.0 s (Y1) or < 5.0 s (Y2), drop audio
scenedetect -i work/job/yt/<file>.mp4 detect-adaptive list-scenes -o work/job/yt/
```
Skip the source after 90 s or any error. The pipeline never blocks on YouTube.

### 8.8 In-point selection inside a source clip (works for stock and YouTube)

The Brain needs a clip segment that is one continuous shot with stable, relevant content:
1. If the source is longer than 12 s, run PySceneDetect (`detect-adaptive`) to get shot boundaries; otherwise treat it as one shot.
2. For each shot of length >= needed length: compute a `sceneScore` with FFmpeg `-vf "select='gte(scene,0)',metadata=print:key=lavfi.scene_score"` (mean frame-difference; prefer moderate motion 0.02 to 0.15, penalise static < 0.005 and frantic > 0.3), a `clipScore` on the middle frame, a `faceCentre` penalty if a face is cut at the edge (OpenCV Haar cascade, cheap), and a `letterbox` penalty.
3. Choose the best shot; in-point = shot start + 0.4 s (skip the first frames after a cut); if the shot is longer than needed, choose the window inside it with the highest `clipScore` on 3 sampled frames.
4. Record `inMs`, `outMs`, scores and the reasons into `assets.json` for explainability.

## 9. ASSET PREPARATION (deterministic FFmpeg)

```bash
# video, exact length = placement length + next transition length + 0.2 s safety
ffmpeg -y -ss 2.000 -i src.mp4 -t 3.940 -an \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,setsar=1,format=yuv420p" \
  -c:v libx264 -preset veryfast -crf 18 -g 30 -keyint_min 30 -sc_threshold 0 -profile:v high -level 4.1 -movflags +faststart prepared/b_0001.mp4
# SD archival: upscale with lanczos and letterbox intentionally
ffmpeg -y -ss 12.4 -i archive.mp4 -t 4.2 -an -vf "scale=1440:1080:flags=lanczos:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,fps=30,format=yuv420p" ... prepared/b_0042.mp4
# image for Ken Burns: oversize
ffmpeg -y -i src.jpg -vf "scale=2560:1440:force_original_aspect_ratio=increase,crop=2560:1440" -q:v 2 prepared/b_0002.jpg
```
Short source: freeze last frame (`tpad=stop_mode=clone:stop_duration=...` in FFmpeg, `<Freeze>` in Remotion). Never loop. Stamp `-color_primaries bt709 -color_trc bt709 -colorspace bt709` on every re-encode (a mistagged HLG source once forced a whole render onto a slow HDR path).

## 10. DATA CONTRACTS (ms in planning files; frames only in timeline.json)

### 10.1 transcript.json
```json
{ "audioPath": "narration_norm.m4a", "durationMs": 1863420, "language": "en", "engine": "groq-whisper-large-v3-turbo+whisperx-align",
  "words": [ { "id": 0, "text": "Today", "startMs": 120, "endMs": 410, "conf": 0.98, "rms": -21.4, "gapAfterMs": 20 } ],
  "segments": [ { "id": 0, "text": "Today we ...", "startMs": 120, "endMs": 4380, "wordIds": [0,1,2] } ],
  "silences": [ { "startMs": 4380, "endMs": 5010 } ] }
```
### 10.2 beats.json
```json
{ "sections": [ { "id": "sec_01", "title": null, "kind": "hook", "startMs": 0, "endMs": 95000, "beatIds": ["b_0001","b_0002"] } ],
  "beats": [ { "id": "b_0001", "sectionId": "sec_01", "startMs": 120, "endMs": 3860, "wordIds": [0,1,2,3,4,5,6],
               "text": "Today we are going to break down", "nextWordStartMs": 3900, "emphasisWordIds": [4] } ] }
```
### 10.3 shotplan.json (Director output per section)
```json
{ "sectionId": "sec_01", "mood": "energetic", "musicTag": "upbeat-corporate", "grade": "clean-cool",
  "shots": [ { "beatId": "b_0001", "importance": 4, "visualIntent": "aerial city skyline at dusk, traffic timelapse",
     "layoutPreference": "fullscreen-clip", "queries": ["city skyline aerial dusk", "timelapse traffic night"], "preferMotion": true, "shotScale": "wide",
     "transitionFamily": "energetic", "text": { "content": "Break it down", "anchorWordId": 4, "style": "kinetic-bold", "position": "lower-left" },
     "sfx": ["whoosh-soft","pop"], "motion": { "type": "ken-burns", "to": "top-right", "zoom": 1.12 }, "grid": null },
   { "beatId": "b_0002", "importance": 2, "visualIntent": "three tools: laptop, phone, notebook", "layoutPreference": "grid-3",
     "queries": ["laptop desk closeup","smartphone hand","notebook writing"], "grid": { "cells": 3, "labels": ["Laptop","Phone","Notes"] },
     "transitionFamily": "cut", "text": null, "sfx": ["click"], "motion": { "type": "none" } } ] }
```
### 10.4 assets.json
```json
{ "b_0001": { "chosen": { "assetId": "pexels_v_881234", "kind": "video", "source": "pexels", "srcUrl": "...", "localPath": "assets/pexels_v_881234.mp4",
   "preparedPath": "prepared/b_0001.mp4", "inMs": 2000, "outMs": 5940, "width": 1920, "height": 1080, "fps": 30, "clipScore": 0.31, "sceneScore": 0.06,
   "license": "Pexels License", "attribution": "Video by X on Pexels", "tier": "stock", "reasons": ["best clipScore of 12 candidates","moderate motion","no watermark"] },
   "alternates": [ "...2 more candidates..." ] } }
```
### 10.5 timeline.json (frame-quantised EDL)
```json
{ "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 55903, "narration": { "src": "narration_norm.m4a", "startFrame": 0 }, "grade": "clean-cool",
  "tracks": {
    "broll": [ { "id": "b_0001", "from": 0, "durationInFrames": 116, "route": "ffmpeg", "segmentId": "seg_0001", "layout": "fullscreen-clip",
        "media": [ { "src": "prepared/b_0001.mp4", "kind": "video", "startFromFrame": 0 } ], "motion": { "type": "ken-burns", "to": "top-right", "zoom": 1.12 },
        "transitionIn": { "type": "cut", "durationInFrames": 0 }, "credit": null } ],
    "text": [ { "id": "t_0001", "from": 40, "durationInFrames": 70, "content": "Break it down", "style": "kinetic-bold", "position": "lower-left", "anchorWordId": 4 } ],
    "sfx": [ { "id": "s_0001", "from": 104, "src": "sfx/whoosh-soft-02.mp3", "volume": 0.35, "reason": "transition-in b_0002" } ],
    "music": [ { "id": "m_0001", "from": 0, "durationInFrames": 2850, "src": "music/upbeat-corporate-01.mp3", "volume": 0.14, "fadeInFrames": 30, "fadeOutFrames": 45 } ],
    "captions": { "enabled": false, "style": "karaoke-bottom", "pages": [] },
    "credits": [ { "source": "Pexels", "text": "Video by X on Pexels" }, { "source": "YouTube", "text": "Clip: Channel Y (CC BY)" } ] },
  "placementLog": "work/job/placement.log.jsonl" }
```
### 10.6 chunks.json
```json
[ { "id": "seg_0001", "route": "ffmpeg", "fromFrame": 0, "toFrame": 899, "hash": "sha1..." }, { "id": "seg_0002", "route": "remotion", "fromFrame": 900, "toFrame": 1499, "hash": "..." } ]
```

---

# PART C: THE BRAIN (placement engine)

## 11. THE BRAIN: how everything gets placed exactly and properly

### 11.1 What the Brain is and is not

The Brain is `scripts/ts/brain/` : deterministic TypeScript that consumes `transcript.json`, `beats.json`, `shotplan.json`, `assets.json`, `job.yaml` and emits `timeline.json`, `chunks.json`, `placement.log.jsonl` and `audio-mix.json`. It never calls an LLM. Given the same inputs and the same seed it produces byte-identical output. It resolves every conflict with explicit priority rules and writes a reason line for every decision so a human (or Claude in QC) can see why a cut or a sound landed where it did.

Separation of powers: the Director (LLM) says what should be seen and felt; the Brain says exactly when, for how long, on which frames, with which transition length, where text sits, when sounds fire and how music breathes. If the Director's preference violates a hard rule, the Brain overrides it and logs the override.

### 11.2 Tracks, layers and priorities

Rendering stack (bottom to top): `music` (audio) < `broll` (visual base) < `grade` (full-frame overlay) < `motiongfx` < `text` < `credits` < `captions` < `sfx` (audio) < `narration` (audio, always untouched).

Conflict priority when two elements want the same frames (higher wins): narration timing (never moved) > beat boundaries (word starts) > transition completion frame > text visibility (must be readable) > SFX spacing > music phrasing > layout variety > Director preference.

### 11.3 The placement pipeline (11 passes, in this order)

```
P0  normalise inputs, seed RNG (seed = sha1(job_id))                        -> ctx
P1  beat repair: enforce 1.5..6.0 s, split/merge, keep word alignment       -> beats'
P2  cut points: lead time, snap to word starts, section boundaries          -> cuts[] (ms)
P3  emphasis map: where the narration hits hard                              -> emphasis[] (wordId, weight)
P4  shot assignment: layout final, asset final, in/out points, route         -> shots[]
P5  transition assignment: type + duration per cut, entering-shot ownership  -> shots[].transitionIn
P6  frame quantisation: ms -> frames, subtraction durations, contiguity      -> shots[] (frames)
P7  text placement: anchors, windows, collision avoidance, readability       -> text[]
P8  motion graphics scheduling: counters, callouts, grids reveal timing      -> motiongfx[]
P9  SFX scheduling: anchors, spacing, variant rotation, gain                 -> sfx[]
P10 music layout: sections, crossfades, ducking curve from RMS               -> music[], duckCurve
P11 segment routing + chunking + hashing + log                               -> chunks[], placement.log
```

### 11.4 P3: emphasis detection (why cuts feel "on the beat")

Professional editors cut on emphasised words. The Brain computes per word: `emph = 0.45*z(rms) + 0.25*z(duration) + 0.15*(gapBefore > 250ms ? 1 : 0) + 0.15*(director emphasisWordIds contains id ? 1 : 0)` where `z` is the z-score within the section. Words with `emph >= 1.0` are `strong`; `>= 0.5` are `medium`. Uses: (a) when a beat must be split (P1), prefer splitting right before a strong word; (b) text anchors snap to the strongest word in the text span; (c) `zoom-punch` and `impact-soft` SFX are allowed only on strong words; (d) Ken Burns zoom peaks are aligned so the fastest zoom moment coincides with the strongest word in the beat.

### 11.5 P2: cut points

```ts
const LEAD_MS = cfg.leadMs ?? 100;            // 80..120
export function cutPoints(beats: Beat[], words: Word[], durationMs: number): Cut[] {
  const cuts: Cut[] = [];
  for (let i = 0; i < beats.length; i++) {
    const b = beats[i], next = beats[i+1];
    const startWord = words[b.wordIds[0]];
    // rule: land 100 ms before the first word of the beat, but never before the previous word ends + 40 ms
    const prevWord = words[b.wordIds[0]-1];
    const earliest = prevWord ? prevWord.endMs + 40 : 0;
    const cutMs = i === 0 ? 0 : Math.max(earliest, startWord.startMs - LEAD_MS);
    const endMs = next ? Math.max(words[next.wordIds[0]-1].endMs + 40, words[next.wordIds[0]].startMs - LEAD_MS) : durationMs;
    cuts.push({ beatId: b.id, cutMs, endMs, reason: i === 0 ? "first shot starts at 0" : `word #${b.wordIds[0]} start ${startWord.startMs} minus lead ${LEAD_MS}` });
  }
  return cuts;
}
```
Special cases:
- First shot: starts at frame 0 even if speech starts at 1.2 s; if speech starts later than 2.0 s the Brain inserts a `chapter-card` (title from section 1) for the pre-roll and cuts to the first B-roll 100 ms before the first word.
- Long pause inside a beat (> 900 ms): the Brain does not cut inside the pause by default (cutting in silence feels arbitrary); if the beat is over 4.5 s and the pause exists, it may split at the pause end minus 100 ms and mark the second half `motion: slow-zoom-out` to signal a held moment.
- Section boundary: the first beat of a `hook` or `story` section may begin with a `chapter-card` of 60 to 90 frames if the section has a title; the card starts at the section's first word minus 100 ms and the first B-roll follows; the card's own text enters on frame 6 with a spring.
- End: the last shot extends to `durationMs`; if the narration ends more than 1.5 s before the audio ends, an `end-card` fills the tail.

### 11.6 P4: shot assignment and layout override rules

For each beat, the Brain picks the final layout using: Director preference, asset facts (kind, orientation, resolution, count of good candidates), text presence, beat length, and history.

Override rules (ordered):
1. Asset is portrait and layout is full-screen -> `pip-over-blur`.
2. Asset is SD archival -> `fullscreen-image-kenburns` disabled; use `pip-over-blur` with `vintage` sub-grade or letterbox.
3. Beat < 2.2 s -> no grids, no counters, no list reveals (they need time to read): downgrade to `fullscreen-clip`.
4. Beat has text and layout is `grid-*` -> text becomes grid labels or is dropped (never both floating text and grid labels).
5. Three consecutive same-family layouts -> force a different family, preferring `split-*` after full-screens and `fullscreen-*` after splits or grids.
6. Two consecutive Ken Burns images -> the second becomes a clip if any video candidate scored >= threshold - 0.02; else alternate zoom direction (in then out).
7. Beat text contains a number with a unit or percentage -> prefer `stat-counter` if beat >= 2.5 s.
8. Beat text is a quotation (quote marks, or "said", "wrote") -> `quote-card` eligible.
9. If no asset passes threshold after all sources -> `typographic-card` with the beat's key phrase (strongest 2 to 5 consecutive words by emphasis), never an AI image.
10. YouTube Y2 asset -> layout must show the corner credit; grid cells are not allowed for Y2 (credit would be unreadable); duration clamps to 149 frames; if the beat is longer, the remainder gets the next-best stock alternate.

In and out points: from `assets.json` (8.8). If the prepared clip is shorter than needed plus the next transition, prefer the alternate asset; else freeze the last frame.

### 11.7 P5: transition assignment

Per cut between shot i and i+1:
- Base type from the entering shot's `transitionFamily` and section mood, with the rotation rule: no identical transition type twice in a row except `cut`.
- Duration by family: `cut` 0; `fade`, `luma-dissolve` 12 to 18; `wipe`, `slide`, `push-blur` 10 to 14; `zoom-punch`, `whip-pan`, `glitch` 6 to 10; `flip`, `iris`, `clockWipe` 12 to 16. Scale down by 2 frames if either adjacent shot is under 2.2 s; force `cut` if the entering shot is under 1.8 s.
- Cadence: at most one non-cut transition every 2 cuts in `explain` sections, every 3 cuts in `story`, unlimited in `hook` (but never two `zoom-punch` in a row).
- Ownership: the transition belongs to the ENTERING shot and completes exactly at its cut frame. Entering shot gets `from = cutFrame - T` and `durationInFrames = D + T`; the exiting shot is untouched. The entering media must have `T` extra frames at its head: the Brain writes `headPadFrames: T` into `assets.json` so the prepare stage trims `inMs - T*33.33` when possible, else the presentation holds frame 0 for the head (acceptable for fades, avoided for wipes by preferring assets with headroom).
- Emphasis gating: `zoom-punch` only when the entering beat's first word is `strong`; `whip-pan` direction alternates left/right; `glitch` max once per 60 s.
- FFmpeg routability: if both shots are FFmpeg-routable and the transition is `cut` or `fade`, the segment stays FFmpeg; any other transition promotes the entering shot (and therefore the segment boundary) to Remotion.

### 11.8 P6: frame quantisation and drift proof

```ts
export const FPS = 30;
export const msToFrame = (ms: number) => Math.round((ms / 1000) * FPS);   // the only conversion in the codebase
export function quantise(cuts: Cut[], durationMs: number): ShotFrames[] {
  const total = msToFrame(durationMs);
  const starts = cuts.map(c => msToFrame(c.cutMs));
  starts[0] = 0;
  const out: ShotFrames[] = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i+1] : total;
    out.push({ beatId: cuts[i].beatId, from, durationInFrames: to - from });      // subtraction guarantees contiguity
  }
  // post: enforce 45..180 by merging/splitting on frame domain, then re-check sum
  const fixed = enforceBounds(out, 45, 180);
  assert(fixed.reduce((a, s) => a + s.durationInFrames, 0) === total, "drift");
  assert(fixed.every((s, i) => i === 0 || s.from === fixed[i-1].from + fixed[i-1].durationInFrames), "gap/overlap");
  return fixed;
}
```
`enforceBounds`: a shot under 45 merges into the shorter neighbour and the merged shot keeps the earlier shot's asset (its transition is dropped, logged). A shot over 180 (rare after P1) splits at the frame of the strongest word start inside it (minus 3 frames lead), second half uses the beat's alternate asset.

### 11.9 P7: text placement

For each beat with text:
1. Anchor frame: `from = msToFrame(words[anchorWordId].startMs) - 2` (60 to 70 ms early so the word and the text land together perceptually). If the Director's anchor is not inside the text span or is weak, the Brain re-anchors to the strongest word of the span.
2. Duration: `min(beatEndFrame - from - 5, readingFrames)` where `readingFrames = clamp(30 * (0.9 + 0.35 * wordCount), 45, 150)`. If the result is under 30 frames, drop the text (log "unreadable window").
3. Position: Director's preference, then collision rules: never overlap a `lower-third`, a `grid` label, a corner credit (Y2 or CC) or a caption band; if the B-roll's CLIP-detected subject is centred, prefer lower-left or lower-right; on `split-*` layouts text lives in the panel.
4. Scrim: always on over media (gradient or 40 percent box), never on panels.
5. Enter animation 8 frames spring, exit 6 frames, exit completes 5 frames before beat end.
6. Density cap: at most 50 percent of beats in any 60 s window carry text; when exceeded, drop text from the beats with the lowest `importance`.
7. Word-by-word styles use each word's own timestamp; a word shorter than 4 frames borrows 2 frames from the next word's start.

### 11.10 P8: motion graphics scheduling

- `stat-counter`: counts from 0 (or the previous value in a series) to the target; count duration = min(60, beatFrames - 20); ticks SFX every 6 frames while counting, at -22 dB, capped by the global SFX spacing rule (the Brain marks tick trains as one SFX event for spacing).
- `grid-N`: cell k appears at `from + 6 + k * stagger` where `stagger = clamp((beatFrames - 30) / (N + 1), 4, 10)`; labels appear 4 frames after their cell; each cell reveal gets a `click` unless within 45 frames of another SFX (ticks excepted).
- `list-reveal`: line k appears at the start frame of the word that begins line k's text (verbatim mapping to transcript) minus 2 frames.
- `highlight-box`, `arrow-callout`, `underline-draw`: anchored to the strongest word in the beat, 10 frame draw-on.
- `progress-bar-top`: continuous, section-aware, no SFX.
- `chapter-card`: 60 to 90 frames, title enters frame 6, subtitle frame 14, exits with the section's default transition into the first B-roll.

### 11.11 P9: SFX scheduling

```ts
export function scheduleSfx(events: SfxCandidate[], packs: SfxPack, rng: Rng): SfxItem[] {
  const MIN_GAP = 45;
  const sorted = events.sort((a, b) => a.frame - b.frame || b.priority - a.priority);   // priority: transition 3, text-in 2, grid-cell 1, tick-train 1
  const placed: SfxItem[] = [];
  for (const e of sorted) {
    const last = placed.at(-1);
    if (last && e.frame - last.from < MIN_GAP && !(e.kind === "tick-train")) { log(e, "dropped: spacing"); continue; }
    const file = packs.pick(e.tag, rng, last?.tag === e.tag ? last.file : undefined);       // rotate variants, never same file twice in a row
    const volume = baseGain[e.tag] * (e.strong ? 1.15 : 1.0) * sectionGain[e.sectionKind];  // whoosh 0.35, pop 0.30, click 0.25, impact 0.4, tick 0.12
    placed.push({ id: nextId(), from: e.frame, src: file, volume: Math.min(volume, 0.5), reason: e.reason });
  }
  return placed;
}
```
Anchors: transition SFX at `cutFrame - T` (the transition start); text pop at text `from`; grid clicks at each cell reveal; `impact-soft` only on `zoom-punch` cuts on strong words; `riser-short` allowed once per section, starting 45 frames before a `chapter-card`. Hard cuts get no SFX. Whooshes are pitched by direction: left-to-right files for `from-left` wipes when the pack has them.

### 11.12 P10: music layout and ducking

- One track per section by `musicTag`; if consecutive sections share a tag, the same track continues (no restart).
- Track item: `from = sectionStartFrame - 30` (starts under the previous section's last shot), `fadeInFrames 30`, `fadeOutFrames 45`, 60 frame overlap crossfade with the next track.
- If the chosen track is shorter than the section, the Brain selects a loop point at a bar boundary (`bpm` from the manifest, bar = 4 * 60 / bpm seconds) and repeats with a 2 frame crossfade; never a hard restart.
- Base volume by mood: 0.10 to 0.16 (about -22 to -26 dB under voice).
- Ducking curve: from `rms50ms.txt`, `duck[f] = speech(f) ? base * 0.45 : base`, smoothed with 12 frame attack and 24 frame release; `speech(f)` when RMS > -40 dB. Exported as `duckCurve.json` (one value per frame) for Remotion `volume={(f) => duck[f]}` and as an `sidechaincompress` fallback for the FFmpeg mixer.
- Music never plays over a `chapter-card` riser above 0.08.

### 11.13 P11: routing, chunking, hashing, logging

- Route: a broll item is `ffmpeg` if layout in {fullscreen-clip, fullscreen-image-kenburns}, no text, no motiongfx, transitionIn in {cut, fade}, motion in {none, ken-burns, slow-zoom-out}, grade in the FFmpeg-expressible set (16.5), asset not Y2 (credit overlay requires Remotion unless drawn with `drawtext`; v1 keeps Y2 on Remotion). Otherwise `remotion`.
- Segments: consecutive same-route items merge; a Remotion segment absorbs the transition frames at its head. Segment boundaries are multiples of 30 frames when possible (extend the Remotion segment backwards over the FFmpeg one up to 29 frames to hit the boundary; the Remotion segment then renders those frames from the same JSON, which is exact).
- Chunks: Remotion segments longer than 4,000 frames split further for the matrix.
- Hash per segment = sha1(JSON of all items intersecting it + component version + grade params).
- `placement.log.jsonl`: one line per decision: `{pass, beatId, decision, from, durationInFrames, reason, overrides:[...]}`.

### 11.14 Invariants (asserted in the Brain, re-checked by the validator)

I1 contiguity and total frames; I2 shot bounds 45..180 (Y2 45..149); I3 transition completes at cut frame; I4 no text beyond beat end minus 5; I5 text verbatim; I6 SFX spacing; I7 music volume cap and no music restart within a section; I8 asset reuse limits (never within 2,700 frames, max 2 uses); I9 layout family run length <= 2 (3 for hook sections under 2.2 s beats); I10 Y2 rules (no audio, credit present, one per source, not in grids); I11 every credit-requiring asset (CC BY, Pexels courtesy, Y1/Y2) appears in `credits`; I12 determinism: two runs with the same inputs and seed produce identical `timeline.json` (CI test).

### 11.15 Repair mode (QC feedback loop)

The QC pass (Section 15) returns actions per beat. The Brain applies them locally and re-runs only the affected passes:
- `swap-alternate`: replace asset from `alternates`, re-run P4 to P6 for that beat and neighbours (transition head padding may change), P11 for hashing.
- `move-text` / `drop-text`: re-run P7 for that beat, P9 (its pop SFX), P11.
- `change-layout`: re-run P4 to P11 for that beat and its two neighbours.
- `shorten` (rare, from human review): not allowed to move a cut off a word start; the Brain picks the nearest word start.
All repairs are logged; hashes decide which segments re-render.

### 11.16 Tests the Brain must ship with

Property tests (fast-check): random transcripts of 50 to 5,000 words with random gaps produce timelines satisfying I1 to I12. Golden tests: three real transcripts with committed `timeline.json` snapshots. Regression: the "40 cuts checked by eye" list from milestone M4 encoded as frame assertions.

---

# PART D: VALIDATION, RENDERING, AUDIO, QC, EFFECTS

## 12. VALIDATOR (independent of the Brain; exits non-zero before any render minute)

1. JSON Schema (Ajv) for `timeline.json` and `chunks.json`.
2. Invariants I1 to I12 recomputed from scratch.
3. Filesystem: every `media.src` exists; `ffprobe` duration >= needed + 0.2 s (video), `1920x1080` (or padded), `r_frame_rate 30/1`, `pix_fmt yuv420p`, no audio stream on prepared B-roll.
4. Text substrings verified against `transcript.json` (case and punctuation insensitive).
5. Transition durations 8..18 (0 for cut); no transition inside a chunk boundary.
6. `credits` completeness; Y2 clip list emitted to `report.md`.
7. Determinism: re-run Brain in-process and compare hashes.

## 13. RENDERING: SPEED TIERS (a 40 min video is 72,000 frames)

### 13.1 Tier 0: correct Remotion settings
- `<Video>` from `@remotion/media` for all clips. It auto-falls back to `<OffthreadVideo>` on undecodable codecs; prepared clips are H.264 yuv420p so it never fires; set `disallowFallbackToOffthreadVideo` in CI to fail fast.
- Pin `remotion` and every `@remotion/*` to one exact version.
- `--concurrency`: run `npx remotion benchmark src/index.ts Main --concurrencies=1,2,3,4` per runner type once; expect 2 on 4 vCPU.
- Multi-process Chrome on Linux is default since 4.0.137; keep it.
- Encoder: drafts `--codec h264 --crf 20 --x264-preset veryfast`; final `--x264-preset medium --crf 18`.
- `--timeout 120000`; avoid `ripple()`, WebGL LUTs, big blurs, `--gl=angle` on hosted runners (no GPU there).
- Preview: `--scale 0.5 --every-nth-frame 5 --x264-preset ultrafast`.

### 13.2 Tier 1: GitHub Actions matrix (free on public repos)
Facts: standard runners are free and unlimited for public repos and self-hosted runners; 6 h per job; 256 matrix jobs max; 20 concurrent jobs on the Free plan. Use `max-parallel: 18`, identical flags, `--frames=a-b`, GOP-aligned boundaries, `-c copy` concat.

### 13.3 Tier 2: hybrid FFmpeg + Remotion (biggest win)
55 to 70 percent of beats are FFmpeg-routable. FFmpeg builds those segments at 100 to 300 fps:
```bash
ffmpeg -y -i prepared/b_0001.mp4 -loop 1 -framerate 30 -t 3.5 -i prepared/b_0002.jpg -filter_complex "
 [0:v]fps=30,format=yuv420p[a];
 [1:v]zoompan=z='1+0.12*on/(30*3.5)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,format=yuv420p[b];
 [a][b]xfade=transition=fade:duration=0.4:offset=3.34[v0];
 [v0]eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04,vignette=PI/5,format=yuv420p[v]" \
 -map "[v]" -frames:v 195 -r 30 -c:v libx264 -preset veryfast -crf 18 -g 30 -keyint_min 30 -sc_threshold 0 -profile:v high -level 4.1 -pix_fmt yuv420p -an segments/seg_0007.mp4
```
Remotion segments: `npx remotion render src/index.ts Main segments/seg_0008.mp4 --props=timeline.json --frames=a-b --codec h264 --crf 18 --x264-preset veryfast --muted`, then a normalise pass to matching profile/level/GOP when `ffprobe` shows a mismatch. Concat: `ffmpeg -f concat -safe 0 -i list.txt -c copy video_only.mp4`; assert `nb_read_frames == durationInFrames`.

### 13.4 Tier 3: self-hosted runner on your PC (free, GPU, home IP for YouTube)
`npx remotion render --gl=angle-egl --chrome-mode=chrome-for-testing`; `--hardware-acceleration=if-possible --video-bitrate 12M` (no `crf` with NVENC); FFmpeg segments with `-c:v h264_nvenc -preset p5 -rc vbr -cq 19 -b:v 0 -g 30`. Jobs may run up to 5 days.

### 13.5 Tier 4: browser preview
`renderMediaOnWeb()` from `@remotion/web-renderer`, `licenseKey: "free-license"`. For section previews, not the 40 min final.

### 13.6 Incremental re-render
Segment hashes from the Brain; unchanged segments restored from the previous artifact or the self-hosted disk.

### 13.7 Engine alternative
HyperFrames (Apache 2.0). The `timeline.json` contract is renderer-agnostic; an adapter maps items to `data-composition-id` scenes.

## 14. AUDIO MIX (FFmpeg, once, seconds)

```bash
ffmpeg -y -i narration_norm.m4a -i assets/music/upbeat-corporate-01.mp3 -i assets/sfx/whoosh-soft-02.mp3 -i assets/sfx/pop-01.mp3 -filter_complex "
 [1:a]atrim=0:95,afade=t=in:d=1,afade=t=out:st=93.5:d=1.5,volume=0.14[m];
 [0:a]asplit=2[voice][sc];
 [m][sc]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[mduck];
 [2:a]adelay=3467|3467,volume=0.35[s1];
 [3:a]adelay=1333|1333,volume=0.30[s2];
 [voice][mduck][s1][s2]amix=inputs=4:normalize=0:dropout_transition=0,alimiter=limit=0.95[out]" -map "[out]" -c:a aac -b:a 192k mix.m4a
```
Delays are `from / 30 * 1000` ms from the same `timeline.json`. Final mux: `ffmpeg -i video_only.mp4 -i mix.m4a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart final.mp4`. Loudness target -14 LUFS integrated for YouTube (`loudnorm=I=-14:TP=-1:LRA=11` on the final mix).

## 15. QC LOOP

1. Stills: per broll item 2 frames (start + 8, midpoint), per text item 1 frame (from + 10); FFmpeg `-ss` for FFmpeg segments, `npx remotion still --frame=N` for Remotion segments; 640 px.
2. Contact sheets per section: `ffmpeg -pattern_type glob -i 'qc/sec_01/*.jpg' -filter_complex tile=6x5 qc/sec_01.sheet.jpg`.
3. Vision review in Claude Code with beat texts: `{beatId, issue: none|off-topic|watermark|text-cut|unreadable|black|duplicate|letterbox|credit-missing, action: ok|swap-alternate|move-text|drop-text|change-layout}`.
4. Brain repair mode (11.15), validator, re-render changed segments only.
5. Asserts: frame count; `blackdetect` no black run > 15 frames outside intentional cards; A/V sync at 3 points; loudness in range.

## 16. EFFECTS CATALOGUE

### 16.1 Layouts
`fullscreen-clip` (F), `fullscreen-image-kenburns` (F), `split-left-media-right-text`, `split-right-media-left-text`, `grid-2`, `grid-3`, `grid-4`, `pip-over-blur`, `quote-card`, `stat-counter`, `list-reveal`, `chapter-card`, `end-card`, `lower-third`, `comparison-split`, `device-frame`, `map-pin` (optional), `timeline-strip`, `typographic-card` (never-fail fallback, real words only). (F) = FFmpeg-routable when text is null and transition is cut or fade.

### 16.2 Transitions
Built in (`@remotion/transitions`): `fade`, `wipe` (8 directions), `slide` (4), `flip` (4, perspective), `clockWipe`, `iris`, `none`. Avoid `ripple` in CI; `cube` is paid.
Custom presentations: `cut`, `zoom-punch`, `whip-pan`, `glitch`, `luma-dissolve`, `push-blur`, `light-leak`, `film-burn`, `shutter`, `pixelate`.
FFmpeg `xfade` equivalents: `fade`, `wipeleft|wiperight|wipeup|wipedown`, `slideleft|slideright`, `circleopen`, `dissolve`, `pixelize`, `fadeblack`, `fadewhite`, `zoomin`.
Timings: `linearTiming({durationInFrames})` or `springTiming({config:{damping:200}})`; 8 to 18 frames (6 to 10 for punchy types).

Entering-shot wrapper (Option A, absolute timing):
```tsx
export const EnterWithTransition: React.FC<{item: BrollItem; children: React.ReactNode}> = ({item, children}) => {
  const f = useCurrentFrame(); const T = item.transitionIn.durationInFrames;
  const p = T === 0 ? 1 : interpolate(f, [0, T], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return <Presentation type={item.transitionIn.type} direction={item.transitionIn.direction} progress={p}>{children}</Presentation>;
};
// In Main.tsx each broll item is <Sequence from={item.from} durationInFrames={item.durationInFrames} layout="none"> with entering items stacked above exiting ones.
```

### 16.3 Motion
`none`, `ken-burns` (1.05 to 1.18, 9 anchors, zoom peak aligned to strongest word; FFmpeg `zoompan`), `parallax-drift`, `slow-zoom-out`, `handheld` (2 px noise), `speed-ramp` (constant `playbackRate` per shot), `freeze-end`.

```tsx
export const KenBurns: React.FC<{src:string; dur:number; zoom:number; to:[number,number]; peakFrame?:number}> = ({src,dur,zoom,to,peakFrame}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [0, dur], [0, 1], {extrapolateLeft:'clamp', extrapolateRight:'clamp', easing: Easing.inOut(Easing.cubic)});
  const s = 1 + (zoom - 1) * p;
  return <AbsoluteFill style={{overflow:'hidden'}}><Img src={staticFile(src)} style={{width:'100%',height:'100%',objectFit:'cover',transform:`scale(${s}) translate(${to[0]*4*p}%, ${to[1]*4*p}%)`}}/></AbsoluteFill>;
};
```

### 16.4 Text styles
`kinetic-bold`, `typewriter`, `highlight-marker`, `lower-third-name`, `big-number`, `caption-box`, `outline-stroke`, `gradient-fill`, `slide-up-mask`, `word-by-word-pop`. Positions: `lower-left|lower-center|lower-right|center|upper-left|upper-right|left-panel|right-panel`. 5 percent safe area; scrim over media. Fonts via `@remotion/google-fonts` (Inter, Bebas Neue, Playfair Display). Captions (off by default for 16:9 long-form): `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds: 1200})`, `white-space: pre`.

### 16.5 Colour grades (Remotion CSS / FFmpeg pairs, calibrated once with a test clip and stored in `grades.json`)
| Grade | Remotion | FFmpeg |
|---|---|---|
| clean-cool | `contrast(1.05) saturate(0.95)` + 4 percent blue overlay | `eq=contrast=1.05:saturation=0.95,colorbalance=bs=0.04` |
| warm-film | `sepia(0.12) contrast(1.08)` + grain | `eq=contrast=1.08,colorbalance=rs=0.05:bs=-0.04,noise=alls=6:allf=t` |
| teal-orange | two gradient overlays, `mix-blend-mode` | `colorbalance=rs=0.06:bs=0.08:rm=-0.03` |
| muted-documentary | `saturate(0.8) contrast(1.03)` | `eq=saturation=0.8:contrast=1.03` |
| high-contrast-bw | `grayscale(1) contrast(1.3)` | `hue=s=0,eq=contrast=1.3` |
| vibrant | `saturate(1.25) contrast(1.05)` | `eq=saturation=1.25:contrast=1.05` |
| night | `brightness(0.85)` + blue overlay | `eq=brightness=-0.06,colorbalance=bs=0.1` |
| vintage (archival) | `sepia(0.25) contrast(1.1)` + heavy grain + letterbox | `eq=contrast=1.1,colorbalance=rs=0.08:gs=0.03,noise=alls=12:allf=t` |
Always vignette (`vignette=PI/5`) and optional grain (6 to 10 percent).

### 16.6 Motion graphics
`stat-counter`, `progress-bar-top`, `arrow-callout`, `highlight-box`, `circle-reveal`, `underline-draw`, `icon-pop` (Lucide SVG), `particles-light`, `bar-chart-mini`, `checklist-tick`, `corner-credit` (for CC and Y2 clips).

### 16.7 SFX tags and anchors
Tags: `whoosh-soft`, `whoosh-hard`, `swoosh-short`, `pop`, `click`, `tick`, `impact-soft`, `glitch`, `camera-shutter`, `typewriter-key`, `riser-short`, `ding`, `counter-tick-loop`. Anchors: `transition-in`, `text-in`, `grid-cell`, `counter`, `beat-start`. 3 to 5 variants per tag, rotation enforced by the Brain.

### 16.8 Music tags
`upbeat-corporate`, `calm-piano`, `tension-drone`, `documentary-ambient`, `tech-minimal`, `hopeful-strings`; manifest carries `bpm` for loop points.

---

# PART E

## 17. SOUND AND MUSIC PACKS (free, commercially safe)
| Source | Licence | Use |
|---|---|---|
| Mixkit | Mixkit License (commercial OK) | manual |
| Kenney.nl audio | CC0 | bulk zips: clicks, pops, UI |
| YouTube Audio Library | free for YouTube videos; some need attribution | safest for YouTube output |
| Incompetech | CC BY 4.0 | credit in description |
| Freesound APIv2 | per-file CC; API free for NON-COMMERCIAL use only | personal projects only |
`build_sfx_pack.py`: `loudnorm=I=-16:TP=-1.5`, 48 kHz mono, leading silence trimmed, `manifest.json` `{tag,file,durationMs,source,license}`. Music: `loudnorm=I=-20`, stereo, `{mood,file,bpm,durationMs,source,license}`.

## 18. SKILL PACKAGE
```
ai-broll-editor/
├── SKILL.md                         # <500 lines, pushy description, workflow, pointers
├── references/ pipeline.md timing-contract.md brain.md effects-catalogue.md director-system.md sourcing.md youtube-policy.md render-playbook.md audio-mix.md troubleshooting.md
├── scripts/py/  transcribe_groq.py align_whisperx.py to_transcript_json.py emphasis.py source_assets.py score_clip.py pick_shot.py youtube_cc.py archive_org.py build_sfx_pack.py
├── scripts/ts/  ingest.ts transcribe_whispercpp.ts segment.ts direct.ts prepare_assets.ts brain/{index,cuts,emphasis,shots,transitions,quantise,text,motiongfx,sfx,music,route,log}.ts validate.ts ffmpeg_segments.ts normalize_segment.ts audio_mix.ts concat.ts qc_stills.ts chunks.ts
├── schemas/     transcript beats shotplan assets timeline chunks credits (.schema.json)
├── remotion/    src/Root.tsx src/Main.tsx src/types.ts src/components/{layouts,transitions,text,motion,grades,graphics}/ remotion.config.ts
├── assets/      sfx/ music/ fonts/ overlays/ + manifests
├── templates/job.yaml               # style preset, brand colours, fps, sources on/off, youtube:false, youtube_short_clip:false, captions:false, glossary, corrections
└── .github/workflows/render.yml
```
SKILL.md frontmatter:
```yaml
---
name: ai-broll-editor
description: End-to-end automated B-roll video editor using real stock and archival footage only. Use whenever the user provides narration, voiceover, podcast or talking-head audio (or video) and wants a finished, professionally edited video with B-roll clips and images, transitions, motion graphics, text overlays, sound effects, colour grading or captions rendered with Remotion (or HyperFrames). Trigger on "make a video from this audio", "add b-roll", "edit this voiceover", "faceless video", "documentary edit", "render with remotion", "fix the timing", "swap this clip", "re-render section 3", or any request to turn speech into an edited visual video, and for setting up or debugging the GitHub Actions render pipeline.
---
```
SKILL.md body must instruct: install `remotion-dev/skills` and read `/remotion-best-practices` before Remotion code; run stages in order; never bypass the Brain or the validator; read `references/brain.md` before touching placement; never generate AI images; treat YouTube per `references/youtube-policy.md`; finish with QC.

## 19. GITHUB ACTIONS WORKFLOW
```yaml
name: render
on:
  workflow_dispatch:
    inputs: { job_id: {required: true}, workers: {default: "18"}, runner: {default: "ubuntu-latest"} }
concurrency: { group: render-${{ inputs.job_id }}, cancel-in-progress: false }
env: { NODE_OPTIONS: --max-old-space-size=6144 }
jobs:
  plan:
    runs-on: ${{ inputs.runner }}
    outputs: { chunks: ${{ steps.c.outputs.chunks }} }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/cache@v4
        with: { path: ~/.cache/remotion, key: chrome-${{ hashFiles('package-lock.json') }} }
      - run: npx remotion browser ensure
      - run: npm run brain -- --job ${{ inputs.job_id }} && npm run validate -- --job ${{ inputs.job_id }}
      - id: c
        run: echo "chunks=$(node scripts/ts/chunks.js --job ${{ inputs.job_id }} --workers ${{ inputs.workers }} --route remotion)" >> $GITHUB_OUTPUT
      - run: node scripts/ts/ffmpeg_segments.js --job ${{ inputs.job_id }}
      - uses: actions/upload-artifact@v4
        with: { name: job-${{ inputs.job_id }}, path: work/${{ inputs.job_id }}, retention-days: 1, compression-level: 0 }
  render:
    needs: plan
    runs-on: ${{ inputs.runner }}
    strategy: { max-parallel: 18, fail-fast: false, matrix: { chunk: ${{ fromJSON(needs.plan.outputs.chunks) }} } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - uses: actions/cache@v4
        with: { path: ~/.cache/remotion, key: chrome-${{ hashFiles('package-lock.json') }} }
      - uses: actions/download-artifact@v4
        with: { name: job-${{ inputs.job_id }}, path: work/${{ inputs.job_id }} }
      - run: |
          npx remotion render src/index.ts Main work/${{ inputs.job_id }}/segments/${{ matrix.chunk.id }}.mp4 \
            --props=work/${{ inputs.job_id }}/timeline.json --frames=${{ matrix.chunk.fromFrame }}-${{ matrix.chunk.toFrame }} \
            --codec h264 --crf 18 --x264-preset veryfast --muted --concurrency 2 --timeout 120000 --log info
          node scripts/ts/normalize_segment.js work/${{ inputs.job_id }}/segments/${{ matrix.chunk.id }}.mp4
      - uses: actions/upload-artifact@v4
        with: { name: seg-${{ inputs.job_id }}-${{ matrix.chunk.id }}, path: work/${{ inputs.job_id }}/segments/${{ matrix.chunk.id }}.mp4, retention-days: 1 }
  finish:
    needs: render
    runs-on: ${{ inputs.runner }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { pattern: "*-${{ inputs.job_id }}*", merge-multiple: true, path: work/${{ inputs.job_id }} }
      - run: node scripts/ts/audio_mix.js --job ${{ inputs.job_id }}
      - run: node scripts/ts/concat.js --job ${{ inputs.job_id }}
      - run: node scripts/ts/qc_stills.js --job ${{ inputs.job_id }}
      - uses: actions/upload-artifact@v4
        with: { name: final-${{ inputs.job_id }}, path: [work/${{ inputs.job_id }}/final.mp4, work/${{ inputs.job_id }}/report.md, work/${{ inputs.job_id }}/credits.json], retention-days: 7 }
```
For a self-hosted GPU runner pass `runner: self-hosted` and add `--gl=angle-egl --chrome-mode=chrome-for-testing --hardware-acceleration=if-possible --video-bitrate 12M` (drop `--crf`). The `pre-source` stage (YouTube, Internet Archive downloads) runs only on `self-hosted`.

## 20. BUILD ORDER
M1 scaffold, pinned Remotion + `@remotion/media` `@remotion/transitions` `@remotion/captions` `@remotion/install-whisper-cpp` `@remotion/google-fonts`, Ajv, `npx skills add remotion-dev/skills`; 10 s hardcoded timeline renders.
M2 transcription A and B -> identical `transcript.json`; alignment; corrections; emphasis fields.
M3 segmenter; property tests.
M4 Brain P0 to P6 + validator with rule-based planner and colour-bar media; 3 min excerpt: 40 cuts verified by frame number in Studio.
M5 Brain P7 to P11 with placeholder assets; determinism test; placement log readable.
M6 Director via `claude -p`; 95 percent first-try schema validity.
M7 sourcing chain (Pexels, Openverse, Wikimedia, NASA, Internet Archive), scoring, in-point selection, prepare; 90 percent of beats >= threshold on a sample; zero duplicates.
M8 effects catalogue in order: fullscreen-clip, ken-burns, fade/wipe/slide/zoom-punch, kinetic-bold, split, grid-2/3/4, stat-counter, chapter-card, lower-third, corner-credit, grades, vignette/grain; `Showcase` composition renders every enum.
M9 hybrid routing + FFmpeg segments + grade parity; routed share >= 50 percent; seam check.
M10 GitHub Actions matrix + mix + concat + mux; 40 min sample under 40 min wall clock with 18 workers; A/V drift < 1 frame.
M11 QC loop + repair mode + incremental re-render; swap 10 clips and re-render only affected segments under 10 min.
M12 YouTube Y1 on self-hosted runner; Y2 behind the flag with all validator rules and the credits card.
M13 package skill; skill-creator evals (5 min audio, 40 min audio, targeted re-render).

## 21. TIME AND COST BUDGET (40 minute video, free path)
| Stage | Where | Wall clock | Cost |
|---|---|---|---|
| Ingest + loudnorm + RMS | runner | 1 to 2 min | 0 |
| Transcribe (Groq) + align (CPU) | runner | 1 + 3 to 5 min | 0 |
| Segment + chapters + shot plans (about 20 sections) | Claude Code | 5 to 10 min | subscription |
| Sourcing about 500 beats consolidated to about 150 clusters | runner | 5 to 12 min (Pexels paced: longer) | 0 |
| CLIP scoring about 1,500 frames | runner CPU | 3 to 5 min | 0 |
| Prepare assets | runner | 5 to 8 min | 0 |
| Brain + validator | runner | seconds | 0 |
| FFmpeg segments (about 60 percent of frames) | plan job | 4 to 8 min | 0 |
| Remotion segments (about 40 percent, 18 workers) | matrix | 8 to 15 min | 0 on public repo |
| Mix + concat + mux + asserts | finish | 2 to 3 min | 0 |
| QC + targeted re-render | Claude Code + matrix | 10 to 15 min | subscription |
| Total | | about 50 to 80 min, mostly unattended | 0 |

## 22. RISKS AND MITIGATIONS
- Relevance remains the industry's weak spot. Mitigation: concrete queries, consolidation with diverse picks, CLIP threshold by importance, alternates, in-point scoring, vision QC. Expect 10 to 20 percent swaps on abstract topics.
- No AI fallback means some abstract beats end on `typographic-card`; the Brain caps typographic cards at 15 percent of beats and spreads them (never two in a row) and the report lists them for manual asset drops into `assets/user/` (user-provided media are preferred over all sources when tagged to a beat).
- Groq daily audio cap: auto-fallback to whisper.cpp on 429.
- Pexels quota: consolidation, 12 s pacing, 24 h cache, apply for Pexels unlimited.
- YouTube: bot wall on CI, ToS on downloading, no length-based fair-use safe harbor. Y1 CC-only by default; Y2 opt-in with hard limits, credits and a pre-publish report. The skill is not legal advice; users decide.
- GitHub Free plan: 20 concurrent jobs (`max-parallel 18`), 500 MB artifact storage (`retention-days 1`), 6 h per job.
- Remotion licence: free up to 3 people; HyperFrames adapter path kept open.
- Angle GPU memory leak: chunking contains it.
- Grade seams between FFmpeg and Remotion segments: calibrated pairs in `grades.json`; QC checks seams.
- Whisper name errors: glossary prompt, `corrections.json`, vision QC on text frames.

## 23. SOURCES CONSULTED
Remotion docs (video-vs-offthreadvideo, media/video, performance, cli/render, benchmark, gl-options, cloud-gpu, hardware-acceleration, timeout, transitioning, transitions/transitionseries, captions/api, install-whisper-cpp/transcribe, client-side-rendering, license/pricing, license/faq, ai/skills); yuvraj108c/Remotion-Matrix-Renderer; heygen-com/hyperframes; m-bain/whisperX (+ issue #1247); console.groq.com/docs/model/whisper-large-v3-turbo; pexels.com/api/documentation; api.openverse.org; archive.org Prelinger FAQ; fair use articles (trademarkia, jdsupra, scoredetect, cbsnews Content ID); yt-dlp issue #15865; scenedetect.com; freesound API docs; GitHub Actions billing docs; prior art: Vidrush, Kapwing, FireCut, Magicroll, claude-remotion-skill, super-video-maker-skill, reelstack, opencut, vanta.

End of specification v3.
