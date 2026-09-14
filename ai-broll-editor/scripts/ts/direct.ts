// Spec section 7: the Director runner. Creative intent only; the Brain owns every frame number.
//   tsx scripts/ts/direct.ts --job <id> [--sections sec_01,sec_02] [--fallback-only] [--max-retries 3]
//   tsx scripts/ts/direct.ts --job <id> --chapters          # spec 6: one LLM call -> work/<id>/chapters.json
// Per section: writes work/<id>/sections/<sec>.prompt.txt, runs
//   claude -p --output-format json --system-prompt-file references/director-system.md "<prompt>"
// extracts the JSON, Ajv-validates it against schemas/shotplan.schema.json plus the semantic
// checks below, re-prompts with the errors up to N times, then falls back to the rule-based planner.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CliError, PACKAGE_ROOT, flagBool, flagString, main, parseArgs, readJobConfig, readJson, requireJob, writeJson } from "./lib/common.js";
import { validateAgainst } from "./lib/schema.js";
import type { Beat, Beats, Grade, JobConfig, Layout, Mood, MusicTag, Section, SectionKind, Shot, ShotPlan, Transcript, TransitionFamily, Word } from "./types.js";

export const SYSTEM_PROMPT_PATH = join(PACKAGE_ROOT, "references", "director-system.md");
const QUERY_WINDOW = 10; // no query repeated within the last 10 beats
const SECTION_KINDS: SectionKind[] = ["hook", "explain", "story", "list", "comparison", "outro"];

// ---------------------------------------------------------------- prompt
export function buildSectionPrompt(section: Section, beats: Beat[], words: Map<number, Word>, cfg: JobConfig, priorQueries: string[]): string {
  const lines: string[] = [];
  lines.push(`# Section ${section.id} (${section.kind})${section.title ? `: ${section.title}` : ""}`);
  lines.push(`Style preset: ${cfg.style_preset}. Default grade: ${cfg.grade}. Brand: primary ${cfg.brand.primary}, accent ${cfg.brand.accent}, fonts ${cfg.brand.font_heading} / ${cfg.brand.font_body}.`);
  lines.push(`Section spans ${(section.startMs / 1000).toFixed(1)}s to ${(section.endMs / 1000).toFixed(1)}s and has ${beats.length} beats.`);
  lines.push("");
  lines.push("Return ONE shotplan JSON object for this section with exactly one shot per beat below, in order.");
  lines.push(`Set "sectionId": "${section.id}". Reference beats by beatId and words by wordId only; never output times.`);
  lines.push("Text content must be a verbatim substring of the beat text (1 to 6 words) or a number said in it; anchorWordId must be one of that beat's word ids.");
  lines.push(`Query repeat window: do not reuse any of these queries from the previous ${QUERY_WINDOW} beats: ${priorQueries.length ? priorQueries.map((q) => `"${q}"`).join(", ") : "(none)"}.`);
  lines.push("Reminder: the Brain may override your layout or transition when timing constraints demand it; you supply intent.");
  lines.push("");
  lines.push("## Beats");
  for (const b of beats) {
    const wordList = b.wordIds.map((id) => `${id}:${words.get(id)?.text ?? "?"}`).join(" ");
    const emph = b.emphasisWordIds.length ? ` emphasis=[${b.emphasisWordIds.join(",")}]` : "";
    lines.push(`- ${b.id} (${((b.endMs - b.startMs) / 1000).toFixed(2)}s)${emph}`);
    lines.push(`  text: ${b.text}`);
    lines.push(`  words: ${wordList}`);
  }
  return lines.join("\n") + "\n";
}

