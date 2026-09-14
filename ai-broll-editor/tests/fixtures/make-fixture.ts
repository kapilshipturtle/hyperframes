// Generates work/sample-fixture: a ~3 minute synthetic transcript, beats (via segment.ts), assets.json with fake prepared paths,
// job.yaml (from templates/job.yaml) and a synthetic rms50ms.txt. plans/sec_01.json is hand-written and kept as is.
// Run: npx tsx tests/fixtures/make-fixture.ts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Asset, Assets, Transcript, Word } from "../../scripts/ts/types.js";
import { segmentTranscript } from "../../scripts/ts/segment.js";
import { makeRng } from "../../scripts/ts/brain/rng.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const out = path.join(root, "work", "sample-fixture");

const SENTENCES = [
  "Today we are going to break down how the modern shipping container changed the world.",
  "In 1956, a trucker named Malcom McLean loaded 58 boxes onto a converted tanker.",
  "Before that, loading a ship took weeks, and dock workers moved every sack by hand.",
  "The container cut the cost of loading a ton of cargo from 5.86 dollars to 16 cents.",
  "That is a 97 percent drop, and it happened almost overnight.",
  "Ports like Rotterdam and Singapore grew into giant machines built around one steel box.",
  "So why did it take so long for anyone to standardise the size?",
  "Railways, truckers and shipping lines all wanted their own dimensions.",
  "It took a decade of arguments before the 20 foot and 40 foot boxes won.",
  "Once they did, a crane could move a box from ship to train in under two minutes.",
  "Economists later estimated that containers boosted trade between countries by 700 percent.",
  "The historian Marc Levinson wrote that the box made the world smaller and the economy bigger.",
  "Think about the laptop, the phone and the notebook on your desk right now.",
  "Each one probably crossed an ocean inside one of these boxes.",
  "But the story is not only about efficiency.",
  "Whole neighbourhoods of dock workers lost their jobs within a few years.",
  "Cities that refused to rebuild their ports, like New York's Manhattan piers, faded.",
  "Cities that embraced the box, like Oakland, boomed.",
  "Today about 90 percent of everything you buy travels by sea at some point.",
  "And most of it moves inside a container that costs less to ship than your lunch.",
  "So next time you see a truck hauling a rusty steel box, remember it is one of the most important inventions of the twentieth century.",
  "That is the story of the box.",
];

function buildTranscript(): Transcript {
  const rng = makeRng("sample-fixture-transcript");
  const words: Word[] = [];
  let t = 1400; // speech starts at 1.4 s
  let id = 0;
  for (let si = 0; si < SENTENCES.length; si++) {
    const toks = SENTENCES[si].split(" ");
    for (let k = 0; k < toks.length; k++) {
      const len = 160 + Math.round(rng.next() * 240) + Math.min(200, toks[k].length * 18);
      const rms = -24 + (rng.next() - 0.5) * 10 - (k === 0 ? 0 : 0) + (/^\d/.test(toks[k]) ? 5 : 0);
      words.push({ id: id++, text: toks[k], startMs: t, endMs: t + len, conf: 0.95, rms: Math.round(rms * 10) / 10 });
      t += len + (k === toks.length - 1 ? 450 + Math.round(rng.next() * 500) : 40 + Math.round(rng.next() * 120));
      if (/,$/.test(toks[k])) t += 180;
    }
    if (si === 6) t += 1300; // a long pause after the question
    if (si === 14) t += 1000;
  }
  for (let i = 0; i < words.length; i++) words[i].gapAfterMs = i + 1 < words.length ? words[i + 1].startMs - words[i].endMs : 0;
  const durationMs = words[words.length - 1].endMs + 2600; // tail for an end-card
  const segments = SENTENCES.map((s, i) => {
    const ws = words.filter((_, k) => sentenceIndex(k) === i);
    return { id: i, text: s, startMs: ws[0].startMs, endMs: ws[ws.length - 1].endMs, wordIds: ws.map((w) => w.id) };
  });
  function sentenceIndex(wordIdx: number) { let n = 0; for (let i = 0; i < SENTENCES.length; i++) { n += SENTENCES[i].split(" ").length; if (wordIdx < n) return i; } return SENTENCES.length - 1; }
  return { audioPath: "narration_norm.m4a", durationMs, language: "en", engine: "synthetic", words, segments, silences: [] };
}

