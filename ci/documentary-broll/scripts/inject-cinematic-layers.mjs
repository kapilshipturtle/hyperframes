#!/usr/bin/env node
// inject-cinematic-layers.mjs — mounts the two Tier-1 "always-on cinematic"
// assets (ambience bed + grain overlay, see gen-cinematic-assets.mjs) into
// the assembled index.html, AFTER assemble-index.mjs and heal-media-start.mjs
// have already run. A self-heal-style injector, same pattern as
// heal-media-start.mjs: idempotent (checks for its own marker before
// inserting, so re-running this script twice never double-mounts), and
// string-level DOM insertion (no HTML parser dependency), matching how the
// rest of this skill's assembly-adjacent scripts operate.
//
// Why a separate script instead of extending assemble-index.mjs itself:
// assemble-index.mjs is a SHARED script (owned by faceless-explainer, reused
// by 4 workflows) — adding documentary-broll-specific "always mount an
// ambience bed and grain layer" behavior there would leak into every other
// workflow that calls it. Same reasoning as heal-media-start.mjs already
// established: keep documentary-broll-specific behavior in a
// documentary-broll-owned post-assembly step.
//
// Usage:
//   node inject-cinematic-layers.mjs --index ./index.html \
//     --ambience .hyperframes/cinematic-assets/ambience-bed.mp3 \
//     --grain .hyperframes/cinematic-assets/grain-overlay.mp4 \
//     --duration <total video seconds> [--ambience-volume 0.05] [--grain-opacity 0.06] \
//     [--log .hyperframes/run-log.md]
//
// Mounts:
//   - Ambience bed: <audio> on track-index 12 (11 is BGM's lane; ambience is
//     a DIFFERENT, always-on layer that coexists with optional BGM, not a
//     replacement for it), data-start=0, full video duration, at a fixed low
//     volume — this is a "glue" track, never a creative/mood choice like BGM.
//   - Grain overlay: <video muted loop> on track-index 3 (above captions'
//     lane 2, below nothing — it's the topmost visual layer), full-bleed,
//     mix-blend-mode: overlay, low opacity, looping natively via the native
//     HTML <video loop> attribute (the source file is a short 3s loop, see
//     gen-cinematic-assets.mjs — never baked at full video length).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { relative, resolve, dirname } from "node:path";
import { logIfRequested } from "./lib/run-log.mjs";

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

const MARKER = "<!-- documentary-broll: cinematic layers (ambience + grain) -->";

function main() {
  const argv = process.argv.slice(2);
  const indexPath = resolve(flag(argv, "index", "./index.html"));
  const ambiencePath = flag(argv, "ambience", null);
  const grainPath = flag(argv, "grain", null);
  const duration = Number(flag(argv, "duration", null));
  const ambienceVolume = Number(flag(argv, "ambience-volume", "0.05"));
  const grainOpacity = Number(flag(argv, "grain-opacity", "0.06"));

  if (!ambiencePath || !grainPath || !duration) {
    console.error("Usage: inject-cinematic-layers.mjs --index <path> --ambience <path> --grain <path> --duration <seconds> [--ambience-volume N] [--grain-opacity N] [--log <path>]");
    process.exit(1);
  }
  if (!existsSync(indexPath)) {
    console.error(`✗ inject-cinematic-layers: index not found: ${indexPath}`);
    process.exit(1);
  }
  if (!existsSync(ambiencePath) || !existsSync(grainPath)) {
    console.error(`✗ inject-cinematic-layers: missing asset(s) — run gen-cinematic-assets.mjs first (ambience: ${existsSync(ambiencePath)}, grain: ${existsSync(grainPath)})`);
    process.exit(1);
  }

  let html = readFileSync(indexPath, "utf8");

  if (html.includes(MARKER)) {
    console.log(`✓ inject-cinematic-layers: already mounted (marker present) — no-op → ${indexPath}`);
    logIfRequested(argv, "Step 6 — inject-cinematic-layers", "already mounted, no-op", {});
    return;
  }

  const indexDir = dirname(indexPath);
  const ambienceRel = relative(indexDir, resolve(ambiencePath));
  const grainRel = relative(indexDir, resolve(grainPath));

  const block = `
    ${MARKER}
    <!-- always-on ambience bed — glues the mix under narration/BGM, never
         true silence between lines; see gen-cinematic-assets.mjs -->
    <audio
      id="el-ambience-bed"
      src="${ambienceRel}"
      data-start="0"
      data-duration="${duration.toFixed(2)}"
      data-track-index="12"
      data-volume="${ambienceVolume}"
    ></audio>
    <!-- always-on grain/texture overlay — a short native-looping clip
         composited full-bleed at low opacity across the whole timeline -->
    <video
      id="el-grain-overlay"
      class="clip"
      src="${grainRel}"
      muted
      loop
      playsinline
      data-start="0"
      data-duration="${duration.toFixed(2)}"
      data-track-index="3"
      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;mix-blend-mode:overlay;opacity:${grainOpacity};pointer-events:none;"
    ></video>
`;

  // Insert right before the closing </div> of the root composition (the
  // outermost element carrying data-composition-id) — matches where
  // assemble-index.mjs itself appends BGM/SFX, keeping this layer inside the
  // same root the renderer clip-gates against.
  const closeRootIdx = html.lastIndexOf("</div>");
  if (closeRootIdx === -1) {
    console.error(`✗ inject-cinematic-layers: could not find a closing </div> to insert before in ${indexPath}`);
    process.exit(1);
  }
  html = html.slice(0, closeRootIdx) + block + html.slice(closeRootIdx);

  writeFileSync(indexPath, html);
  console.log(`✓ inject-cinematic-layers: mounted ambience-bed (vol ${ambienceVolume}) + grain-overlay (opacity ${grainOpacity}) → ${indexPath}`);

  logIfRequested(argv, "Step 6 — inject-cinematic-layers", "mounted ambience bed + grain overlay", {
    "ambience volume": ambienceVolume,
    "grain opacity": grainOpacity,
    "ambience source": ambienceRel,
    "grain source": grainRel,
  });
}

main();
