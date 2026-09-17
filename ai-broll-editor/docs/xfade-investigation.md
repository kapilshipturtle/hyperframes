# The FFmpeg xfade failure — what was measured, and what was ruled out

**Status: UNRESOLVED.** Fades are routed to Remotion as a workaround
(`FFMPEG_TRANSITIONS` in `scripts/ts/brain/route.ts`). This note exists so the
next attempt does not repeat the six runs already spent.

## The symptom

Six consecutive CI renders of the `worldeconomy` job failed at
**FFmpeg segments (Tier 2)**, always identically:

```
[Parsed_xfade_36 @ 0x…] Failed to configure output pad on Parsed_xfade_36
[fc#0 @ 0x…] Error reinitializing filters!
Failed to inject frame into filter network: Invalid argument
error: ffmpeg … exited 234
```

Always `seg_0012` — the largest FFmpeg segment (1109 frames, 8 items).

## Ruled out, with evidence

| Hypothesis | Why it was wrong |
|---|---|
| **The xfade chain is too long** | `Parsed_xfade_36` is ffmpeg's GLOBAL filter index, not the 36th xfade. An 8-item segment builds ~64 per-stream filters before the first xfade, so 36 *is* the first one. Chain-splitting was implemented, never fired, and was reverted. |
| **zoompan drops frames on short sources** | Measured directly: 400 frames requested, 400 produced. `d=1` passes frames through 1:1 and preserves the count. |
| **tpad has too little headroom** | Padding was raised to a full second past the shot. No change to the error. |
| **A 10-frame segment can't host a 12-frame fade** | Real: the 30-frame snap in `buildSegments` was starving the previous segment. **Fixed** (`seg_0006` went 10 → 30 frames) and the guard is worth keeping — but the failure persisted. |
| **The exiting stream is trimmed to a zero-frame margin** | Real: `trim=end_frame=400` ended at exactly the offset+duration the xfade needed. **Fixed** (margin 0 → +12 frames). Failure persisted, because after a `concat` the accumulated length is the SUM of trims and lands back on the boundary. |
| **A 1-microsecond float rounding error** | Real and measured from the printed graph: accumulated 322 frames = `10.733333 s`, xfade needed `10.733334 s`, margin **−1e-6 s**. `framesToSeconds` now floors at 6 dp and the offset is nudged half a frame (margin → +16.7 ms). **Failure still persisted.** |

Every one of those was a genuine defect, and each fix is still in place and
tested. None of them was the cause.

## What is known for certain

* The Brain's output is sound: the timeline validates, all 12 invariants pass,
  and the Remotion path renders the same timeline without complaint.
* It is specific to the FFmpeg Tier-2 path and to the largest segment.
* It is NOT reproducible locally: this machine ships ffmpeg 4.2.7, which has no
  `xfade` filter at all. Every local check was arithmetic on the generated
  graph, never an execution of it. **That is the single biggest reason six
  attempts failed** — the graph could be inspected but never run.

## What to do next

1. **Run the real command against ffmpeg 6.** The workflow now prints every
   filtergraph via `--dry-run` before executing (see
   `FFmpeg segments — print graphs`). Copy `seg_0012`'s command out of a run log
   and execute it on a machine with a modern ffmpeg, bisecting the graph until
   the minimal failing case is found. Do not theorise further without this.
2. Suspect the interaction between `xfade` and what precedes it in the chain
   (`zoompan`, `tpad`, `trim`, `setpts`) rather than the offset arithmetic,
   which has now been verified correct three separate ways.
3. Only then flip `FFMPEG_TRANSITIONS` back to `["cut", "fade"]`.
