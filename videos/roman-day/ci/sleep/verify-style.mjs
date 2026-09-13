#!/usr/bin/env node
// verify-style.mjs -- measure a rendered clip or film against the REFERENCE numbers in
// references/reference-analysis.md and FAIL if it drifts. Run on a sample clip before
// committing a full render; run on the final film after.
//
// Bands come from measuring the real channel, not taste:
//   motion 1.4-1.7/255 per 0.5s (0.85 floor -- below that it reads as a static slideshow,
//   which is the demonetisation risk), luma 11-44 (median 18), saturation < 14 (ref 7.6).
// Usage: node verify-style.mjs --video film.mp4 [--samples 40] [--json]
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`verify-style: ${m}`); process.exit(1); };
const video = f("video") || die("--video required");
const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video], { encoding: "utf8" }));
const tmp = mkdtempSync(join(tmpdir(), "vstyle-"));
// 2 fps over sampled windows: 0.5s spacing is what the reference motion figure is defined on
const windows = Math.min(12, Math.max(3, Math.floor(dur / 300)));
let all = [];
for (let w = 0; w < windows; w++) {
  const t = (dur * (w + 0.5)) / windows;
  const d = join(tmp, `w${w}`);
  execFileSync("mkdir", ["-p", d]);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-ss", String(t.toFixed(1)), "-i", video, "-t", "10", "-vf", "fps=2,scale=320:-1", "-q:v", "5", join(d, "f%03d.jpg"), "-y"]);
  all.push(d);
}
const py = `
import glob,sys
from PIL import Image, ImageChops
dirs=${JSON.stringify(all)}
mot=[];lum=[];sat=[];edg=[]
for d in dirs:
    fs=sorted(glob.glob(d+'/*.jpg')); prev=None
    for f in fs:
        im=Image.open(f).convert('RGB'); g=im.convert('L'); n=im.size[0]*im.size[1]
        px=list(im.getdata())
        lum.append(sum(0.299*r+0.587*gg+0.114*b for r,gg,b in px)/n)
        sat.append(sum(max(p)-min(p) for p in px)/n)
        if prev is not None: mot.append(sum(list(ImageChops.difference(g,prev).getdata()))/n)
        prev=g
    if fs:
        g2=Image.open(fs[0]).convert('L').resize((320,180)); p2=list(g2.getdata())
        edg.append(sum(1 for y in range(180) for x in range(319) if abs(p2[y*320+x]-p2[y*320+x+1])>40)/(180*319))
import json
print(json.dumps({"motion":sum(mot)/len(mot),"lumaMedian":sorted(lum)[len(lum)//2],
 "lumaMax":max(lum),"sat":sum(sat)/len(sat),"edges":sum(edg)/len(edg)*100}))
`;
const m = JSON.parse(execFileSync("python3", ["-c", py], { encoding: "utf8" }));
const checks = [
  ["motion", m.motion, 0.85, 6.0, "per-0.5s pixel change. Ceiling was 2.2 when the 'fog' was an invisible near-black plate and ALL motion came from the pan. With a real smoke overlay the frame legitimately changes much more -- that IS the effect. The floor still catches a static slideshow; fog visibility is gated separately below."],
  ["lumaMedian", m.lumaMedian, 8, 45, "median frame luminance (ref 18)"],
  ["lumaMax", m.lumaMax, 0, 90, "brightest sampled frame (ref max 44)"],
  ["sat", m.sat, 0, 14, "mean saturation (ref 7.6)"],
];
// FOG VISIBILITY GATE (added 2026-09-13). Three separate builds shipped with fog that
// measured "present" but was invisible on screen, because variance statistics count
// compression noise. This measures what the eye actually sees: how much of the frame
// changes between samples 2s apart. Targets from perceptual research + a working build.
const fogPy = `
import glob,sys
import numpy as np
from PIL import Image
dirs=${JSON.stringify(all)}
p5=[];p10=[]
for d in dirs:
    fs=sorted(glob.glob(d+'/*.jpg'))
    A=[np.asarray(Image.open(f).convert('L'),dtype='float32') for f in fs]
    # compare frames 4 apart = 2 seconds at the fps=2 sampling used above
    for i in range(len(A)-4):
        df=np.abs(A[i+4]-A[i]); p5.append((df>5).mean()); p10.append((df>10).mean())
import json
print(json.dumps({"p5":float(np.mean(p5))*100,"p10":float(np.mean(p10))*100}))
`;
// Do NOT swallow this. A crashed measurement previously reported fog 0.00, which is
// indistinguishable from "the video has no fog" and sent a whole debugging run down the
// wrong path. Missing numpy is an environment bug; fail loudly instead.
let fog;
try { fog = JSON.parse(execFileSync("python3", ["-c", fogPy], { encoding: "utf8" })); }
catch (e) {
  console.error("verify-style: fog measurement FAILED to run (not the same as fog being absent).");
  console.error(String(e.stderr || e.message || e).trim().split("\n").slice(-3).join("\n"));
  console.error("install numpy: sudo apt-get install -y python3-numpy");
  process.exit(2);
}

