// Bring a Remotion-rendered segment onto the concat contract (spec 13.3): H.264 High@4.1, yuv420p,
// 30 fps, GOP 30, bt709 tags. Re-encodes only when ffprobe shows a mismatch; otherwise leaves the file untouched.
//   tsx scripts/ts/normalize_segment.ts work/<id>/segments/seg_0008.mp4   (or --file <path>)
import { existsSync, renameSync, unlinkSync } from "node:fs";
import { CliError, H264_FLAGS, flagString, main, parseArgs, probeGop, probeVideo, run, whichOrDie } from "./lib/common.js";

export interface Mismatch { field: string; expected: string; actual: string }

export function contractMismatches(p: ReturnType<typeof probeVideo>, gop: number | null): Mismatch[] {
  const m: Mismatch[] = [];
  const want = (field: string, expected: string, actual: string, ok: boolean) => { if (!ok) m.push({ field, expected, actual }); };
  want("codec", "h264", p.codec, p.codec === "h264");
  want("profile", "High", p.profile, p.profile === "High");
  want("level", "41", String(p.level), p.level === 41);
  want("pix_fmt", "yuv420p", p.pix_fmt, p.pix_fmt === "yuv420p");
  want("size", "1920x1080", `${p.width}x${p.height}`, p.width === 1920 && p.height === 1080);
  want("r_frame_rate", "30/1", p.r_frame_rate, p.r_frame_rate === "30/1");
  want("gop", "30", gop === null ? "unknown" : String(gop), gop === 30 || gop === null);
  want("color_primaries", "bt709", p.color_primaries, p.color_primaries === "bt709");
  want("color_transfer", "bt709", p.color_transfer, p.color_transfer === "bt709");
  want("color_space", "bt709", p.color_space, p.color_space === "bt709");
  return m;
}

main(() => {
  const args = parseArgs();
  const file = flagString(args, "file") ?? args.positional[0];
  if (!file) throw new CliError("usage: normalize_segment <segment.mp4> | --file <segment.mp4>", 2);
  if (!existsSync(file)) throw new CliError(`Segment not found: ${file}`);
  whichOrDie("ffmpeg"); whichOrDie("ffprobe");

  const before = probeVideo(file, true);
  const frames = before.nb_read_frames ?? before.nb_frames;
  const mism = contractMismatches(before, probeGop(file));
  if (!mism.length) { console.log(`[normalize_segment] ${file}: already on contract (${frames} frames); untouched`); return; }
  console.log(`[normalize_segment] ${file}: re-encoding, ${mism.length} mismatch(es): ${mism.map((x) => `${x.field}=${x.actual} (want ${x.expected})`).join(", ")}`);
  const tmp = file.replace(/\.mp4$/, "") + ".normalizing.mp4";
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-vf", "fps=30,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p", "-r", "30", ...H264_FLAGS, tmp]);
  const after = probeVideo(tmp, true);
  const framesAfter = after.nb_read_frames ?? after.nb_frames;
  if (frames !== null && framesAfter !== frames) { unlinkSync(tmp); throw new CliError(`re-encode changed the frame count ${frames} -> ${framesAfter}; refusing to replace ${file}`); }
  const still = contractMismatches(after, probeGop(tmp));
  if (still.length) { unlinkSync(tmp); throw new CliError(`re-encode still off contract: ${still.map((x) => `${x.field}=${x.actual}`).join(", ")}`); }
  renameSync(tmp, file);
  console.log(`[normalize_segment] ${file}: replaced (${framesAfter} frames, High@4.1 yuv420p 30fps GOP30 bt709)`);
});
