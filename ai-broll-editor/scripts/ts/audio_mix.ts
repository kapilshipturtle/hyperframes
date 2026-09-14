// Spec section 14: one FFmpeg audio mix from timeline.json (+ optional Brain audio-mix.json overrides).
//   tsx scripts/ts/audio_mix.ts --job <id> [--dry-run]
// narration + ducked music (sidechaincompress) + sfx stems (batches of 60) -> amix normalize=0 -> alimiter
// -> two-pass loudnorm I=-14 TP=-1 LRA=11 -> work/<id>/mix.m4a (AAC 192k). Missing files are an error.
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { CliError, flagBool, main, parseArgs, probeDurationSeconds, readJson, requireJob, resolveMedia, run, runFfmpegStderr, whichOrDie } from "./lib/common.js";
import { type AudioMixOverride, type Stage, buildPremix, buildSfxStems, parseLoudnorm, resolveAudioTracks } from "./lib/audio_graph.js";
import type { Timeline } from "./types.js";

function stageArgs(s: Stage, out: string, codec: string[]): string[] {
  return ["-y", "-hide_banner", "-loglevel", "error", ...s.inputs.flat(), "-filter_complex", s.filterComplex, "-map", s.outputLabel, ...codec, out];
}

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  const dryRun = flagBool(args, "dry-run");
  if (!dryRun) { whichOrDie("ffmpeg"); whichOrDie("ffprobe"); }
  const timeline = readJson<Timeline>(join(jobDir, "timeline.json"), "timeline.json");
  const overridePath = join(jobDir, "audio-mix.json");
  const override = existsSync(overridePath) ? readJson<AudioMixOverride>(overridePath, "audio-mix.json") : null;
  const a = resolveAudioTracks(timeline, override);
  console.log(`[audio_mix ${jobId}] narration + ${a.music.length} music + ${a.sfx.length} sfx (${override ? "audio-mix.json overrides" : "derived from timeline"})`);

  const missing = new Set<string>();
  const resolve = (src: string): string => { const p = resolveMedia(src, jobDir); if (!p) { missing.add(src); return src; } return p; };
  const total = timeline.durationInFrames;
  const cache = join(jobDir, "cache", "audio");
  mkdirSync(cache, { recursive: true });

  const stemStages = buildSfxStems(a.sfx, resolve, total);
  const stemPaths = stemStages.map((_, i) => join(cache, `sfx_stem_${String(i + 1).padStart(2, "0")}.wav`));
  const premix = buildPremix(a, resolve, stemPaths, total);
  if (missing.size) throw new CliError(`audio files not found (searched job dir, assets/, package root):\n  ${[...missing].join("\n  ")}`);

  const premixPath = join(cache, "premix.wav");
  const mixPath = join(jobDir, "mix.m4a");
  const pcm = ["-c:a", "pcm_s24le", "-ar", "48000", "-ac", "2"];
  const plan = [
    ...stemStages.map((s, i) => ({ label: `sfx stem ${i + 1}/${stemStages.length} (${s.inputs.length} sfx)`, args: stageArgs(s, stemPaths[i], pcm) })),
    { label: "premix (voice + ducked music + stems, amix normalize=0, alimiter)", args: stageArgs(premix, premixPath, pcm) },
  ];
  if (dryRun) {
    for (const p of plan) console.log(`\n# ${p.label}\nffmpeg ${p.args.map((x) => (/[\s;\[\]'(),:=|]/.test(x) ? `'${x}'` : x)).join(" ")}`);
    console.log(`\n# then: loudnorm pass 1 (measure) and pass 2 (linear) -> ${mixPath}`);
    return;
  }
  for (const p of plan) { console.log(`  ${p.label}`); run("ffmpeg", p.args); }

  console.log("  loudnorm pass 1 (measure)");
  const p1 = runFfmpegStderr(["-hide_banner", "-i", premixPath, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"]);
  const m = parseLoudnorm(p1);
  console.log(`    measured I=${m.input_i} LUFS TP=${m.input_tp} LRA=${m.input_lra} thresh=${m.input_thresh}`);
  console.log("  loudnorm pass 2 (linear) -> mix.m4a");
  const ln = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary`;
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", premixPath, "-af", ln, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", mixPath]);
  const dur = probeDurationSeconds(mixPath);
  const want = total / 30;
  if (Math.abs(dur - want) > 0.1) throw new CliError(`mix.m4a is ${dur.toFixed(3)} s but the timeline is ${want.toFixed(3)} s`);
  console.log(`[audio_mix ${jobId}] wrote ${mixPath} (${dur.toFixed(3)} s)`);
});
