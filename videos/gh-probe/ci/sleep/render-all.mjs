#!/usr/bin/env node
// GH-PROBE (branch gh-probe only -- never merged). Measures the CURRENT sleep-long-video
// pipeline on a free GitHub runner, reusing render-sleep.yml unchanged: that workflow cds
// into videos/<project> and runs `node ci/sleep/render-all.mjs ... --chunk N --of M` in a
// matrix, so this file is what each matrix job runs.
//
// Each job: set up DepthFlow with the laptop's exact pins -> render its contiguous share of
// the scenes with the real depthflow-render.mjs and the film's settings -> print timings.
// Job 0 additionally runs the real dissolve-join.mjs and atmosphere-pass.mjs (snow-smoke)
// on its own clips, so all three stages get a measured rate.
// Every number printed is measured here; nothing is estimated.
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
const f = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d; };
const chunk = parseInt(f("chunk", "0"), 10), of = parseInt(f("of", "1"), 10);
const outDir = f("out-dir", ".work/clips");
const sh = (c) => { console.log(`$ ${c}`); execSync(c, { stdio: "inherit", shell: "/bin/bash" }); };
const cap = (c) => { try { return execSync(c, { encoding: "utf8", shell: "/bin/bash" }).trim(); } catch (e) { return `ERR ${e.message.split("\n")[0]}`; } };
const T = {};
const time = (k, fn) => { const t = Date.now(); fn(); T[k] = +((Date.now() - t) / 1000).toFixed(1); console.log(`PROBE ${k}=${T[k]}s`); };

console.log(`PROBE job ${chunk}/${of} | nproc ${cap("nproc")} | ${cap("free -g | sed -n 2p")}`);
console.log(`PROBE cpu: ${cap("lscpu | grep 'Model name'")}`);

time("setup_system", () => {
  sh("sudo apt-get install -y -q xvfb libgl1-mesa-dri libegl1 libglx-mesa0 mesa-utils python3-venv >/dev/null");
  sh("curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ff.tar.xz && mkdir -p /tmp/ff && tar -xf /tmp/ff.tar.xz -C /tmp/ff --strip-components=1");
});
console.log(`PROBE ffmpeg7: ${cap("/tmp/ff/ffmpeg -version | head -1")}`);
time("setup_venv", () => {
  sh("python3 -m venv /tmp/dfvenv && /tmp/dfvenv/bin/pip install -q --upgrade pip");
  sh("/tmp/dfvenv/bin/pip install -q -r ci/sleep/requirements.txt --extra-index-url https://download.pytorch.org/whl/cpu");
});
console.log(`PROBE python: ${cap("/tmp/dfvenv/bin/python --version")}`);
const X = `xvfb-run -a -s "-screen 0 1920x1080x24"`;
console.log(`PROBE GL: ${cap(`${X} glxinfo -B | grep -iE 'OpenGL renderer|OpenGL version'`)}`);

// Contiguous share of the scenes, so job 0's clips join into a continuous piece of film.
const all = JSON.parse(readFileSync(".hyperframes/scenes.json", "utf8"));
const per = Math.ceil(all.length / of);
const mine = all.slice(chunk * per, (chunk + 1) * per);
const filmSecs = mine.reduce((a, s) => a + s.duration, 0);
writeFileSync("/tmp/mine.json", JSON.stringify(mine));
console.log(`PROBE share: scenes ${mine[0]?.id}..${mine.at(-1)?.id} (${mine.length}), ${filmSecs.toFixed(1)}s of film`);

mkdirSync(outDir, { recursive: true });
time("clips", () => sh(`${X} node ci/sleep/scripts/depthflow-render.mjs --scenes /tmp/mine.json --images .media/scenes ` +
  `--out-dir ${outDir} --dissolve 1.5 --style historical --motion-ramp 0.3 --motion-height 0.36 --motion-offset 0.5 --venv /tmp/dfvenv`));
const n = readdirSync(outDir).filter((x) => x.endsWith(".mp4")).length;
console.log(`PROBE clips_made=${n} | ${(T.clips / n).toFixed(1)} s/clip | ${(T.clips / filmSecs).toFixed(2)} s wall per s of film`);

if (chunk === 0) {
  time("join", () => sh(`node ci/sleep/scripts/dissolve-join.mjs --clips-dir ${outDir} --out /tmp/base.mp4 --dissolve 1.5 --chunk 12 --ffmpeg /tmp/ff/ffmpeg`));
  const joined = parseFloat(cap("ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/base.mp4"));
  time("atmos", () => sh(`node ci/sleep/scripts/atmosphere-pass.mjs --in /tmp/base.mp4 --out /tmp/atmos.mp4 --effect snow-smoke --intensity 1.0 --ffmpeg /tmp/ff/ffmpeg`));
  console.log(`PROBE joined_film=${joined}s | join ${(T.join / joined).toFixed(2)} s/s | atmos ${(T.atmos / joined).toFixed(2)} s/s`);
  // Upload the snow+haze sample WITH the clips (the workflow uploads out-dir/*.mp4).
  sh(`cp /tmp/atmos.mp4 ${outDir}/zz-atmos-sample.mp4`);
}
console.log(`PROBE SUMMARY job ${chunk}: ${JSON.stringify(T)}`);