export function buildChaptersPrompt(t: Transcript): string {
  const parts: string[] = [];
  for (let i = 0; i < t.words.length; i++) {
    if (i % 10 === 0) parts.push(`[${t.words[i].id}]`);
    parts.push(t.words[i].text);
  }
  return [
    `# Transcript (${(t.durationMs / 1000 / 60).toFixed(1)} min, ${t.words.length} words). Word ids appear in brackets every 10 words.`,
    "Return ONE JSON object: {\"chapters\":[{\"title\":string,\"startWordId\":integer,\"kind\":\"hook|explain|story|list|comparison|outro\"}]}.",
    "Rules: first chapter startWordId = 0; startWordIds strictly ascending; each chapter 90 to 240 seconds; start chapters on sentence starts; titles 2 to 6 words. JSON only.",
    "", parts.join(" "), "",
  ].join("\n");
}

// ---------------------------------------------------------------- claude -p
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  // --output-format json wraps the answer in {result: string, ...}
  try {
    const wrapper = JSON.parse(text) as { result?: unknown; is_error?: boolean };
    if (wrapper && typeof wrapper === "object" && "result" in wrapper) {
      if (wrapper.is_error) throw new CliError(`claude returned an error: ${String(wrapper.result)}`);
      if (typeof wrapper.result !== "string") return wrapper.result;
      text = wrapper.result.trim();
    }
  } catch (e) { if (e instanceof CliError) throw e; }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new CliError("No JSON object found in the model output.");
  try { return JSON.parse(text.slice(start, end + 1)); }
  catch (e) { throw new CliError(`Model output is not valid JSON: ${(e as Error).message}`); }
}

function runClaude(prompt: string): string {
  if (!existsSync(SYSTEM_PROMPT_PATH)) {
    throw new CliError(`Director system prompt missing: ${SYSTEM_PROMPT_PATH}. It is written by the references builder; use --fallback-only to skip the LLM.`);
  }
  const r = spawnSync("claude", ["-p", "--output-format", "json", "--system-prompt-file", SYSTEM_PROMPT_PATH, prompt],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CLAUDECODE: undefined } });
  if (r.error) throw new CliError(`claude CLI failed to start (${r.error.message}). Install Claude Code or use --fallback-only.`, 127);
  if (r.status !== 0) throw new CliError(`claude -p exited ${r.status}: ${String(r.stderr).slice(-800)}`);
  return String(r.stdout);
}

// ---------------------------------------------------------------- semantic checks
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();

export function semanticErrors(plan: ShotPlan, section: Section, beats: Beat[], words: Map<number, Word>): string[] {
  const errs: string[] = [];
  if (plan.sectionId !== section.id) errs.push(`sectionId must be "${section.id}", got "${plan.sectionId}"`);
  const byId = new Map(beats.map((b) => [b.id, b]));
  const seen = new Set<string>();
  for (const s of plan.shots) {
    const b = byId.get(s.beatId);
    if (!b) { errs.push(`shot references unknown beatId "${s.beatId}" (not in ${section.id})`); continue; }
    if (seen.has(s.beatId)) errs.push(`beatId "${s.beatId}" appears more than once`);
    seen.add(s.beatId);
    if (s.text) {
      if (!b.wordIds.includes(s.text.anchorWordId)) errs.push(`${s.beatId}: text.anchorWordId ${s.text.anchorWordId} is not a word of this beat (${b.wordIds[0]}..${b.wordIds[b.wordIds.length - 1]})`);
      const n = s.text.content.trim().split(/\s+/).length;
      if (n < 1 || n > 6) errs.push(`${s.beatId}: text.content must be 1 to 6 words, got ${n}`);
      const isNumber = /^[\d.,%$€£]+$/.test(s.text.content.trim());
      if (!norm(b.text).includes(norm(s.text.content)) && !(isNumber && norm(b.text).includes(norm(s.text.content)))) {
        errs.push(`${s.beatId}: text.content "${s.text.content}" is not a verbatim substring of the beat text`);
      }
    }
    if (s.grid && !s.layoutPreference.startsWith("grid-")) errs.push(`${s.beatId}: grid given but layoutPreference is ${s.layoutPreference}`);
    if (s.layoutPreference.startsWith("grid-") && (!s.grid || s.grid.cells !== Number(s.layoutPreference.slice(5)))) errs.push(`${s.beatId}: ${s.layoutPreference} needs grid.cells=${s.layoutPreference.slice(5)}`);
  }
  for (const b of beats) if (!seen.has(b.id)) errs.push(`missing shot for beat "${b.id}"`);
  void words;
  return errs;
}

