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
- [x] M4 `proportion-block` archetype (100-dot grid, filled-count verified exact at pct=47, error path tested)
- [x] M5 `annotation-draw` archetype (circle/arrow/underline, deterministic seeded wobble, found+fixed same coordinate-space bug class as map-flow before shipping, all 3 shapes + error path tested)
- [x] M6 `callout-leader` archetype (elbowed leader line, edge-aware label direction routing verified for both quadrant cases)
- [x] M7 `cross-section` archetype (vertical/horizontal layer diagram, tone-palette colors, layer-count error path tested)
- [x] M8 `species-card` archetype (real IUCN Red List status validation, both error paths tested)
- [x] M9 `counter-clock` archetype (rate-ticking counter, endValue math verified exact, zero-rate error path tested)
- [x] M10 `area-chart-stack` archetype (stacked composition-over-time, stack-sum validation + array-length-mismatch validation both tested)
- [x] M11 `morph-bridge` (honestly scoped: a shared morphBridgeAnchor() helper + documented convention, NOT full universal per-archetype wiring — explicit tradeoff note in the code rather than a false "fully wired" claim; extend a specific archetype pair when a real beat needs it)
- [x] M12 Extend Pass-1 signal table (trend/scale/spatial/rate/species/mechanism) — 6 new signals, full reference-doc table/SFX/picking-guide entries for all 11 new M-archetypes
- [x] M13 Document staggered-hierarchy rule — new overlays.md section citing real old+new archetype examples
- [x] M14 Extend verify-overlays.mjs for new archetypes — real per-archetype validation for all 11, tested end-to-end (fail + pass cases both confirmed)

