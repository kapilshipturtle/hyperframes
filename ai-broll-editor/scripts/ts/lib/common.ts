// Shared helpers for the pipeline-glue CLIs (ingest, direct, ffmpeg_segments, ...).
// Every CLI takes `--job <id>` which resolves to <packageRoot>/work/<id>/.
import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { JobConfig } from "../types.js";

/** Package root = ai-broll-editor/ (this file lives in scripts/ts/lib/). */
export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export class CliError extends Error {
  constructor(message: string, public readonly exitCode = 1) { super(message); }
}

export type Args = { flags: Record<string, string | true>; positional: string[] };

/** Minimal `--key value` / `--flag` parser. `--key=value` is also accepted. */
export function parseArgs(argv: string[] = process.argv.slice(2)): Args {
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) { flags[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { flags[key] = next; i++; } else flags[key] = true;
    } else positional.push(a);
  }
  return { flags, positional };
}

export function flagString(args: Args, name: string): string | undefined {
  const v = args.flags[name];
  return typeof v === "string" ? v : undefined;
}
export function flagBool(args: Args, name: string): boolean { return args.flags[name] !== undefined; }

export function requireJob(args: Args): { jobId: string; jobDir: string } {
  const jobId = flagString(args, "job");
  if (!jobId) throw new CliError("Missing required --job <id> (resolves work/<id>/ under the package root).", 2);
  if (!/^[A-Za-z0-9_.-]+$/.test(jobId)) throw new CliError(`Invalid job id "${jobId}": use [A-Za-z0-9_.-] only.`, 2);
  const jobDir = join(PACKAGE_ROOT, "work", jobId);
  return { jobId, jobDir };
}

export function readJson<T>(path: string, what = path): T {
  if (!existsSync(path)) throw new CliError(`${what} not found: ${path}`);
  try { return JSON.parse(readFileSync(path, "utf8")) as T; }
  catch (e) { throw new CliError(`${what} is not valid JSON (${path}): ${(e as Error).message}`); }
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function readJobConfig(jobDir: string): JobConfig {
  const p = join(jobDir, "job.yaml");
  if (!existsSync(p)) throw new CliError(`job.yaml not found at ${p} (copy templates/job.yaml there and edit).`);
  return yaml.load(readFileSync(p, "utf8")) as JobConfig;
}

/** Resolve a media src (timeline media/sfx/music) to an absolute file path.
 *  Tries: absolute; job dir; package assets/<src>; package root. */
export function resolveMedia(src: string, jobDir: string): string | null {
  if (isAbsolute(src)) return existsSync(src) ? src : null;
  const candidates = [join(jobDir, src), join(PACKAGE_ROOT, "assets", src), join(PACKAGE_ROOT, src)];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

// ---------- ffmpeg / ffprobe ----------
export function whichOrDie(bin: string): void {
  const r = spawnSync(bin, ["-version"], { encoding: "utf8" });
  if (r.error || r.status !== 0) throw new CliError(`${bin} is not installed or not on PATH (${r.error?.message ?? `exit ${r.status}`}).`, 127);
}

export function run(bin: string, args: string[], opts: SpawnSyncOptions & { quiet?: boolean } = {}): string {
  const r = spawnSync(bin, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...opts });
  if (r.error) throw new CliError(`${bin} failed to start: ${r.error.message}`, 127);
  if (r.status !== 0) {
    const tail = String(r.stderr ?? "").split("\n").slice(-25).join("\n");
    throw new CliError(`${bin} ${args.slice(0, 6).join(" ")} ... exited ${r.status}\n${tail}`);
  }
  return String(r.stdout ?? "");
}

/** Run ffmpeg and return stderr (ffmpeg logs there); throws on non-zero exit. */
export function runFfmpegStderr(args: string[]): string {
  const r = spawnSync("ffmpeg", args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error) throw new CliError(`ffmpeg failed to start: ${r.error.message}`, 127);
  if (r.status !== 0) throw new CliError(`ffmpeg exited ${r.status}\n${String(r.stderr).split("\n").slice(-25).join("\n")}`);
  return String(r.stderr ?? "");
}

export interface ProbeVideo {
  codec: string; profile: string; level: number; pix_fmt: string; width: number; height: number;
  r_frame_rate: string; nb_frames: number | null; nb_read_frames: number | null; duration: number | null;
  color_primaries: string; color_transfer: string; color_space: string;
}
export function probeVideo(file: string, countFrames = false): ProbeVideo {
  const args = ["-v", "error", ...(countFrames ? ["-count_frames"] : []), "-select_streams", "v:0", "-show_entries",
    "stream=codec_name,profile,level,pix_fmt,width,height,r_frame_rate,nb_frames,nb_read_frames,duration,color_primaries,color_transfer,color_space",
    "-of", "json", file];
  const j = JSON.parse(run("ffprobe", args)) as { streams?: Record<string, string>[] };
  const s = j.streams?.[0];
  if (!s) throw new CliError(`ffprobe: no video stream in ${file}`);
  const num = (v: string | undefined) => (v === undefined || v === "N/A" ? null : Number(v));
  return {
    codec: s.codec_name ?? "", profile: s.profile ?? "", level: Number(s.level ?? 0), pix_fmt: s.pix_fmt ?? "",
    width: Number(s.width ?? 0), height: Number(s.height ?? 0), r_frame_rate: s.r_frame_rate ?? "",
    nb_frames: num(s.nb_frames), nb_read_frames: num(s.nb_read_frames), duration: num(s.duration),
    color_primaries: s.color_primaries ?? "", color_transfer: s.color_transfer ?? "", color_space: s.color_space ?? "",
  };
}

export function probeDurationSeconds(file: string): number {
  const out = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).trim();
  const d = Number(out);
  if (!Number.isFinite(d)) throw new CliError(`ffprobe could not read duration of ${file}: "${out}"`);
  return d;
}

/** GOP length of the first keyframe interval (frames), via packet flags. */
export function probeGop(file: string, maxPackets = 400): number | null {
  const out = run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=flags", "-of", "csv=p=0", "-read_intervals", "%+#" + maxPackets, file]);
  const flags = out.trim().split("\n").filter(Boolean);
  const keys: number[] = [];
  flags.forEach((f, i) => { if (f.startsWith("K")) keys.push(i); });
  if (keys.length < 2) return keys.length === 1 && flags.length >= maxPackets ? null : flags.length || null;
  return keys[1] - keys[0];
}

/** Spec 13.3 encoder flags, shared by ffmpeg_segments and normalize_segment. */
export const H264_FLAGS = [
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
  "-profile:v", "high", "-level", "4.1", "-pix_fmt", "yuv420p",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-an", "-movflags", "+faststart",
];

export function framesToSeconds(frames: number): string { return (frames / 30).toFixed(6).replace(/0+$/, "").replace(/\.$/, ".0"); }

export function main(fn: () => void | Promise<void>): void {
  Promise.resolve().then(fn).catch((e: unknown) => {
    if (e instanceof CliError) { console.error(`error: ${e.message}`); process.exit(e.exitCode); }
    console.error(e);
    process.exit(1);
  });
}
