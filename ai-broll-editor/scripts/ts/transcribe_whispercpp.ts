// Spec 5.2 Option B: offline CPU transcription with whisper.cpp via @remotion/install-whisper-cpp.
//   tsx scripts/ts/transcribe_whispercpp.ts --job <id> [--model small.en|medium.en] [--input wav]
// Writes work/<id>/asr/whispercpp.json in the toCaptions shape:
//   { engine, model, captions: [{ text, startMs, endMs, timestampMs, confidence }] }
// which scripts/py/to_transcript_json.py consumes. whisper.cpp itself is installed to ./whisper.cpp
// (git-ignored; cache it in CI with actions/cache).
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { downloadWhisperModel, installWhisperCpp, toCaptions, transcribe } from "@remotion/install-whisper-cpp";
import { CliError, PACKAGE_ROOT, flagBool, flagString, main, parseArgs, requireJob, writeJson } from "./lib/common.js";

const WHISPER_VERSION = "1.7.5";
const MODELS = ["tiny.en", "base.en", "small.en", "medium.en", "large-v3-turbo"] as const;
type Model = (typeof MODELS)[number];

function usage(): string {
  return [
    "usage: transcribe_whispercpp --job <id> [--model small.en] [--input work/<id>/narration16k.wav]",
    `  --model   one of ${MODELS.join(", ")} (default small.en; medium.en for proper names, ~3x slower)`,
    "  --input   16 kHz mono wav (default work/<id>/narration16k.wav from ingest)",
    "  writes    work/<id>/asr/whispercpp.json (toCaptions shape)",
  ].join("\n");
}

main(async () => {
  const args = parseArgs();
  if (flagBool(args, "help")) { console.log(usage()); return; }
  const { jobId, jobDir } = requireJob(args);
  const model = (flagString(args, "model") ?? "small.en") as Model;
  if (!MODELS.includes(model)) throw new CliError(`Unknown --model "${model}". ${usage()}`, 2);
  const input = flagString(args, "input") ?? join(jobDir, "narration16k.wav");
  if (!existsSync(input)) throw new CliError(`Input wav not found: ${input}. Run ingest first.`);

  const whisperPath = join(PACKAGE_ROOT, "whisper.cpp");
  console.log(`[transcribe ${jobId}] ensuring whisper.cpp ${WHISPER_VERSION} at ${whisperPath}`);
  await installWhisperCpp({ to: whisperPath, version: WHISPER_VERSION, printOutput: false });
  console.log(`[transcribe ${jobId}] ensuring model ${model}`);
  await downloadWhisperModel({ model, folder: whisperPath, printOutput: false });

  console.log(`[transcribe ${jobId}] transcribing ${input} (tokenLevelTimestamps=true --dtw, splitOnWord=true)`);
  const t0 = Date.now();
  let lastPct = -1;
  const out = await transcribe({
    model, whisperPath, whisperCppVersion: WHISPER_VERSION, inputPath: input,
    tokenLevelTimestamps: true, splitOnWord: true, language: "en",
    onProgress: (p) => { const pct = Math.floor(p * 100); if (pct !== lastPct && pct % 10 === 0) { lastPct = pct; console.log(`  ${pct}%`); } },
  });
  const { captions } = toCaptions({ whisperCppOutput: out });
  if (!captions.length) throw new CliError("whisper.cpp returned zero captions; check the input audio.");

  mkdirSync(join(jobDir, "asr"), { recursive: true });
  const dest = join(jobDir, "asr", "whispercpp.json");
  writeJson(dest, {
    engine: `whispercpp-${WHISPER_VERSION}`, model, language: out.result?.language ?? "en", inputPath: input,
    captions: captions.map((c) => ({ text: c.text, startMs: c.startMs, endMs: c.endMs, timestampMs: c.timestampMs, confidence: c.confidence })),
  });
  console.log(`[transcribe ${jobId}] ${captions.length} tokens in ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${dest}`);
});