// frames are only removed AFTER every check has read them (an earlier cleanup here made
// the fog gate silently report 0.00 on a video whose fog was measurably fine)
rmSync(tmp, { recursive: true, force: true });

let fail = 0;
for (const [k, v, lo, hi, why] of checks) {
  const ok = v >= lo && v <= hi; if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${k.padEnd(11)} ${v.toFixed(2).padStart(7)}  [${lo}..${hi}]  ${why}`);
}
// RECALIBRATED 2026-09-13 to the fog plate actually in use. The 25/40 targets came from a
// build using the fast fog-overlay.mp4 (71.9% self-change over 2s). fog-calm.mp4 -- the slow
// sleepy plate approved for this channel -- self-changes only 8.58%, so 25% was unreachable
// at ANY opacity or grade: a screen composite cannot move more than its source.
//
// Floors are measured on the FULL 605-scene film at the default 0.50 opacity: 3.08 / 10.11.
// Do not re-derive these from a handful of scenes. A 5-scene spread gave 5.31 and failed the
// real film, because its darkest scene (luma 20.7) was only the 25th percentile -- 153 scenes
// are darker still, and darker scenes carry visibly less fog.
for (const [k, v, lo, why] of [["fogPixels>10%", fog.p10, 2.4, "% of frame changing >10 levels between 2s samples -- the eye-visible smoke test (calm plate)"],
                              ["fogPixels>5%", fog.p5, 8.0, "% changing >5 levels"]]) {
  const ok = v >= lo; if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${k.padEnd(11)} ${v.toFixed(2).padStart(7)}  [>=${lo}]  ${why}`);
}
// DURATION / AUDIO-COVERAGE GATE (added 2026-09-13). Every check above is per-frame, so a
// film that was 4.3 minutes SHORT passed all six of them: the video ran 145.7 min against a
// 149.9 min narration and `-shortest` silently cut the end off. Length is not a style
// property, and nothing else here would ever notice. Pass --audio to enforce it.
const audio = f("audio");
if (audio) {
  const dur = (p) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries",
    "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
  const dv = dur(video), da = dur(audio), missing = da - dv;
  // 2s of slack: the last clip is whole frames and loudnorm can trim a few ms.
  const ok = missing <= 2.0;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${"coverage".padEnd(11)} ${missing.toFixed(2).padStart(7)}s  [<=2s]  narration left uncovered by video (video ${(dv / 60).toFixed(1)}min vs audio ${(da / 60).toFixed(1)}min)`);
}

console.log(`${fail === 0 ? "STYLE GATE PASSED" : `STYLE GATE FAILED (${fail})`} -- ${video}`);
process.exit(fail === 0 ? 0 : 1);