// ---------------------------------------------------------------- rule-based fallback planner
const STOPWORDS = new Set(("a an the and or but so because which while then when although however since of in on at to for from by with " +
  "about into over after before between through during without within is are was were be been being am do does did done have has had having " +
  "will would shall should can could may might must this that these those it its they them their there here we you i he she his her our your my me us " +
  "not no yes very really just also even still only more most much many some any all each every other another such as than too if what who whom whose " +
  "how why where up down out off again further once now today going get got gets go goes went make made makes like thing things way ways lot lots " +
  "one two three first second next last new old good bad big small time times year years day days people person want wants need needs know knows think thinks say says said tell told " +
  "let lets look see seen actually basically literally right okay ok well yeah kind sort bit").split(/\s+/));

export function concreteNouns(text: string, n = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\s+/)) {
    const w = raw.toLowerCase().replace(/[^\p{L}\p{N}-]/gu, "");
    if (w.length < 3 || STOPWORDS.has(w) || /^\d+$/.test(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  // prefer longer words (more likely concrete nouns), keep original order among ties
  return out.map((w, i) => ({ w, i })).sort((a, b) => b.w.length - a.w.length || a.i - b.i).slice(0, n).sort((a, b) => a.i - b.i).map((x) => x.w);
}

export function verbatimSubstring(beat: Beat, words: Map<number, Word>): { content: string; anchorWordId: number } | null {
  const ws = beat.wordIds.map((id) => words.get(id)).filter((w): w is Word => !!w);
  if (ws.length < 2) return null;
  // Prefer a window starting at an emphasis word; else the middle; 2..4 words.
  const emph = beat.emphasisWordIds.find((id) => ws.some((w) => w.id === id));
  let start = emph !== undefined ? ws.findIndex((w) => w.id === emph) : Math.max(0, Math.floor(ws.length / 2) - 1);
  const len = Math.min(ws.length - start, ws.length >= 4 ? 3 : 2);
  if (len < 2) start = Math.max(0, ws.length - 2);
  const slice = ws.slice(start, start + Math.max(2, Math.min(4, len)));
  const content = slice.map((w) => w.text).join(" ").replace(/[.,;:!?]+$/, "");
  if (!content.trim()) return null;
  return { content, anchorWordId: slice[0].id };
}

const MOOD_BY_PRESET: Record<JobConfig["style_preset"], Mood> = { documentary: "documentary", energetic: "energetic", calm: "calm", tech: "tech" };
const MUSIC_BY_PRESET: Record<JobConfig["style_preset"], MusicTag> = { documentary: "documentary-ambient", energetic: "upbeat-corporate", calm: "calm-piano", tech: "tech-minimal" };

export function fallbackPlan(section: Section, beats: Beat[], words: Map<number, Word>, cfg: JobConfig, offset = 0): ShotPlan {
  const shots: Shot[] = beats.map((b, k) => {
    const i = offset + k;
    const layout: Layout = i % 2 === 0 ? "fullscreen-clip" : "fullscreen-image-kenburns";
    const family: TransitionFamily = i % 2 === 0 ? "cut" : "documentary";
    const withText = (i * 7) % 20 < 7; // 35 % of beats, spread evenly
    const t = withText ? verbatimSubstring(b, words) : null;
    const queries = concreteNouns(b.text, 3);
    return {
      beatId: b.id, importance: 3, visualIntent: b.text.slice(0, 120), layoutPreference: layout,
      queries: queries.length ? queries : [b.text.split(/\s+/).slice(0, 3).join(" ")],
      preferMotion: layout === "fullscreen-clip", shotScale: (["wide", "medium", "close"] as const)[i % 3],
      transitionFamily: family,
      text: t ? { content: t.content, anchorWordId: t.anchorWordId, style: "kinetic-bold", position: "lower-left" } : null,
      sfx: t && family !== "cut" ? ["pop"] : [],
      motion: layout === "fullscreen-image-kenburns" ? { type: "ken-burns", to: (["center", "top-right", "left", "bottom"] as const)[i % 4], zoom: 1.1 } : { type: "none" },
      grid: null,
    };
  });
  return { sectionId: section.id, mood: MOOD_BY_PRESET[cfg.style_preset] ?? "documentary", musicTag: MUSIC_BY_PRESET[cfg.style_preset] ?? "documentary-ambient", grade: cfg.grade as Grade, shots };
}

// ---------------------------------------------------------------- chapters validation
export interface Chapters { chapters: { title: string; startWordId: number; kind: SectionKind }[] }
export function chaptersErrors(c: unknown, t: Transcript): string[] {
  const errs: string[] = [];
  const obj = c as Partial<Chapters>;
  if (!obj || !Array.isArray(obj.chapters) || obj.chapters.length === 0) return ["chapters must be a non-empty array"];
  const maxId = t.words.length ? t.words[t.words.length - 1].id : 0;
  obj.chapters.forEach((ch, i) => {
    if (typeof ch.title !== "string" || !ch.title.trim()) errs.push(`chapters[${i}].title must be a non-empty string`);
    if (!Number.isInteger(ch.startWordId) || ch.startWordId < 0 || ch.startWordId > maxId) errs.push(`chapters[${i}].startWordId must be an integer word id 0..${maxId}`);
    if (!SECTION_KINDS.includes(ch.kind)) errs.push(`chapters[${i}].kind must be one of ${SECTION_KINDS.join("|")}`);
    if (i === 0 && ch.startWordId !== 0) errs.push("chapters[0].startWordId must be 0");
    if (i > 0 && !(ch.startWordId > obj.chapters![i - 1].startWordId)) errs.push(`chapters[${i}].startWordId must be greater than chapters[${i - 1}].startWordId`);
    const extra = Object.keys(ch).filter((k) => !["title", "startWordId", "kind"].includes(k));
    if (extra.length) errs.push(`chapters[${i}] has unknown keys ${extra.join(", ")}`);
  });
  return errs;
}

// ---------------------------------------------------------------- main
function askWithRetries<T>(label: string, prompt: string, validate: (v: unknown) => string[], maxRetries: number, rawDir: string, rawBase: string): T | null {
  let p = prompt;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`  [${label}] claude -p attempt ${attempt}/${maxRetries}`);
    const raw = runClaude(p);
    writeFileSync(join(rawDir, `${rawBase}.raw${attempt > 1 ? `.${attempt}` : ""}.json`), raw);
    let parsed: unknown;
    let errs: string[];
    try { parsed = extractJson(raw); errs = validate(parsed); }
    catch (e) { parsed = null; errs = [(e as Error).message]; }
    if (!errs.length) return parsed as T;
    console.warn(`  [${label}] ${errs.length} validation error(s):\n    - ${errs.slice(0, 12).join("\n    - ")}`);
    p = `${prompt}\n\n## Your previous answer was rejected. Fix ALL of these and return the complete JSON again:\n${errs.map((e) => `- ${e}`).join("\n")}\n`;
  }
  return null;
}

