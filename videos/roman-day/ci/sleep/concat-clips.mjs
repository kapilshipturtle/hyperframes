#!/usr/bin/env node
// concat-clips.mjs -- join rendered clips losslessly and mux the narration.
//
// Uses ffmpeg's concat DEMUXER with -c copy (stream copy, zero re-encode, zero quality
// loss) -- never the concat FILTER, which re-encodes. Same approach as
// documentary-broll/scripts/concat-clips. Every clip shares codec/fps/resolution
// because render-clip.mjs produced them all with identical settings.
//
// Optional --xfade N applies an N-second cross-dissolve between clips instead of a hard
// cut. The reference has ZERO detectable hard cuts, so a dissolve is the correct default
// for that look -- but it forces a re-encode, so it is opt-in and slower.
//
// Usage: node concat-clips.mjs --clips-dir clips --audio narration.m4a --out film.mp4
//        [--xfade 2.5] [--lufs -26]
import { execFileSync } from "node:child_process";
import { readdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const die = (m) => { console.error(`concat-clips: ${m}`); process.exit(1); };

const dir = f("clips-dir") || die("--clips-dir required");
const out = f("out") || die("--out required");
const audio = f("audio", "");
const xfade = parseFloat(f("xfade", "0"));
const lufs = f("lufs", "-26");
const clips = readdirSync(dir).filter((x) => x.endsWith(".mp4")).sort();
if (!clips.length) die(`no .mp4 in ${dir}`);

const listPath = join(dir, "_concat.txt");
writeFileSync(listPath, clips.map((c) => `file '${resolve(dir, c)}'`).join("\n"));
const silent = out.replace(/\.mp4$/, "") + ".video.mp4";

if (xfade > 0) {
  // Re-encode path: chain xfade filters. Costly on long films -- prefer baking the
  // dissolve into render-clip's own fade in/out where possible.
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  clips.forEach((c) => args.push("-i", join(dir, c)));
  const dur = (p) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], { encoding: "utf8" }).trim());
  let fc = "", prev = "0:v", acc = 0;
  for (let i = 1; i < clips.length; i++) {
    acc += dur(join(dir, clips[i - 1])) - (i === 1 ? 0 : xfade);
    const off = (acc - xfade).toFixed(3), lbl = i === clips.length - 1 ? "v" : `x${i}`;
    fc += `[${prev}][${i}:v]xfade=transition=fade:duration=${xfade}:offset=${off}[${lbl}];`;
    prev = lbl;
  }
  args.push("-filter_complex", fc.replace(/;$/, ""), "-map", "[v]", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", silent);
  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
} else {
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", silent], { stdio: ["ignore", "ignore", "inherit"] });
}

if (audio) {
  if (!existsSync(audio)) die(`audio not found: ${audio}`);
  // A present-but-unreadable narration file (a zero-filled placeholder, a truncated
  // download, a .m4a that is really HTML) previously crashed here with a raw ffmpeg
  // stack trace. Probe it first and say plainly what is wrong.
  let adur = 0;
  try {
    adur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
      "-of", "csv=p=0", audio], { encoding: "utf8" }).trim());
  } catch {
    die(`narration file is not readable audio: ${audio}\n` +
        `  (ffprobe could not parse it -- check it is a real .m4a/.wav, not a placeholder or a failed download)`);
  }
  if (!Number.isFinite(adur) || adur < 1) die(`narration file has no usable duration (${adur}s): ${audio}`);
  // Sleep-format loudness: the reference measures -25.8 dBFS median. A -16 LUFS
  // narration is far too loud for this format. Linear-gain loudnorm, no compression.
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", silent, "-i", audio,
    "-filter_complex", `[1:a]loudnorm=I=${lufs}:TP=-2:LRA=11[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest", out],
    { stdio: ["ignore", "ignore", "inherit"] });
} else { execFileSync("mv", [silent, out]); }

// The silent intermediate is a build artefact, not a deliverable -- leaving it behind
// caused a "which file do I upload?" moment on a real run, and doubles disk use on a 2h film.
if (audio && existsSync(silent)) rmSync(silent, { force: true });

const d = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out], { encoding: "utf8" }).trim();
console.log(JSON.stringify({ ok: true, out, clips: clips.length, minutes: +(parseFloat(d) / 60).toFixed(1), mode: xfade > 0 ? `xfade ${xfade}s` : "stream-copy" }, null, 1));
