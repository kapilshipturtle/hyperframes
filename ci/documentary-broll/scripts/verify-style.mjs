#!/usr/bin/env node
// verify-style.mjs — the gate that makes "edited like the reference channels"
// checkable instead of hoped for. Measures the PLAN (beats/transitions/
// overlays/sfx/punches/audio_meta) and, when a rendered MP4 is given, the
// RENDER (ffmpeg scene cuts, ebur128 loudness), then compares every number
// against the chosen profile's measured ranges (references/style-profiles.json).
//
// Plan-side metrics (no render needed, runs in seconds):
//   cuts/min, median/p90 shot length (beats + cutaways + punch-ins count as
//   visual changes), longest gap without a visual change, dissolve share and
//   duration, accent-transition share, transition-SFX share of cuts, mid-shot
//   SFX per minute, overlay density per minute, overlay enter-at spread,
//   punch-in share of shots, music bed present + level, ambience on/off,
//   vignette share, hook timings (first cut / first overlay / first SFX cut).
// Render-side (with --render <mp4>): ffmpeg scene-change count per minute
//   (sanity vs the plan), integrated LUFS / true peak vs profile mix target,
//   duration vs beats total.
// Output: one line per metric with PASS/WARN/FAIL and the target; exit 1 on
// any FAIL unless --soft. `--profile documentary`/none → checks only the
// legacy invariants (nothing about density) and always exits 0.
//
// Usage:
//   node verify-style.mjs --profile explainer-fast --beats .hyperframes/beats.json \
//     --transitions .hyperframes/transitions.json --overlays .hyperframes/overlays.json \
//     [--sfx-offsets .hyperframes/sfx-offsets.json] [--punches .hyperframes/punches.json] \
//     [--audio-meta audio_meta.json] [--storyboard STORYBOARD.md] [--render renders/final.mp4] [--soft] [--log <path>]
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { loadProfile, isExplainerProfile } from "./lib/style-profile.mjs";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => { const i = argv.indexOf(`--${name}`); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def; };
const argv = process.argv.slice(2);
// --profile omitted → read .hyperframes/style-profile.json (written at the run-shape question via
// suggest-style-profile.mjs --confirm); absent → legacy/no profile.
let profileName = flag(argv, "profile", null);
if (!profileName && existsSync(".hyperframes/style-profile.json")) { try { profileName = JSON.parse(readFileSync(".hyperframes/style-profile.json", "utf8")).profile || null; } catch {} }
const profile = loadProfile(profileName);
const rd = (p) => (p && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null);
const beats = rd(flag(argv, "beats", ".hyperframes/beats.json"))?.beats;
if (!beats) { console.error("✗ verify-style: --beats is required"); process.exit(1); }
const trans = rd(flag(argv, "transitions", ".hyperframes/transitions.json")) || { transitions: [] };
const overlays = rd(flag(argv, "overlays", ".hyperframes/overlays.json")) || {};
const sfx = rd(flag(argv, "sfx-offsets", ".hyperframes/sfx-offsets.json")) || {};
const punches = rd(flag(argv, "punches", ".hyperframes/punches.json")) || {};
// frame-flags.json carries the per-shot grade / bw / vignette / gradeContrast decisions.
// It was NOT loaded here before, which is exactly why a film could ship with zero
// graded shots and still pass every check in this script.
const flags = rd(flag(argv, "flags", ".hyperframes/frame-flags.json")) || {};
const audioMeta = rd(flag(argv, "audio-meta", "audio_meta.json"));
const sb = existsSync(flag(argv, "storyboard", "STORYBOARD.md")) ? readFileSync(flag(argv, "storyboard", "STORYBOARD.md"), "utf8") : "";
const render = flag(argv, "render", null);
const soft = argv.includes("--soft");
// --defects-only: run ONLY the checks that represent an outright defect (black /
// near-black video), and exit non-zero on any of them regardless of --soft. Style
// targets (cuts/min, overlay density, LUFS...) are judgement calls and stay
// advisory; a black frame never is. Added 2026-09-07 after 21.3 s of black shipped
// through a gate that was continue-on-error + --soft + `|| true`.
const defectsOnly = argv.includes("--defects-only");
// Only genuine DEFECTS belong here — a check in this set hard-fails regardless of
// its own `fail` flag. "render very-dark frame share" was in this set and kept
// failing a film that is legitimately dark, even after the row itself was made
// advisory: the output literally printed "not a defect (void share 0.0%)" and then
// failed the run anyway. Darkness is a style choice; a VOID frame (dark AND no
// highlight anywhere) and actual black video are the defects.
const DEFECT_CHECKS = new Set(["render black-frame share", "render VOID frame share (dark with no highlight)"]);
let defectFails = 0;