main(() => {
  const args = parseArgs();
  const { jobId, jobDir } = requireJob(args);
  const cfg = readJobConfig(jobDir);
  const maxRetries = Number(flagString(args, "max-retries") ?? 3);
  const fallbackOnly = flagBool(args, "fallback-only");
  const transcript = readJson<Transcript>(join(jobDir, "transcript.json"), "transcript.json");
  const words = new Map(transcript.words.map((w) => [w.id, w]));
  const sectionsDir = join(jobDir, "sections");
  mkdirSync(sectionsDir, { recursive: true });

  if (flagBool(args, "chapters")) {
    if (fallbackOnly) throw new CliError("--chapters needs the LLM; there is no rule-based chapter planner (use segment.ts for a single-section fallback).");
    const prompt = buildChaptersPrompt(transcript);
    writeFileSync(join(sectionsDir, "chapters.prompt.txt"), prompt);
    const result = askWithRetries<Chapters>("chapters", prompt, (v) => chaptersErrors(v, transcript), maxRetries, sectionsDir, "chapters");
    if (!result) throw new CliError(`chapters: model output failed validation after ${maxRetries} attempts (see ${sectionsDir}/chapters.raw*.json).`);
    writeJson(join(jobDir, "chapters.json"), result);
    console.log(`[direct ${jobId}] wrote chapters.json with ${result.chapters.length} chapters`);
    return;
  }

  const beatsFile = readJson<Beats>(join(jobDir, "beats.json"), "beats.json");
  const only = flagString(args, "sections")?.split(",").map((s) => s.trim()).filter(Boolean);
  const sections = only ? beatsFile.sections.filter((s) => only.includes(s.id)) : beatsFile.sections;
  if (only) for (const id of only) if (!sections.some((s) => s.id === id)) throw new CliError(`--sections: unknown section "${id}" (have ${beatsFile.sections.map((s) => s.id).join(", ")})`);
  if (!sections.length) throw new CliError("beats.json has no sections.");
  const beatsById = new Map(beatsFile.beats.map((b) => [b.id, b]));
  mkdirSync(join(jobDir, "plans"), { recursive: true });

  const recentQueries: string[] = [];
  let beatOffset = 0;
  const summary: string[] = [];
  for (const section of sections) {
    const beats = section.beatIds.map((id) => {
      const b = beatsById.get(id);
      if (!b) throw new CliError(`Section ${section.id} lists beat "${id}" which is not in beats.json`);
      return b;
    });
    if (!beats.length) throw new CliError(`Section ${section.id} has no beats.`);
    const prompt = buildSectionPrompt(section, beats, words, cfg, recentQueries.slice(-QUERY_WINDOW * 3));
    writeFileSync(join(sectionsDir, `${section.id}.prompt.txt`), prompt);

    let plan: ShotPlan | null = null;
    let how = "fallback";
    if (!fallbackOnly) {
      plan = askWithRetries<ShotPlan>(section.id, prompt,
        (v) => { const e = validateAgainst("shotplan", v); return e.length ? e : semanticErrors(v as ShotPlan, section, beats, words); },
        maxRetries, sectionsDir, section.id);
      if (plan) how = "llm";
      else console.warn(`  [${section.id}] falling back to the rule-based planner`);
    }
    if (!plan) {
      plan = fallbackPlan(section, beats, words, cfg, beatOffset);
      const errs = [...validateAgainst("shotplan", plan), ...semanticErrors(plan, section, beats, words)];
      if (errs.length) throw new CliError(`internal: fallback plan for ${section.id} is invalid:\n  ${errs.join("\n  ")}`);
    }
    writeJson(join(jobDir, "plans", `${section.id}.json`), plan);
    for (const s of plan.shots) for (const q of s.queries) recentQueries.push(q);
    beatOffset += beats.length;
    const nText = plan.shots.filter((s) => s.text).length;
    summary.push(`${section.id}: ${plan.shots.length} shots, ${nText} with text, via ${how}`);
    console.log(`[direct ${jobId}] ${summary[summary.length - 1]} -> plans/${section.id}.json`);
  }
  console.log(`[direct ${jobId}] done (${sections.length} section(s))`);
});
