# Craft upgrade pass — progress tracker

Working branch: `craft-upgrade-pass1`. Do NOT merge to `main` until every item
below is checked AND a full real GitHub Actions render succeeds with the
final state. Each item gets built, then verified locally (small synthetic
composition, per this session's established testing method), before moving
to the next. Vendored `ci/` copies only get synced once the skill-copy
version is locally verified.

Legend: `[ ]` not started · `[~]` in progress · `[x]` done + locally verified · `[S]` synced to ci/ + committed

## Map / geography
- [x] G1 `scripts/lib/geo/` — TopoJSON (world + US atlas) + inline projection helper (real data, 3 self-tests passing: topojson-lite.mjs, projection.mjs, geo-data.mjs)
- [x] G2 `map-region-fill` archetype (real Florida geometry tested, throws on bad region name, registered in ARCHETYPES + DEFAULT_OVERLAY_SFX)
- [x] G3 `map-locate` archetype (real Everglades/Florida test + full-US fallback test + bad-coords error test all passing)
- [x] G4 `map-timelapse` archetype (4-step Florida test passing, error-path tested)
- [x] G5 Per-video geo spine (shared projection/basemap/palette) — documented in overlays.md as a Step-3 discipline, picking-guide triggers updated for map-locate/map-region-fill/map-timelapse
- [x] G6 `map-zoom-chain` archetype (real viewBox-tween zoom, found+fixed a real 411KB->122KB size issue via basemap decimation, verified zoom-box math unchanged after the fix)
- [x] G7 `map-flow` archetype (found+fixed a real coordinate-space/angle-math bug during dev, verified straight-line angle math correct: vertical line -> 90deg)
- [x] G8 Upgrade `geo-route-map` to real lat/lon + Bezier + hold-and-label (backward-compat with old x/y verified unbroken, real Everglades journey test confirms correct N/S ordering)
- [x] G9 `satellite-wipe` archetype (same slot-based convention as comparison-wipe, verified; reference.md fully updated for G6/G7/G9 too, was missed earlier — now caught up)
- [x] G10 Basemap style tokens (BASEMAP_STYLE constant, verified shared across map-region-fill/map-locate/map-zoom-chain via resolved CSS output check)
- [x] G11 New Pass-1 hook signals (spatial-extent, geo-change) — SKILL.md hook table updated, date-or-place candidate list extended
- [x] G12 Map-consistency self-check (Step 5) — 5th self-check added, fence-balance verified even (54)
- [x] G13 Pulsing-marker/symbol-scaling shared primitives (pulseMarkerCSS/pulseMarkerJS/symbolScale, wired into map-locate, verified byte-for-byte identical timing to pre-refactor)

## Sound design
- [x] S1 Scene-aware ambience beds — gen-cinematic-assets.mjs now supports --scene-classes (7 distinct procedural ffmpeg recipes: neutral/water/wind-open/forest/wetland-night/urban-machinery/interior), default no-flag call verified byte-identical to pre-change behavior, spectral distinction verified via real ffprobe/astats measurements (26dB gap on source files)
- [ ] S2 Split SFX question into 3 (ambience/foley, whooshes, overlay cues)
- [x] S3 Ambience J-cut — new build-scene-ambience.mjs stitches per-class beds with real crossfades + a configurable lead-in via ffmpeg concat demuxer + per-boundary acrossfade splices. Found+fixed 2 real bugs during dev testing (fade direction was backwards; compensation math broke on 3+ segments via naive chaining) by actually measuring output duration/spectral content at each step, not trusting arithmetic. Verified correct for 1/2/3/4-segment cases, no audible click artifacts at splice points (confirmed via astats scan), correct error handling on gaps.
- [x] S4 Sparse diegetic foley accents — 3rd sfx: category documented in SKILL.md Step 6, gated by S2's ambience/foley question, low-volume footage-motivated bullets
- [x] S5 Non-diegetic tension kit (drone/riser/impact/sub-drop) — documented in S2's run-shape answer text (HeyGen-resolved cue names, max 2-4/film, separate from routine overlay cues)
- [x] S6 apply-audio-holds.mjs — generic V-shaped volume-dip script (works on any audio file, any timestamps, JSON-driven), tested on a plain synthetic track (not project-specific), verified real dip+restore behavior via volumedetect + overlap-rejection error path
- [x] S7 Keyframed BGM duck — new build-bgm-duck.mjs, generic (reads any beats.json, works on any BGM file), lifts in real inter-beat gaps derived free from existing timing data. Found+fixed 2 real bugs (ffmpeg volume-filter chains are multiplicative not override; MP3-concat-into-single-encode produced silence gaps, fixed via WAV intermediate) plus caught my own -ss-before-i measurement methodology bug (imprecise seek gave false-negative readings) along the way. Verified correct with accurate post-input seeking, error-path and no-gap-fallback tested.
- [x] S8 Document stem model in audio-mix.md — full 5-stem table (VO/ambience/foley/music/graphic-cues) with real levels, cross-referenced to the new S1/S6/S7 scripts
- [x] S9 Sound-perspective ±3dB nudge by shot size — documented with explicit dependency note (needs E4's shot-size classification, not yet built); honestly marked as designed-not-wired rather than falsely complete
- [x] S10 Ambience-bed library expansion — done via S1's 7 procedural recipes (water/forest/wind-open/wetland-night/urban-machinery/interior/neutral), real spectral distinction verified
- [x] S11 Reverb/space differentiation interior/exterior — new apply-space-reverb.mjs (interior/exterior/open via ffmpeg aecho), verified via real duration-extension measurement (echo tail confirmed present and genuinely different per space)
- [ ] S12 Log ambience/foley/tension cues in run log

## Motion graphics / data-viz
- [x] M1 `area-shrink` archetype (subject-agnostic block-shrink, sqrt-area-correct scaling verified at 50%/100%/0%, error path tested)
- [x] M2 `line-chart-reveal` archetype (traveling dot + leg tweens verified, error paths tested)
- [x] M3 `scale-compare` archetype (sqrt-area ratio math verified exact, negative-value error path tested)
- [ ] M4 `proportion-block` archetype
- [ ] M5 `annotation-draw` archetype
- [ ] M6 `callout-leader` archetype
- [ ] M7 `cross-section` archetype
- [ ] M8 `species-card` archetype
- [ ] M9 `counter-clock` archetype
- [ ] M10 `area-chart-stack` archetype
- [ ] M11 `morph-bridge` archetype
- [ ] M12 Extend Pass-1 signal table (trend/scale/spatial/rate/species/mechanism)
- [ ] M13 Document staggered-hierarchy rule
- [ ] M14 Extend verify-overlays.mjs for new archetypes

## Editing rhythm / cuts
- [ ] E1 Multi-shot beats by default (`--shots` generalization)
- [ ] E2 Step 3 fetches top-N candidates for long beats
- [ ] E3 `hard-cut` transition (0s)
- [ ] E4 Shot-size classification (wide/medium/close/detail)
- [ ] E5 Shot-size rhythm rule + Step 5 self-check
- [ ] E6 Content-driven transition duration
- [ ] E7 `sections.json` film-level act structure
- [ ] E8 Cut-on-motion heuristic
- [ ] E9 Per-section pacing arc
- [ ] E10 Rewrite J/L-cut exclusion scoping (narration only)
- [ ] E11 Reframe cutaway guidance (failure-mode framing)
- [ ] E12 Ban same-transition-type across 3-boundary window incl. sections

## Cinematography simulation
- [ ] C1 Motion-energy probe per clip (static/slow/active)
- [ ] C2 Slow push-in/drift on static clips only
- [ ] C3 Seeded handheld drift for static clips
- [ ] C4 Simulated focus pull (blur tween)
- [ ] C5 Overlay parallax (0.3-0.5x footage drift)
- [ ] C6 Automated portrait-detection gate for 2.5D parallax
- [ ] C7 Bake grain into ffmpeg encode
- [ ] C8 Vignette strength derived from tone
- [ ] C9 Motivated-Ken-Burns direction self-check

## Typography
- [ ] T1 `title-sequence` archetype
- [ ] T2 `location-stamp` archetype
- [ ] T3 `end-card` archetype
- [ ] T4 Film-level type system (2 faces, size ladder)
- [ ] T5 `section-divider` archetype
- [ ] T6 Lower-third re-introduction rule
- [ ] T7 Per-word weighting in key-phrase
- [ ] T8 Ask for film title/subtitle in run-shape questions

## Color
- [ ] K1 Per-clip technical normalization (signalstats)
- [ ] K2 `--grade-envelope` mode
- [ ] K3 Two new presets (verdant, bleached)
- [ ] K4 Tie overlay accent hues to grade direction
- [ ] K5 Recommend grading on by default when ≥3 providers
- [ ] K6 Document technical/creative split

## NLE-parity additions
- [ ] P1a hard-cut (dup of E3)
- [ ] P1b `dip-to-color` transition
- [ ] P1c `film-dissolve` / `additive-dissolve` variants
- [ ] P1d `luma-wipe` transition
- [ ] P1e `iris` transition
- [ ] P1f `light-leak-flash` transition
- [ ] P1g `glitch-cut` transition (rare/deliberate only)
- [ ] P1h `page-turn`/3d-flip family
- [ ] P1i content-driven duration (dup of E6)
- [ ] P2a Exit animations per archetype (in/out slots)
- [ ] P2b Loop/idle animation slot for persistent archetypes
- [ ] P2c Per-character animation mode
- [ ] P2d Expose `ease` param per overlay call
- [ ] P2e Document responsive-design contract per archetype
- [ ] P2f Text-on-a-path for map labels
- [ ] P3a Freeze-frame + hold
- [ ] P3b Speed ramp / slow-motion
- [ ] P3c Animated clip-path/SVG mask shapes
- [ ] P3d Lightweight particle layer
- [ ] P3e Document layer/z-index stacking model
- [ ] P3f CSS 3D depth for multi-plane graphics
- [ ] P4a Real .cube LUT support
- [ ] P4b Scope-style QC measurement (luma/sat/temp outliers)
- [ ] P4c Curve-based grading (ffmpeg curves filter)
- [ ] P4d Masked/regional grade
- [ ] P5a Audio crossfade between ambience beds (dup of S1 prereq)
- [ ] P5b Audio content-type tagging
- [ ] P5c Volume automation envelopes
- [ ] P5d Content-aware ducking (dup of S7)
- [ ] P5e Per-track EQ/compression
- [ ] P5f Reverb differentiation (dup of S11)
- [ ] P5g Expand SFX library (dup of S10)
- [ ] P6a Archival treatment preset
- [ ] P6b Bake grain (dup of C7)
- [ ] P6c Light-leak/flare overlay seasoning
- [ ] P6d Glow/bloom on highlights
- [ ] P6e Focus-pull blur (dup of C4)
- [ ] P6f Halation
- [ ] P6g Chromatic aberration at frame edges

## Final validation
- [ ] All items above checked
- [ ] Full local synthetic-composition render passes (no crashes, no lint errors)
- [ ] Vendored ci/ copies synced and diffed clean
- [ ] Commit + push to craft-upgrade-pass1
- [ ] Trigger real GitHub Actions render on 1documentary with `--workers 10`
- [ ] Confirm real render succeeds before merging to main
