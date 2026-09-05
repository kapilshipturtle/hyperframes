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
const audioMeta = rd(flag(argv, "audio-meta", "audio_meta.json"));
const sb = existsSync(flag(argv, "storyboard", "STORYBOARD.md")) ? readFileSync(flag(argv, "storyboard", "STORYBOARD.md"), "utf8") : "";
const render = flag(argv, "render", null);
const soft = argv.includes("--soft");

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
    if (status === "FAIL") fails++;
  }
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
check("accent transition share", accentShare, P ? [0, P.transitions.accent_share + 0.03] : null);
check("transition SFX share of cuts", transCues.length / Math.max(1, beats.length - 1), P ? [P.transitions.hard_cut_sfx_share - 0.1, P.transitions.hard_cut_sfx_share + 0.12] : null);
check("mid-shot SFX per minute", midCues.length / mins, P?.sfx.mid_shot_per_min);
check("overlays per minute", ovPerMin, P?.overlays.density_per_min);
check("overlay enter-at (median)", med(enterAts), P?.overlays.enter_at_s, { unit: "s" });
check("punch-in share of shots", punchShare, P ? [Math.max(0, P.punch.share_of_shots - 0.05), P.punch.share_of_shots + 0.06] : null);
check("music bed present", bedOn ? 1 : 0, P ? (P.music.enabled ? [1, 1] : [0, 0]) : null, { fmt: (v) => (v ? "yes" : "no") + (bedVol != null ? ` (vol ${bedVol})` : "") });
check("vignette share of beats", vignetteShare, P?.look.vignette_share, { fail: false });
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
}
logIfRequested(argv, "verify-style", `profile ${profile ? profile.name : "none"}: ${fails} FAIL`, Object.fromEntries(rows.map((r) => [r.name, `${r.status} ${typeof r.value === "number" ? r.value.toFixed(2) : r.value} (target ${r.target})`])));
if (fails && !soft && P) { console.error(`✗ verify-style: ${fails} metric(s) outside the ${P.name} profile — fix the plan (or pass --soft to warn only)`); process.exit(1); }
console.log(fails ? `⚠ verify-style: ${fails} FAIL (soft mode)` : "✓ verify-style: all measured metrics inside the profile");