const total = beats.reduce((a, b) => a + b.durationSeconds, 0); const mins = total / 60;
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };

// visual change events: beat starts (cuts), cutaways (storyboard "cutaway at Xs"), punch-ins
const changes = []; let t = 0; const shotLens = [];
beats.forEach((b, i) => {
  const ov = overlays[b.id] || {};
  const cut = sb.match(new RegExp(`## Frame ${String(i + 1).padStart(2, "0")}[^#]*?cutaway at ([\\d.]+)s`))?.[1];
  const pu = punches[b.id]?.at;
  const marks = [0, cut ? Number(cut) : null, pu != null ? Number(pu) : null].filter((x) => x != null).sort((a, b) => a - b);
  for (let k = 0; k < marks.length; k++) { const end = k + 1 < marks.length ? marks[k + 1] : b.durationSeconds; shotLens.push(end - marks[k]); changes.push(t + marks[k]); }
  t += b.durationSeconds;
});
const gaps = changes.slice(1).map((c, i) => c - changes[i]);
const cutsPerMin = beats.length / mins;
const transTypes = trans.transitions.slice(1).map((s) => String(s).split(" ")[0]);
const dissolveTypes = new Set(["crossfade", "blur-crossfade", "film-dissolve", "push-slide", "squeeze", "iris", "dip-to-black"]);
const accentTypes = new Set(["glitch-cut", "light-leak-flash", "whip-pan", "zoom-through", "paper-tear"]);
const dissolveShare = transTypes.filter((x) => dissolveTypes.has(x)).length / Math.max(1, transTypes.length);
const accentShare = transTypes.filter((x) => accentTypes.has(x)).length / Math.max(1, transTypes.length);
const dissolveDur = med(trans.transitions.slice(1).map((s) => Number(String(s).match(/([\d.]+)s/)?.[1] || 0)).filter((d) => d > 0));
const cues = Object.entries(sfx).flatMap(([n, m]) => Object.entries(m).map(([k, v]) => ({ n: Number(n), cue: k.split("#")[0], ...(typeof v === "number" ? { offset_s: v } : v) })));
const transCues = cues.filter((c) => c.stem === "transition" || (c.offset_s === 0 && /whoosh|glitch|paper|swell/.test(c.cue)));
const midCues = cues.filter((c) => !transCues.includes(c) && c.cue !== "typewriter");
const ovEntries = Object.values(overlays).filter((o) => o && o.archetype && o.archetype !== "none");
const ovPerMin = ovEntries.length / mins;
const enterAts = ovEntries.map((o) => Number(o.enterAt ?? 0.4));
const punchShare = Object.keys(punches).length / Math.max(1, beats.length);
const bedOn = Boolean(audioMeta?.bgm?.path);
const bedVol = audioMeta?.bgm?.volume;
// vignette share: count built frames carrying the vignette layer (robust), fall back to storyboard mentions
const framesDir = "compositions/frames";
const vignetteFrames = existsSync(framesDir) ? readdirSync(framesDir).filter((f) => /\.html?$/.test(f) && readFileSync(`${framesDir}/${f}`, "utf8").includes("broll-vignette clip")).length : 0;
const vignetteShare = (vignetteFrames || (sb.match(/vignette/g) || []).length) / Math.max(1, beats.length);
const firstOverlayAt = (() => { let tt = 0; for (const b of beats) { const o = overlays[b.id]; if (o && o.archetype && o.archetype !== "none") return tt + Number(o.enterAt ?? 0.4); tt += b.durationSeconds; } return null; })();
const firstSfxCutAt = (() => { let tt = 0; for (let i = 0; i < beats.length; i++) { if (transCues.some((c) => c.n === i + 1)) return tt; tt += beats[i].durationSeconds; } return null; })();