## Editing rhythm / cuts
- [x] E1 Multi-shot beats by default — reframed the existing cutaway mechanism from "rare bonus" to "actively look on every 6s+ beat" in SKILL.md's Step 5 cutaway paragraph, tied directly to E2's new wider-pool flag so a real second candidate is actually available to find. Documents the honest limit too: only when a real second candidate exists in the pool, never forced.
- [x] E2 Step 3 fetches top-N candidates for long beats — fetch-clips.mjs: every provider adapter already accepted a `perPage` param (default 6) but main() never wired it to a CLI flag; added real `--per-page N` flag, threaded through both the video and photo job-dispatch blocks. Verified via live Openverse API calls (no key needed): default call unchanged (6 candidates, same top pick), `--per-page 15` call genuinely returns 15 candidates with the same top pick preserved — real API test, not a mock. SKILL.md Step 3 documents `--per-page 12` for beats ≥6s.
- [x] E3 `hard-cut` transition (0s) — registered in transitions.json (verified-supported tokens only, real token-substitution test confirms zero leftover placeholders), wired into a new `mixed-cuts` --style pool via weaveHardCuts() (every-3rd-boundary stride, never touches boundary 0), sfxCueFor explicitly silences it (a whoosh would defeat a hard-cut's point). Real script invocation tests: mixed-cuts count=15 correct pattern, plain mixed/whip-pan-accent/error-path all unaffected (regression-tested).
- [~] E4 Shot-size classification (wide/medium/close/detail) — HONESTLY SCOPED: no CV/detection model exists in this pipeline to classify shots mechanically. Folded into E5 as a prose editorial judgment call (same category as tone/archetype-fit — this skill's established pattern for judgment that can't be scripted) rather than building a fake classifier. See E5.
- [x] E5 Shot-size rhythm rule + Step 5 self-check — new 6th self-check in SKILL.md (alongside the existing 5: archetype variety/stat-callout/typewriter/tone/map-consistency), flags 4+ consecutive same-size-feel beats as the failure mode (mirrors the archetype-variety check's own pattern exactly). Fence-balance re-verified (56, unchanged), "5 checks" cross-reference elsewhere in the file corrected to "6 checks".
- [~] E6 Content-driven transition duration — DEFERRED: real per-beat duration needs shot-size/motion-energy data this pass doesn't have yet (see E4/C1, both honestly deferred/scoped-down for the same reason). Doing it blindly would be a fake/cosmetic version. Revisit after C1 (motion-energy probe) ships, if it does this pass.
- [x] E7 `sections.json` film-level act structure — new Step 2 pass in SKILL.md (one read over beats.json's texts, marks real act pivots — setup/escalation/turning-point/resolution or whatever the actual film's shape is, not a forced template), written as `.hyperframes/sections.json` with contiguous startBeat/endBeat + a coarse `arc` label. MECHANICALLY enforced, not just prose: new optional `--sections` flag on verify-overlays.mjs validates gap-free/overlap-free/full-coverage — tested against 5 real cases (valid/gap/overlap/short-coverage/no-flag-baseline), all correct. Added to the committed-CI-artifacts list alongside beats.json.
- [x] E8 Cut-on-motion heuristic — documented in Step 5 as a soft per-beat nudge (candidate description implies motion-at-clip-start → prefer a snappier transition type), honestly scoped as NOT a real CV motion detector (none exists in this pipeline — same honest limit as E4).
- [x] E9 Per-section pacing arc — documented in Step 5: vary --intensity by section's `arc` (calm/rising/peak/settling) instead of one flat --intensity for the whole film, via either per-section pick-transitions.mjs calls concatenated in order, or a manual soften/sharpen pass on the picks that fall in a disagreeing section.
- [x] E10 Rewrite J/L-cut exclusion scoping (narration only) — checked the EXISTING Scope-section text (SKILL.md line 22) against what E10 asks for: it already correctly scopes the exclusion to narration-desync specifically (not a blanket "no J/L-cut-like effects"), already names the video-side crossfade as the compatible analog. No rewrite needed — verified already correct, not skipped.
- [x] E11 Reframe cutaway guidance (failure-mode framing) — same edit as E1: the cutaway paragraph now opens by naming the real failure mode from a real run (long beats defaulting to a static full-duration hold because cutaway was treated as rare) before giving the mechanism, matching this skill's established "name the failure mode, not just the feature" pattern used elsewhere (invented-scene, stat-callout placement).
- [x] E12 Ban same-transition-type across 3-boundary window incl. sections — pickSequence()'s no-repeat check widened from adjacent-only (lookback=1) to lookback=min(3, pool.length-1), still deterministic, still correctly degrades on single-type pools. Verified via real invocation: mixed/mixed-cuts count=15 outputs both have zero same-type repeats within any 3-wide window. Sections half (now that E7 exists): documented as a manual seam-check when per-section pick-transitions.mjs calls are concatenated (E9) — the in-script window can't see across a concatenation boundary it doesn't know exists, so this is a prose check at the seam, not a script gate.

## NLE-parity — done alongside E3/E12 (same file, same test pass)
- [x] P1a hard-cut — see E3 above (this is the same item, not a separate implementation)
- [x] P1b `dip-to-black` transition — shipped as `dip-to-black`, NOT the originally-planned generic `dip-to-color`: found+fixed a real bug before testing (an earlier draft referenced a `__DIPCOLOR__` token and a `#dip-scrim-__T__` DOM element that the real shared injector, ci/faceless-explainer/scripts/transitions.mjs's buildGsap(), does not support — confirmed by reading its actual token substitution list: only __OLD__/__NEW__/__T__/__DUR__/__DX__ family exist, no new-DOM-element mechanism at all). Rebuilt to use only real supported tokens — fades __OLD__ out to reveal the composition's own black canvas, holds, fades __NEW__ in. Verified via real resolveDur()/buildGsap() simulation: zero leftover tokens, valid GSAP lines. Honestly scoped in its own registry note: arbitrary-color dips (white/red) are NOT buildable without a shared-injector change, out of scope for this pass.

## Cinematography simulation
- [x] C1 Motion-energy probe per clip (static/slow/active) — new probe-motion.mjs, real ffmpeg signalstats YDIF (per-frame luma diff) measurement, NOT a heuristic. Real discrimination test: static synthetic clip → avgYdif=0 exactly, gentle-motion clip → 0.578 ("slow"), busy-motion clip → 3.7-6.7 ("active") — 3-way classification confirmed via 3 distinct real ffmpeg-generated test clips. Error path (missing file) and too-short-to-sample edge case both tested.
- [x] C2 Slow push-in/drift on static clips only — build-frame.mjs: new --motion-class flag, wired into pickKenBurns as the ONE deliberate exception to "video always gets none" (only fires on motionClass==="static"). Tested: no-flag baseline unchanged, --motion-class active stays "none" (unaffected), --motion-class static genuinely applies motion — all via real script invocations, output HTML inspected.
- [x] C3 Seeded handheld drift for static clips — same flag/mechanism as C2 (alternates push-in/handheld-drift deterministically per beatId, no Math.random). Found+fixed a real bug before shipping: initial code referenced `beatId` inside kenBurnsTween(), which never receives that parameter — caught by the FIRST real test run (not by code review), fixed by reseeding from durationS instead. Handheld drift verified: 2-waypoint sine.inOut wander, both legs present and correctly timed in real output.
- [x] C4 Simulated focus pull (blur tween) — new --focus-pull <seconds> flag on build-frame.mjs: brief defocus-then-resolve on the media element(s), timed to resolve exactly at the given timestamp. Tested: valid mid-beat pull (correct 2-stage timing), both invalid-range error paths (>=duration, <=0), no-flag baseline (zero filter occurrences, fully unaffected), near-start clamp (rackStart floors at 0 instead of going negative), and the parallax dual-layer case (both fg/bg media get the tween). Honestly scoped as a RARE deliberate call, not a texture layer.
- [x] C5 Overlay parallax (0.3-0.5x footage drift) — ALREADY EXISTED pre-this-pass (gen-depth-layers.py + build-frame.mjs --parallax-fg/--parallax-bg, real MiDaS depth-split with documented scene-vs-portrait limitation) — verified still correct, no changes needed beyond C6 below.
- [x] C6 Automated portrait-detection gate for 2.5D parallax — gen-depth-layers.py: real OpenCV Haar-cascade face detection runs BEFORE the expensive MiDaS pass, calibrated face-area-fraction threshold, new "portraitWarning" JSON field + --skip-portrait-gate escape hatch. Tested: negative cases confirmed correct (random/blurred image and solid-color image both correctly return no warning), cascade file existence/load confirmed, exception-safety confirmed (never blocks the run on a cascade issue). NOTE: no true-positive (real face photo) test was possible in this sandbox (no network access to fetch a real test image) — the detection call itself is standard, long-established OpenCV Haar cascade usage, not novel code, so this is a real but incomplete test — flag for a real-photo smoke test on the next actual run with photo beats.
- [x] C7 Bake grain into ffmpeg encode — HONEST SCOPE NOTE: grain was ALREADY shipped pre-this-pass, but via a different real mechanism than the item's literal wording — gen-cinematic-assets.mjs + inject-cinematic-layers.mjs composite a real grain-overlay.mp4 as a native HyperFrames render-engine `<video mix-blend-mode:overlay>` layer, not a post-render ffmpeg filter. Functionally equivalent outcome (grain genuinely present in every rendered frame), different mechanism (engine compositing, not an ffmpeg encode-pass filter) — no redundant second grain path was built; documented here instead of silently claiming the literal item or silently ignoring it.
- [x] C8 Vignette strength derived from tone — SKILL.md's existing --vignette guidance already tied strength to mood loosely; tightened to explicitly reference the SAME tone vocabulary (urgent/solemn/warm/cool/neutral) used by the overlay layer and scene-ambience classes, with a concrete strength range per tone band.
- [x] C9 Motivated-Ken-Burns direction self-check — new 7th Step-5 self-check: tallies how many photo beats passed --kenburns-focus vs. skipped it, flags "skipped most/all" as the same shortcut-under-pressure failure mode the invented-scene/stat-callout checks already catch. "6 checks" cross-reference updated to "7 checks".

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
- [~] Vendored ci/ copies synced and diffed clean — FIRST REAL SYNC DONE this checkpoint: confirmed render.yml only actually invokes 5 scripts + transitions.json from ci/documentary-broll/ (replay-media-choices.mjs, heal-media-start.mjs, gen-cinematic-assets.mjs, inject-cinematic-layers.mjs, normalize-mix.mjs, scripts/lib/transitions.json — everything else, incl. pick-transitions.mjs/overlays.mjs/SKILL.md/geo lib, runs locally during the editorial pass, never in CI, so correctly doesn't need vendoring). Diffed all 5 scripts + the registry: only gen-cinematic-assets.mjs (S1's scene-class recipes) and transitions.json (this checkpoint's hard-cut/dip-to-black) had drifted — both now copied over and byte-diff-confirmed clean, syntax/JSON-parse verified post-copy. Still marked [~] not [x]: this was a manual diff-and-copy pass, not yet re-verified after EVERY remaining category (E/C/T/K/NLE-parity) ships — re-diff before final merge.
- [ ] Commit + push to craft-upgrade-pass1
- [ ] Trigger real GitHub Actions render on 1documentary with `--workers 10`
- [ ] Confirm real render succeeds before merging to main
