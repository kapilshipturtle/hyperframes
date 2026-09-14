// Shared test helpers: synthetic transcripts, synthetic assets, temp job dirs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Asset, Assets, Beats, Transcript, Word } from "../scripts/ts/types.js";
import { segmentTranscript } from "../scripts/ts/segment.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const PACKS = path.join(ROOT, "tests", "fixtures", "packs");

const VOCAB = "the a of to and in that it is was for on with as by at from this be are or an we you they one two three percent million dollars years ship box port trade crane steel worker city ocean truck train cost world story history said wrote which because so when then however since while".split(" ");

export interface WordSpec { len: number; gap: number; punct: "" | "." | "," | "?" }

/** Build a transcript from word specs (durations/gaps in ms). Deterministic given the specs. */
export function transcriptFrom(specs: WordSpec[], startMs = 300, tailMs = 800): Transcript {
  const words: Word[] = [];
  let t = startMs;
  specs.forEach((s, i) => {
    const text = VOCAB[i % VOCAB.length] + s.punct;
    words.push({ id: i, text, startMs: t, endMs: t + s.len, conf: 0.9, rms: -30 + ((i * 7919) % 17) - 8 });
    t += s.len + s.gap;
  });
  if (words.length) words[words.length - 1].text = words[words.length - 1].text.replace(/[,?]$/, "") + (/\.$/.test(words[words.length - 1].text) ? "" : ".");
  for (let i = 0; i < words.length; i++) words[i].gapAfterMs = i + 1 < words.length ? words[i + 1].startMs - words[i].endMs : 0;
  const durationMs = (words.length ? words[words.length - 1].endMs : 1000) + tailMs;
  return { audioPath: "narration_norm.m4a", durationMs, language: "en", engine: "synthetic", words, segments: [], silences: [] };
}

export interface AssetSpec { missing: boolean; portrait: boolean; kind: "video" | "image"; score: number; y2: boolean; sd: boolean; alternates: number; shortClip: boolean }

export function assetsFrom(beats: Beats, specs: AssetSpec[]): Assets {
  const assets: Assets = {};
  beats.beats.forEach((b, i) => {
    const s = specs[i % Math.max(1, specs.length)];
    if (!s || s.missing) { assets[b.id] = { chosen: null, alternates: [] }; return; }
    const mk = (suffix: string, kind: "video" | "image", score: number, extra: Partial<Asset> = {}): Asset => ({
      assetId: `a_${i}${suffix}`, kind, source: "pexels", srcUrl: `https://example.test/${i}${suffix}`, localPath: `assets/${i}${suffix}.${kind === "video" ? "mp4" : "jpg"}`,
      preparedPath: `prepared/${b.id}${suffix}.${kind === "video" ? "mp4" : "jpg"}`, inMs: 0, outMs: s.shortClip ? 1800 : 7000, width: s.portrait ? 1080 : 1920, height: s.portrait ? 1920 : 1080,
      clipScore: score, license: "Pexels License", attribution: `Video by Author ${i}${suffix} on Pexels`, tier: "stock", reasons: [], ...extra,
    });
    const chosen = s.y2
      ? mk("", "video", 0.33, { source: "youtube", tier: "y2", license: "Standard YouTube", attribution: null, channelTitle: `Channel ${i}`, sourceVideoId: `yt${i}` })
      : mk("", s.kind, s.score, s.sd ? { source: "archiveorg", tier: "archival", sd: true, license: "Public Domain", attribution: null, width: 640, height: 480 } : {});
    const alternates: Asset[] = [];
    for (let k = 0; k < s.alternates; k++) alternates.push(mk(`alt${k}`, k % 2 ? "image" : "video", 0.27 + k * 0.01));
    assets[b.id] = { chosen, alternates };
  });
  return assets;
}

export function makeJobDir(name: string, t: Transcript, beats: Beats, assets: Assets, extraYaml = ""): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `broll-${name}-`));
  fs.writeFileSync(path.join(dir, "transcript.json"), JSON.stringify(t));
  fs.writeFileSync(path.join(dir, "beats.json"), JSON.stringify(beats));
  fs.writeFileSync(path.join(dir, "assets.json"), JSON.stringify(assets));
  let job = fs.readFileSync(path.join(ROOT, "templates", "job.yaml"), "utf8").replace(/^job_id: .*$/m, `job_id: ${name}`);
  // extraYaml holds top-level `key: value` lines; existing keys are replaced (js-yaml rejects duplicates), new ones appended
  for (const line of extraYaml.split("\n").filter((l) => l.trim())) {
    const key = line.split(":")[0].trim();
    const re = new RegExp(`^${key}:.*$`, "m");
    job = re.test(job) ? job.replace(re, line) : job + "\n" + line;
  }
  job += "\n";
  fs.writeFileSync(path.join(dir, "job.yaml"), job);
  return dir;
}

export function beatsFor(t: Transcript, chapters?: { title: string; startWordId: number; kind: "hook" | "explain" | "story" | "list" | "comparison" | "outro" }[]): Beats {
  return segmentTranscript(t, chapters);
}