const rows = []; let fails = 0;
const check = (name, value, range, { unit = "", fmt = (v) => (typeof v === "number" ? v.toFixed(2) : String(v)), fail = true } = {}) => {
  let status = "INFO";
  if (range && value != null) {
    const [lo, hi] = range; const ok = value >= lo && value <= hi;
    const near = value >= lo * 0.85 && value <= hi * 1.15;
    status = ok ? "PASS" : near ? "WARN" : fail ? "FAIL" : "WARN";
    // A defect check is binary: outside the range is a FAIL, never softened to WARN.
    if (DEFECT_CHECKS.has(name) && !ok) { status = "FAIL"; defectFails++; }
    else if (status === "FAIL") fails++;
  }
  if (defectsOnly && !DEFECT_CHECKS.has(name)) return;
  rows.push({ name, value, status, target: range ? `${range[0]}–${range[1]}${unit}` : "—" });
  console.log(`${status.padEnd(4)}  ${name.padEnd(38)} ${value == null ? "n/a" : fmt(value)}${unit}${range ? `   (target ${range[0]}–${range[1]}${unit})` : ""}`);
};

console.log(`verify-style: profile=${profile ? profile.name : "none"}  beats=${beats.length}  ${total.toFixed(0)}s`);
const P = isExplainerProfile(profile) ? profile : null;
check("cuts (beats) per minute", cutsPerMin, P?.cuts.true_cuts_per_min);
check("visual changes per minute", changes.length / mins, P ? [P.cuts.true_cuts_per_min[0], P.cuts.true_cuts_per_min[1] + 6] : null);
check("median shot length", med(shotLens), P?.cuts.median_shot_s, { unit: "s" });
check("p90 shot length", pct(shotLens, 0.9), P?.cuts.p90_shot_s, { unit: "s" });
check("longest gap without a change", Math.max(...gaps, 0), P?.beats.watchdog_s ? [0, P.beats.watchdog_s * 1.3] : null, { unit: "s" });
check("dissolve share of boundaries", dissolveShare, P?.transitions.dissolve_share != null ? [Math.max(0, P.transitions.dissolve_share - 0.05), P.transitions.dissolve_share + 0.06] : null);
check("dissolve duration (median)", dissolveDur, P?.transitions.dissolve_duration_s ? [P.transitions.dissolve_duration_s * 0.6, P.transitions.dissolve_duration_s * 1.6] : null, { unit: "s" });
// accents live at section boundaries on templates (accents_at_section_boundaries) — the expected share is the
// number of section starts over the cut count, not a fixed percentage
const sectionsFile = existsSync(".hyperframes/sections.json") ? (JSON.parse(readFileSync(".hyperframes/sections.json", "utf8")).sections || []) : [];
const expectedAccent = P ? Math.max(P.transitions.accent_share || 0, P.transitions.accents_at_section_boundaries ? Math.max(0, sectionsFile.length - 1) / Math.max(1, beats.length - 1) : 0) : 0;
check("accent transition share", accentShare, P ? [0, expectedAccent + 0.03] : null);
// transition_sfx:false means OFF BY DEFAULT + opt-in per run (transition_sfx_optin),
// not "must always be zero" — a run that answered yes places motivated cues, so the
// bound is the profile's ceiling either way. Before this, opting in tripped a FAIL
// against [0, 0.001] while the placement check right below it passed, giving two
// contradictory verdicts for the same number.
// Small-N guard, same fix as plan-sfx.mjs's cue budget (ISS-0014): a SHARE is
// meaningless on a short film. An 8-beat clip has 7 cuts, so a 12 % ceiling allows
// 0.84 cues and two genuinely-motivated section-boundary accents read as 29 %.
// Allow a 3-cue absolute floor before the share binds. plan-sfx already refuses to
// write any cue that cannot name an editorial reason, so this is a density backstop.
const sfxCeil = P ? Math.max(P.transitions.sfx_max_share ?? 0.12, 3 / Math.max(1, beats.length - 1)) : 0.12;
check("transition SFX share of cuts", transCues.length / Math.max(1, beats.length - 1), P ? (P.transitions.transition_sfx_optin || P.transitions.sfx_mode === "motivated-only" ? [0, sfxCeil] : P.transitions.transition_sfx === false ? [0, 0.001] : P.transitions.sfx_mode === "motivated" ? [0, (P.transitions.sfx_max_share || 0.15) + 0.05] : [(P.transitions.hard_cut_sfx_share || 0) - 0.1, (P.transitions.hard_cut_sfx_share || 0) + 0.12]) : null);
check("mid-shot SFX per minute", midCues.length / mins, P?.sfx.mid_shot_per_min);
check("overlays per minute", ovPerMin, P?.overlays.density_per_min);
check("overlay enter-at (median)", med(enterAts), P?.overlays.enter_at_s, { unit: "s" });
check("punch-in share of shots", punchShare, P ? [Math.max(0, P.punch.share_of_shots - 0.05), P.punch.share_of_shots + 0.06] : null);
check("music bed present", bedOn ? 1 : 0, P && P.music.enabled !== "ask" ? (P.music.enabled ? [1, 1] : [0, 0]) : null, { fmt: (v) => (v ? "yes" : "no") + (bedVol != null ? ` (vol ${bedVol})` : "") + (P && P.music.enabled === "ask" ? " (asked per run)" : "") });
check("vignette share of beats", vignetteShare, P?.look.vignette_share, { fail: false });

