/**
 * Remotion config for ai-broll-editor.
 *
 * MEDIA RESOLUTION CONTRACT
 * -------------------------
 * The render is invoked as
 *   BROLL_JOB_DIR=work/<job> npx remotion render remotion/src/index.ts Main out.mp4 --props=work/<job>/timeline.json ...
 * Every `src` in timeline.json (broll media, narration, sfx, music) is RELATIVE to work/<job>/
 * (e.g. "prepared/b_0001.mp4", "narration_norm.m4a", "sfx/whoosh-soft-02.mp3").
 * We point Remotion's public dir at BROLL_JOB_DIR so that `staticFile("prepared/b_0001.mp4")`
 * resolves to work/<job>/prepared/b_0001.mp4 with no copying. See src/util/media.ts (`resolveSrc`).
 *
 * If BROLL_JOB_DIR is unset (studio / showcase / default props) the public dir falls back to
 * remotion/public, and placeholder media (`solid:#hex`, data: URIs) never touch the disk anyway.
 *
 * Special src forms accepted by the renderer (no file needed):
 *   "solid:#RRGGBB"   -> a solid-colour AbsoluteFill (pipeline smoke tests / placeholder media)
 *   "data:..."        -> passed through (inline SVG etc.)
 *   "http(s)://..."   -> passed through (not used in CI; renders must be offline)
 */
import path from "node:path";
import { Config } from "@remotion/cli/config";

const jobDir = process.env.BROLL_JOB_DIR;
if (jobDir) {
  Config.setPublicDir(path.resolve(process.cwd(), jobDir));
}

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(2);
Config.setChromiumOpenGlRenderer("swangle");
Config.setDelayRenderTimeoutInMilliseconds(120000);
