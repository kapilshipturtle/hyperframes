# ci/ — vendored scripts for `.github/workflows/render.yml`

This directory is a **deliberate copy** of specific scripts from two Claude
Code skills (`documentary-broll`, `faceless-explainer`), NOT a symlink or
submodule pointing at `~/.claude/skills/`. That's on purpose: this repo gets
checked out fresh on a GitHub Actions runner, which has no access to a local
machine's Claude Code install — and that install's skill state is mutable
(`npx hyperframes skills update` can silently reinstall/revert scripts, as
happened once during this project's own development — see documentary-broll's
SKILL.md for the `transitions.mjs --registry` incident). Vendoring here means
this repo's render workflow behaves identically regardless of what's
installed locally.

**Trade-off, stated plainly:** this WILL drift from the real skills over time
if those scripts change and this copy isn't re-synced. That's an accepted,
known cost — the alternative (depending on local `~/.claude/skills/` state,
or scripting `npx hyperframes skills update` inside CI) was tried first and
rejected: it either doesn't exist as a documented CI-friendly path, or pulls
in a much deeper, harder-to-pin dependency tree (see git history / session
notes for the full reasoning). Re-sync manually when documentary-broll's
render-relevant scripts change in a way that matters to this workflow.

## What's vendored and why

**`documentary-broll/scripts/`** (this skill's own scripts, copied as-is):
- `verify-ci-parity.mjs` — fast (sub-second, no network) preflight run BEFORE
  `replay-media-choices.mjs` below. Checks `.hyperframes/beats.json`,
  `STORYBOARD.md`, and `.hyperframes/broll/*.json` are mutually consistent —
  catches an orphaned synthetic beat (e.g. a hand-built cold-open frame never
  registered in beats.json) in seconds instead of after several minutes of
  wasted footage downloads. Should already have passed locally before the
  push that triggered this workflow (see documentary-broll's SKILL.md
  "Mandatory pre-push gate"); this is a backstop, not the primary gate.
- `replay-media-choices.mjs` — the CI-specific script that rebuilds
  `.media/broll/` from `.hyperframes/broll/beat-*.json`'s cached `chosen`
  field (falling back to a fresh by-ID lookup if a cached CDN URL expired).
- `download-clip.mjs` — spawned by `replay-media-choices.mjs`.
- `heal-media-start.mjs`, `gen-cinematic-assets.mjs`,
  `inject-cinematic-layers.mjs`, `normalize-mix.mjs` — called directly by
  `render.yml`, same as a local Step 6 run would.
- `lib/run-log.mjs` — shared logger these all import.
- `lib/transitions.json` — this skill's own vendored transition registry
  (adds `whip-pan` on top of the shared 5 base types) — passed to
  `faceless-explainer/scripts/transitions.mjs` via `--registry`.

**`faceless-explainer/scripts/`** (a SHARED skill's scripts, copied as-is):
- `assemble-index.mjs`, `transitions.mjs` — the shared assembly/transition
  scripts documentary-broll itself calls via `../faceless-explainer/...` in a
  normal local run.
- `lib/storyboard.mjs`, `lib/dimensions.mjs`, `lib/assets.mjs`,
  `lib/tokens.mjs`, `lib/transition-registry.mjs`, `lib/pad-frame-duration.mjs`
  — that skill's own supporting modules, all Node-builtin-only, no further
  dependency chain.

**`faceless-explainer/media-use-shim/bgm.mjs`** — NOT a copy of the real
`media-use/audio/scripts/lib/bgm.mjs`. The real file pulls in a much deeper
chain (BGM generation via `heygen.mjs`/`python.mjs`/an ML music model) that
`assemble-index.mjs` doesn't actually need — it only calls one pure
constant-lookup function (`bgmDefaultVolume`) on the branch where
`audio_meta.json`'s `bgm` field is non-null. This shim reimplements just that
one function (copied verbatim from the real constants), avoiding vendoring
the whole BGM-generation dependency tree for a helper that's a two-line pure
function. See the shim file's own header comment.

## The `--registry` patch on `transitions.mjs`

The vendored copy of `faceless-explainer/scripts/transitions.mjs` here
includes documentary-broll's own small patch (an optional `--registry <path>`
flag overriding the default vendored transitions.json, so `render.yml` can
pass documentary-broll's own registry — the one with `whip-pan` — without
mutating the shared file). This patch is real and intentional, not drift from
the upstream skill — see documentary-broll's SKILL.md for the full reasoning
and the note about it reverting once already in the LIVE `~/.claude/skills/`
copy (a separate, mutable location from this vendored one).

## Re-syncing

If documentary-broll's or faceless-explainer's render-relevant scripts change
in a way that would affect a cloud render (a new required flag, a changed
output shape, a new script in the assembly chain), copy the updated file(s)
here and re-verify with a real end-to-end render before trusting `render.yml`
again — the same testing discipline used when these were first vendored
(a real project's `.hyperframes/broll/` cache replayed through the full
chain to a rendered MP4, not just a syntax check).
