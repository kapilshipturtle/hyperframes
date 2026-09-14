// Spec section 4: INGEST. Makes the job tree and every derived audio file.
//   tsx scripts/ts/ingest.ts --job <id> [--input path/to/audio]
// input defaults to job.yaml `input_audio` (relative to the job dir).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { CliError, flagString, main, parseArgs, readJobConfig, requireJob, run, runFfmpegStderr, whichOrDie } from "./lib/common.js";

export const JOB_SUBDIRS = ["asr", "plans", "assets", "prepared", "segments", "qc", "cache", "sections"];

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  whichOrDie("ffmpeg");
  whichOrDie("ffprobe");
  if (!existsSync(jobDir)) throw new CliError(`Job dir does not exist: ${jobDir}. Create it and add job.yaml + the narration audio first.`);

  let input = flagString(args, "input");
  if (!input) {
    const cfg = readJobConfig(jobDir);
    if (!cfg.input_audio) throw new CliError("job.yaml has no `input_audio` and no --input was given.");
    input = cfg.input_audio;
  }
  if (!isAbsolute(input)) input = existsSync(input) ? input : join(jobDir, input);
  if (!existsSync(input)) throw new CliError(`Input audio not found: ${input}`);

  for (const d of JOB_SUBDIRS) mkdirSync(join(jobDir, d), { recursive: true });
  const out = (f: string) => join(jobDir, f);

  console.log(`[ingest ${jobId}] input ${input}`);
  run("ffmpeg", ["-y", "-v", "error", "-i", input, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", out("narration16k.wav")]);
  console.log("  narration16k.wav      (whisper.cpp / WhisperX input)");
  run("ffmpeg", ["-y", "-v", "error", "-i", input, "-ac", "1", "-ar", "16000", "-b:a", "32k", out("narration16k_32k.mp3")]);
  console.log("  narration16k_32k.mp3  (Groq upload)");
  run("ffmpeg", ["-y", "-v", "error", "-i", input, "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", out("narration_norm.m4a")]);
  console.log("  narration_norm.m4a    (loudnorm -16 LUFS, 48 kHz AAC)");

  const dur = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input]).trim();
  if (!Number.isFinite(Number(dur))) throw new CliError(`ffprobe returned a non-numeric duration for ${input}: "${dur}"`);
  writeFileSync(out("duration_s.txt"), dur + "\n");
  console.log(`  duration_s.txt        (${dur} s)`);

  const silences = runFfmpegStderr(["-i", input, "-af", "silencedetect=noise=-35dB:d=0.4", "-f", "null", "-"]);
  writeFileSync(out("silences.txt"), silences);
  const nSil = (silences.match(/silence_start/g) ?? []).length;
  console.log(`  silences.txt          (${nSil} silences >= 0.4 s below -35 dB)`);

  const rmsPath = out("rms50ms.txt");
  if (existsSync(rmsPath)) writeFileSync(rmsPath, "");
  run("ffmpeg", ["-v", "error", "-i", out("narration_norm.m4a"), "-af",
    `asetnsamples=n=2400,astats=metadata=1:reset=1:length=0.05,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=${rmsPath}`, "-f", "null", "-"]);
  if (!existsSync(rmsPath)) throw new CliError("ametadata did not write rms50ms.txt");
  console.log("  rms50ms.txt           (RMS every 50 ms = 2400 samples @ 48 kHz, for emphasis + ducking)");
  console.log(`[ingest ${jobId}] done`);
});
