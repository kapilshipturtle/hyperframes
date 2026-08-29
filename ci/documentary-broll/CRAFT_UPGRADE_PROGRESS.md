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
- [ ] G3 `map-locate` archetype
- [ ] G4 `map-timelapse` archetype
- [ ] G5 Per-video geo spine (shared projection/basemap/palette)
- [ ] G6 `map-zoom-chain` archetype
- [ ] G7 `map-flow` archetype
- [ ] G8 Upgrade `geo-route-map` to real lat/lon + Bezier + hold-and-label
- [ ] G9 `satellite-wipe` archetype
- [ ] G10 Basemap style tokens
- [ ] G11 New Pass-1 hook signals (spatial-extent, geo-change)
- [ ] G12 Map-consistency self-check (Step 5)
- [ ] G13 Pulsing-marker/symbol-scaling shared primitives

## Sound design
- [ ] S1 Scene-aware ambience beds (sceneClass, crossfaded, always on)
- [ ] S2 Split SFX question into 3 (ambience/foley, whooshes, overlay cues)
- [ ] S3 Ambience J-cut (`--ambience-lead`)
- [ ] S4 Sparse diegetic foley accents
- [ ] S5 Non-diegetic tension kit (drone/riser/impact/sub-drop)
- [ ] S6 `--audio-hold` deliberate silence flag
- [ ] S7 Keyframed BGM duck
- [ ] S8 Document stem model in audio-mix.md
- [ ] S9 Sound-perspective ±3dB nudge by shot size
- [ ] S10 Ambience-bed library expansion (nature/wetland set)
- [ ] S11 Reverb/space differentiation interior/exterior
- [ ] S12 Log ambience/foley/tension cues in run log

## Motion graphics / data-viz
- [ ] M1 `area-shrink` archetype
- [ ] M2 `line-chart-reveal` archetype
- [ ] M3 `scale-compare` archetype
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