// --- PHASE 7 checks: the dimensions that let the 2026-09-06 regression ship ---
// Each of these was invisible to this script before, which is why a film could sit
// "inside the profile" while having 0 graded shots, every card in one position, and
// half the punch density of the references.
{
  const flagVals = Object.values(flags || {});
  const n = beats.length || 1;
  // 1. grade share — measured 60/15/13/6.3/5.7 pooled; per-profile in look.grade_share
  if (P?.look?.grade_share) {
    const graded = flagVals.filter((f) => f && (f.grade || f.bw)).length;
    const wantGraded = 1 - (P.look.grade_share.natural ?? 0.6);
    check("graded shot share", graded / n, [Math.max(0, wantGraded - 0.10), Math.min(1, wantGraded + 0.10)]);
    const hcShare = flagVals.filter((f) => f && f.gradeContrast).length / n;
    if (P.look.high_contrast_share != null) check("high-contrast share", hcShare, [Math.max(0, P.look.high_contrast_share - 0.10), P.look.high_contrast_share + 0.10], { fail: false });
  }
  // 2. overlay placement spread — the middle row was entirely missing before
  if (P?.overlays?.placement_share) {
    const placed = Object.values(overlays).filter((o) => o && o.placement);
    const distinct = new Set(placed.map((o) => o.placement)).size;
    check("distinct overlay placements", distinct, [4, 9]);
    const popShare = placed.length ? placed.filter((o) => o.entrance === "pop-scale").length / placed.length : 0;
    if (P.overlays.pop_scale_share != null) check("pop-scale entrance share", popShare, [Math.max(0, P.overlays.pop_scale_share - 0.10), P.overlays.pop_scale_share + 0.12], { fail: false });
  }
  // 3. punch steps per punched shot — references average 2.05-2.38
  {
    const pv = Object.values(punches || {}).filter((x) => x && (x.at != null || x.steps));
    if (pv.length) {
      const steps = pv.reduce((a, x) => a + (Array.isArray(x.steps) ? x.steps.length : 1), 0);
      check("punch steps per punched shot", steps / pv.length, [1.2, 2.6], { fail: false });
    }
  }
  // 4. transition-SFX share is checked once, above (the ceiling applies whether the
  //    run opted in or not). plan-sfx.mjs owns the stronger guarantee: it refuses to
  //    write a cue that has no editorial reason, so this is a backstop, not the gate.
}
check("first cut at", beats[0]?.durationSeconds, P?.hook.first_cut_s ? [0, P.hook.first_cut_s] : null, { unit: "s", fail: false });
check("first overlay at", firstOverlayAt, P?.hook.first_overlay_s ? [0, P.hook.first_overlay_s] : null, { unit: "s", fail: false });
check("first SFX-on-cut at", firstSfxCutAt, P?.hook.first_sfx_cut_s ? [0, P.hook.first_sfx_cut_s] : null, { unit: "s", fail: false });

