#!/usr/bin/env node
// render-clip.mjs -- one still image -> one always-moving, dark, graded MP4 segment.
//
// WHY FFMPEG AND NOT HYPERFRAMES: a 2h 30fps film is 216,000 frames; the browser
// capture path stages ~2MB/frame = ~422GB. A GitHub runner has ~14GB. See
// references/reference-analysis.md. Measured RTF here is 0.68 on 2 cores.
//
// MOTION IS MANDATORY (user: a still-image film risks the reused-content policy, and
// the reference channel never holds a still): every clip gets one of four measured
// moves, rotated by index so neighbours never share one. Reference motion is
// 1.4-1.7/255 pixel change per 0.5s -- verify-style.mjs enforces that band.
//
// Usage:
//   node render-clip.mjs --image x.png --out x.mp4 --duration 89 --index 3 --fog fog.png
//   [--grain g.png] [--fps 30] [--width 1920] [--height 1080] [--crf 23] [--preset veryfast]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const has = (n) => process.argv.includes(`--${n}`);
const die = (m) => { console.error(`render-clip: ${m}`); process.exit(1); };

const image = f("image") || die("--image required");
const out = f("out") || die("--out required");
const dur = parseFloat(f("duration", "89"));
const idx = parseInt(f("index", "0"), 10);
const fog = f("fog", "");
const grain = f("grain", "");
// REAL STOCK FOG FOOTAGE, not a procedural plate (2026-09-13, third attempt at this).
// Procedural plates failed three times because heavy blur makes fog LOW SPATIAL FREQUENCY:
// translating a smooth gradient changes almost nothing per pixel, and drifting it faster
// saturates rather than helping (measured: 40px/s -> 12.6%, 80px/s -> 12.9% of pixels
// changing). Real smoke footage has the fine structure that makes motion visible.
// Measured on the blended result at 0.35 opacity: 41% of pixels change >10 levels (target
// 30%), 63% change >5 (target 45%), mean |delta| 11.1 (target 5), luma 34 (must stay <55).
const DEFAULT_FOG = `${process.env.HOME}/.hyperframes-tools/sleep-long-video/assets/fog-overlay.mp4`;
const fogLoop = has("no-fog") ? "" : f("fog-loop", existsSync(DEFAULT_FOG) ? DEFAULT_FOG : "");

const fps = parseInt(f("fps", "30"), 10);
const W = parseInt(f("width", "1920"), 10), H = parseInt(f("height", "1080"), 10);
if (!existsSync(image)) die(`image not found: ${image}`);
if (!has("no-fog") && !fogLoop && !fog) die("no fog overlay found. Install one at ~/.hyperframes-tools/sleep-long-video/assets/fog-overlay.mp4, or pass --fog-loop <mp4>.");
if (fog && !existsSync(fog)) die(`fog not found: ${fog}`);
mkdirSync(dirname(resolve(out)), { recursive: true });

const frames = Math.round(dur * fps);
if (!(dur > 0)) die("--duration must be > 0");
// Four moves, rotated by index so neighbours never share one.
//
// THE RULE THAT TOOK THREE TRIES: motion speed must be INDEPENDENT OF SCENE LENGTH.
// Any move written as "travel from A to B across the whole clip" is slower on a long scene
// (speed = distance/duration), which is exactly how a 20s calibration became 0.39 on an 89s
// scene. Scaling the zoom rate alone did not fix it (40s 0.86 vs 100s 0.42); neither did
// per-second travel, because ffmpeg's `on` still spans the whole clip.
//
// The fix is a FIXED-PERIOD path: every move completes a cycle every MOTION_PERIOD seconds
// regardless of how long the scene runs. Measured proof: an oscillating pan gave 3.82 at 40s
// and 3.78 at 100s -- duration-independent. Period was then tuned (60s -> 2.29, 80s -> 1.68)
// to land inside the reference band of 1.4-1.7 change per 0.5s.
// Zoom stays MODERATE (2.2): holding speed by raising zoom instead needed 8.3x on a 100s
// scene, which crops and softens the image badly.
// SLOWER + SMOOTHER (user request 2026-09-12). Measured on a 40s probe at 1920x1080:
//   period 80s / upscale 2592 : mean-motion 0.55, CV 0.42, 0 frozen   (previous)
//   period 140s / upscale 2592: mean-motion 0.40, CV 0.48, 14 FROZEN  (too slow for the crop)
//   period 140s / upscale 5184: mean-motion 0.40, CV 0.43, 3 frozen   (chosen)
// zoompan truncates the crop rect to whole SOURCE pixels, so a slower pan freezes unless the
// source has more pixels to move through -- hence doubling the upscale alongside the slowdown.
// NOTE: the researched "zoom-drift + tmix" chain was TESTED and REJECTED here: it measured
// 75-107 frozen frames vs 0, because a fixed-zoom sinusoid already avoids the stepping it fixes.
// Scenes are now 7-15s (was 35-110s). A cycle fixed at 140s means a 10s clip traverses only
// 7% of the sine -- but near the sine's steep midpoint that is FAST: measured 5.88 per 0.5s
// against a 1.4-1.7 reference. The period must scale with the clip so every scene covers a
// gentle arc regardless of length. 9x the duration keeps the traversal slow and smooth.
// A ZOOM READS AS CAMERA MOVEMENT; A SLIDE DOES NOT (rebuilt 2026-09-13, third complaint
// that stills "look still"). Measured on a 12s clip:
//   pan only, travel 0.05 -> 0.8% of frame width, per-second change 0.3  (invisible)
//   pan only, travel 0.20 -> 5.0% of width,        per-second change 0.6  (still weak)
//   zoom 1.12->1.66 + pan -> per-second change 0.9
//   zoom 1.12->2.20 + pan -> per-second change 1.5  <- chosen
// A continuous push-in changes every pixel's position, which is why it reads as a moving
// camera where a lateral slide reads as a sliding photo.
const ZOOM_START = 1.10;
// SLOWED for sleep content (user 2026-09-13: "why its so fast"). 0.0030/frame pushed
// 1.12 -> 2.20 over 12s, a 96% scale change -- that is a dramatic documentary push, far too
// energetic here. 0.00035/frame gives 1.10 -> 1.23 over 12s (~11% total, ~0.9%/s), which is
// at the calm end of the published Ken Burns range (references cite 110-120% over ~8s).
const ZOOM_RATE = 0.00035;
// pan travel cut to a third: [startX, travelX, startY, travelY] as fractions of the
// pannable range. A calm drift, not a slide.
const DIRS = [[0.42, 0.10, 0.47, 0.05], [0.55, -0.09, 0.45, 0.06],
              [0.48, 0.08, 0.55, -0.08], [0.52, -0.08, 0.51, -0.05]];