function buildAssets(beatIds: string[]): Assets {
  const rng = makeRng("sample-fixture-assets");
  const assets: Assets = {};
  beatIds.forEach((id, i) => {
    const n = String(i + 1).padStart(4, "0");
    const mk = (suffix: string, kind: "video" | "image", score: number, extra: Partial<Asset> = {}): Asset => ({
      assetId: `pexels_${kind === "video" ? "v" : "p"}_${n}${suffix}`, kind, source: "pexels", srcUrl: `https://www.pexels.com/${kind}/${n}${suffix}`,
      localPath: `assets/${n}${suffix}.${kind === "video" ? "mp4" : "jpg"}`, preparedPath: `prepared/${id}${suffix}.${kind === "video" ? "mp4" : "jpg"}`,
      inMs: 1000, outMs: 1000 + 6400, width: 1920, height: 1080, fps: 30, durationMs: 20000, clipScore: score, sceneScore: 0.06,
      license: "Pexels License", attribution: `Video by Creator ${n} on Pexels`, tier: "stock", reasons: ["fixture"], ...extra,
    });
    const r = rng.next();
    if (i % 9 === 4) { assets[id] = { chosen: null, alternates: [] }; return; }                     // missing -> typographic card
    if (i % 7 === 3) { assets[id] = { chosen: mk("", "image", 0.31, { width: 1080, height: 1920 }), alternates: [mk("b", "video", 0.27)] }; return; } // portrait -> pip
    if (i % 11 === 6) { assets[id] = { chosen: mk("", "video", 0.34, { source: "wikimedia", license: "CC BY-SA 4.0", attribution: `Photo: Author ${n}, Wikimedia Commons, CC BY-SA 4.0`, tier: "archival", sd: true }), alternates: [] }; return; }
    const kind: "video" | "image" = r < 0.6 ? "video" : "image";
    assets[id] = { chosen: mk("", kind, 0.28 + Math.round(rng.next() * 8) / 100), alternates: [mk("b", "image", 0.27), mk("c", "video", 0.26)] };
  });
  return assets;
}

function main() {
  fs.mkdirSync(path.join(out, "plans"), { recursive: true });
  const t = buildTranscript();
  fs.writeFileSync(path.join(out, "transcript.json"), JSON.stringify(t, null, 2) + "\n");
  const chapters = [
    { title: "The Box That Shrank the World", startWordId: 0, kind: "hook" as const },
    { title: "Winners and Losers", startWordId: t.words.find((w) => w.text === "But")!.id, kind: "story" as const },
  ];
  const beats = segmentTranscript(t, chapters);
  // the fixture wants two sections even though the second is short (soft bound would merge it)
  fs.writeFileSync(path.join(out, "beats.json"), JSON.stringify(beats, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "assets.json"), JSON.stringify(buildAssets(beats.beats.map((b) => b.id)), null, 2) + "\n");
  const job = fs.readFileSync(path.join(root, "templates", "job.yaml"), "utf8").replace(/^job_id: .*$/m, "job_id: sample-fixture");
  fs.writeFileSync(path.join(out, "job.yaml"), job);
  // synthetic RMS: -25 dB while a word is spoken, -60 in gaps, 50 ms bins
  const bins: string[] = [];
  const nBins = Math.ceil(t.durationMs / 50);
  let wi = 0;
  for (let b = 0; b < nBins; b++) {
    const ms = b * 50;
    while (wi < t.words.length && t.words[wi].endMs < ms) wi++;
    const speaking = wi < t.words.length && t.words[wi].startMs <= ms + 50 && t.words[wi].endMs >= ms;
    bins.push(`frame:${b} pts:${b * 2400} pts_time:${(ms / 1000).toFixed(3)}`, `lavfi.astats.Overall.RMS_level=${speaking ? "-25.0" : "-60.0"}`);
  }
  fs.writeFileSync(path.join(out, "rms50ms.txt"), bins.join("\n") + "\n");
  console.log(`fixture: ${t.words.length} words, ${beats.beats.length} beats, ${beats.sections.length} sections, ${t.durationMs} ms`);
}
main();
