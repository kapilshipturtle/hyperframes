# YouTube policy: two tiers, the honest version

Source: spec-v3 section 8.7, in full. Read this before setting
`youtube: true` or `youtube_short_clip: true` in `job.yaml`.

## This is not legal advice

The skill and its README state this plainly: nothing here is legal advice.
The user decides what to publish. The skill's job is to make the limits
hard, the credits automatic and the report complete so that decision is
informed.

## Legal reality

US fair use is decided on four factors: purpose and character (including
transformativeness and commerciality); nature of the work; amount and
substantiality relative to the whole; effect on the market. There is no rule
that clips under 5, 7 or 10 seconds are automatically fair use. A court
found a two-second on-screen use actionable in Hirsch v. CBS, and Prince
sent takedowns over six-second Vine clips. YouTube's Content ID matches on
length and proportion as a proxy and cannot see context, so short clips can
still be claimed. YouTube's Terms of Service also prohibit downloading
content except where YouTube provides the means.

Keeping clips very short, using only as much as needed to illustrate a point
made in the narration, adding on-screen source attribution, never using the
clip's audio, never using the "heart" of a work, and not substituting for the
original all strengthen a fair-use posture. None of them guarantees it.

## Tier Y1 (default when `youtube: true`)

- Only `videoLicense=creativeCommon` results from the Data API.
- Clips up to 6.0 s (180 frames).
- Attribution card at the end and a small corner credit during the clip.
  CC BY requires credit.
- Listed in `credits.json` and in the final credits card.

## Tier Y2 (only when `youtube_short_clip: true` is set by the user, per job)

Non-CC results allowed. Hard limits enforced by the validator (I10) and the
Brain (P4 rule 10):

- Duration strictly less than 5.0 s: 149 frames maximum, 45 minimum.
- Original audio always dropped (prepared clips have no audio stream; the
  validator checks with ffprobe).
- One clip per source video per project (`sourceVideoId`).
- Never from music videos, film trailers, sports broadcasts or content
  flagged "Made for Kids" (Data API `contentDetails` and `status`).
- The beat must contain narration that comments on or describes what the
  clip shows: the Brain requires CLIP intent score >= 0.30 against the beat
  text.
- Corner credit `Source: <channelTitle>` for the whole clip duration.
  Grid cells are not allowed for Y2 (the credit would be unreadable).
- Every Y2 asset is listed in `credits.json` and rendered on a final credits
  card.
- The job report (`report.md`) lists all Y2 clips so the user can remove any
  before publishing.

If the beat is longer than 149 frames, the remainder gets the next-best
stock alternate. The Y2 clip never stretches.

## Both tiers: home machine only

YouTube downloads run only on the user's home machine (self-hosted runner or
the `pre-source` CLI `scripts/py/youtube_cc.py`). Never on hosted CI runners.

Why: in 2026 YouTube scores IP reputation and requires a Proof-of-Origin
token from its BotGuard JavaScript. Data-centre and CI IPs frequently get
"Sign in to confirm you're not a bot". yt-dlp requires a JavaScript runtime
(Deno) for YouTube now. Install Deno on the home machine before running the
stage.

## Implementation

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

Skip the source after 90 s or any error. The pipeline never blocks on
YouTube. A beat that fails YouTube continues down the chain to the
typographic card.

`YOUTUBE_API_KEY` is optional. Without it the YouTube stage is skipped
regardless of the job toggles, and the report says so.

## Checklist before enabling Y2

- [ ] The user asked for it explicitly for this job.
- [ ] The user has read this file (or the SKILL.md summary of it).
- [ ] The narration in the target beats actually describes what the clip
      shows.
- [ ] The user knows the report will list every Y2 clip and that removing
      one is a `swap-alternate` repair, not a manual edit.