if (render && existsSync(render)) {
  const sc = spawnSync("ffmpeg", ["-hide_banner", "-i", render, "-vf", "select='gt(scene,0.30)',showinfo", "-an", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
  const nCuts = (sc.match(/pts_time:/g) || []).length;
  const dur = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", render], { encoding: "utf8" }).stdout) || total;
  const eb = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
  const last = (k) => { const m = eb.match(new RegExp(`${k}:\\s*(-?[\\d.]+)`, "g")); return m ? Number(m[m.length - 1].split(":")[1]) : null; };
  console.log(`--- render: ${render} (${dur.toFixed(1)}s)`);
  check("render scene cuts per minute", nCuts / (dur / 60), P ? [P.cuts.true_cuts_per_min[0] * 0.8, P.cuts.true_cuts_per_min[1] * 1.3] : null);
  check("render integrated LUFS", last("I"), P ? [P.mix.integrated_lufs - 2, P.mix.integrated_lufs + 2] : [-16, -12], { unit: " LUFS" });
  check("render true peak", last("Peak"), [-30, P ? P.mix.true_peak_dbtp + 0.3 : -0.7], { unit: " dBTP", fail: false });
  check("render duration vs beats", dur - total, [-3, 3], { unit: "s", fail: false });

  // --- BLACK / BRIGHTNESS (added 2026-09-07 after 21.3 s of black shipped) ---
  // A 193-beat film rendered 12 black spans (2.8 % of runtime) because its 9
  // invented scenes were built on a near-black ground (mean luma 10-16/255) while
  // its 184 footage beats sat at ~115. Nothing in the CI path could catch it:
  // qc-cascade.mjs (which names blackdetect in its docstring) is never invoked by
  // the workflows, and this script had no pixel-brightness check at all.
  // Reference films measure 4.8 % near-black frames INCLUDING genuinely dark shots.
  const bd = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", render, "-vf", "blackdetect=d=0.20:pix_th=0.10", "-an", "-f", "null", "-"], { encoding: "utf8" }).stderr || "";
  const blackSpans = [...bd.matchAll(/black_start:\s*([\d.]+)\s+black_end:\s*([\d.]+)\s+black_duration:\s*([\d.]+)/g)]
    .map((m) => ({ start: Number(m[1]), end: Number(m[2]), duration: Number(m[3]) }));
  const blackSeconds = blackSpans.reduce((a, b) => a + b.duration, 0);
  check("render black-frame share", dur > 0 ? blackSeconds / dur : 0, [0, 0.02]);
  if (blackSpans.length) {
    const worst = [...blackSpans].sort((a, b) => b.duration - a.duration).slice(0, 6);
    console.log(`    black spans (${blackSpans.length}, ${blackSeconds.toFixed(1)}s total): ${worst.map((b) => `${b.start.toFixed(1)}-${b.end.toFixed(1)}s`).join(", ")}`);
    console.log(`    → map each to its beat (cumulative beat durations); a dark invented scene or a frame with no media is the usual cause`);
  }
  // whole-film mean luma, sampled at 1 fps — cheap, and catches a film that is
  // uniformly murky rather than spot-black.
  // A dark frame and an EMPTY frame are different defects, and only one is a bug.
  // Measured 2026-09-07 on a film about darkness ("you couldn't see your own hand"):
  // beat 03 sits at mean luma 17.9 and beat 02 at 28.7 — deliberately, and both still
  // carry real highlights (YMAX 122.7 and 255: silhouette edges, a lamp flame). A
  // pure luma threshold called that a defect and would have blocked the render,
  // making the subject unfilmable. The altair-doc failure was different in kind: its
  // invented scenes had NO bright content anywhere — a hole in the film.
  // So the blocking test is VOID frames (dark AND no highlight), not dark frames.
  const lm = spawnSync("ffmpeg", ["-v", "error", "-i", render, "-vf", "fps=1,scale=64:36,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-,metadata=print:key=lavfi.signalstats.YMAX:file=-", "-an", "-f", "null", "-"], { encoding: "utf8" });
  const lumaTxt = `${lm.stdout || ""}`;
  const lumas = [...lumaTxt.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const maxes = [...lumaTxt.matchAll(/YMAX=([\d.]+)/g)].map((m) => Number(m[1]));
  if (lumas.length) {
    const meanLuma = lumas.reduce((a, b) => a + b, 0) / lumas.length;
    const darkShare = lumas.filter((v) => v < 40).length / lumas.length;
    // void = the frame is dark AND has no highlight to read detail from
    const pairs = lumas.map((y, i) => [y, maxes[i] ?? 255]);
    const voidShare = pairs.filter(([y, mx]) => y < 40 && mx < 80).length / pairs.length;
    check("render mean luma", meanLuma, [40, 190], { fail: false });
    check("render very-dark frame share", darkShare, [0, 0.35], { fail: false });
    check("render VOID frame share (dark with no highlight)", voidShare, [0, 0.02]);
    if (darkShare > 0.08 && voidShare <= 0.02) {
      console.log(`    ${(darkShare * 100).toFixed(0)}% of frames are dark but carry highlights — legitimate for dark subject matter, not a defect (void share ${(voidShare * 100).toFixed(1)}%)`);
    }
  }
}
logIfRequested(argv, "verify-style", `profile ${profile ? profile.name : "none"}: ${fails} FAIL`, Object.fromEntries(rows.map((r) => [r.name, `${r.status} ${typeof r.value === "number" ? r.value.toFixed(2) : r.value} (target ${r.target})`])));
if (defectFails) {
  console.error(`\n✗ verify-style: ${defectFails} DEFECT check(s) failed — black or near-black video in the render.`);
  console.error(`  This is not a style target: black frames are always a bug. Usual cause is an invented scene built on a`);
  console.error(`  dark ground (see sub-agents/invented-scene-worker.md "Palette") or a frame with no media element.`);
  console.error(`  Map each black span to its beat with cumulative beat durations, fix that frame, then re-render.`);
  process.exit(1);
}
if (defectsOnly) { console.log("✓ verify-style --defects-only: no black/near-black video defects"); process.exit(0); }
if (fails && !soft && P) { console.error(`✗ verify-style: ${fails} metric(s) outside the ${P.name} profile — fix the plan (or pass --soft to warn only)`); process.exit(1); }
console.log(fails ? `⚠ verify-style: ${fails} FAIL (soft mode)` : "✓ verify-style: all measured metrics inside the profile");