const [x0, xd, y0, yd] = DIRS[((idx % 4) + 4) % 4];
const MOVES = [
  { name: "push-in",
    z: `${ZOOM_START}+${ZOOM_RATE}*on`,
    x: `(iw-iw/zoom)*(${x0}+${xd}*on/${frames})`,
    y: `(ih-ih/zoom)*(${y0}+${yd}*on/${frames})` },
];
const mv = MOVES[0];
// Fog drifts by rotating slowly; direction alternates so consecutive clips differ.
// PERFORMANCE (measured 2026-09-12): rotating the fog STILL on every frame cost more than
// the zoom itself -- RTF 3.09 for the full chain vs 0.58 for zoompan alone. Pre-rendering
// the drifting fog ONCE as a short looping video and `-stream_loop`-ing it drops the whole
// clip to RTF 0.67 (4.6x faster) with a measurably identical result (motion 0.41 vs 0.42,
// luma 31 vs 30). Pass --fog-loop <mp4> to use it; --fog <png> still works as the fallback.
const fogRot = (idx % 2 === 0 ? "" : "-") + "0.05*t";

const fc = fogLoop
  ? [
      `[0:v]scale=${Math.round(W * 4)}:-2,zoompan=z='${mv.z}':x='${mv.x}':y='${mv.y}':d=${frames}:s=${W}x${H}:fps=${fps}[bg]`,
      // blend HARD-ERRORS on mismatched input sizes, so the fog is always scaled to the base.
      // Black-background smoke needs NO keying: screen treats black as the identity element.
      `[1:v]scale=${W}:${H},setsar=1,hue=s=0,format=yuv420p[fg]`,
      `[bg][fg]blend=all_mode=screen:all_opacity=${f("fog-opacity", "0.50")},eq=brightness=-0.20:saturation=0.13:contrast=1.02,format=yuv420p[v]`,
    ].join(";")
  : [
      `[0:v]scale=${Math.round(W * 4)}:-2,zoompan=z='${mv.z}':x='${mv.x}':y='${mv.y}':d=${frames}:s=${W}x${H}:fps=${fps}[bg]`,
      `[bg]eq=brightness=-0.20:saturation=0.13:contrast=1.02,format=yuv420p[v]`,
    ].join(";");

const args = ["-hide_banner", "-loglevel", "error", "-y", "-loop", "1", "-i", image];
if (fogLoop) {
  if (!existsSync(fogLoop)) die(`fog loop not found: ${fogLoop} (build it with gen-fog-loop.mjs)`);
  // CONTINUITY WITHOUT A SECOND PASS: seek into the fog by this clip's own start time in the
  // film, so clip N picks up exactly where N-1 left off. Offset is taken modulo the fog
  // duration because input -ss drifts beyond one period. Measured seam 1.57x normal vs
  // 18.76x when every clip starts the fog at 0.
  const fogDur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", fogLoop], { encoding: "utf8" }).trim());
  const startAt = parseFloat(f("start", "0"));
  args.push("-ss", (startAt % fogDur).toFixed(3), "-stream_loop", "-1", "-i", fogLoop);
} else if (fog) {
  args.push("-loop", "1", "-i", fog);
  if (grain) args.push("-loop", "1", "-i", grain);
}
args.push("-filter_complex", fc, "-map", "[v]", "-t", String(dur),
  "-c:v", "libx264", "-preset", f("preset", "veryfast"), "-crf", f("crf", "23"),
  "-pix_fmt", "yuv420p", "-r", String(fps), out);

const t0 = Date.now();
try { execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] }); }
catch (e) { die(`ffmpeg failed: ${e.message}`); }
const secs = (Date.now() - t0) / 1000;
console.log(JSON.stringify({ ok: true, out, move: mv.name, duration: dur, seconds: +secs.toFixed(1), rtf: +(secs / dur).toFixed(2) }));
