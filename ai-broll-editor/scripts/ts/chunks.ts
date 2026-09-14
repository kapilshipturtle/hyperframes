// Matrix helper: tsx scripts/ts/chunks.ts --job <id> --workers N --route remotion|ffmpeg
// Prints a JSON array of {id, fromFrame, toFrame, ids} for GitHub `fromJSON`. Adjacent remotion chunks are merged up to 4,000 frames
// so at most N jobs are emitted when possible; if more remain they are emitted anyway with a warning on stderr.
import fs from "node:fs";
import path from "node:path";
import type { Chunk, Route } from "./types.js";

export interface MatrixChunk { id: string; fromFrame: number; toFrame: number; ids: string[] }
const MAX_FRAMES = 4000;

export function packChunks(chunks: Chunk[], workers: number, route: Route): { matrix: MatrixChunk[]; overflow: boolean } {
  const mine = chunks.filter((c) => c.route === route).sort((a, b) => a.fromFrame - b.fromFrame);
  let matrix: MatrixChunk[] = mine.map((c) => ({ id: c.id, fromFrame: c.fromFrame, toFrame: c.toFrame, ids: [c.id] }));
  if (route === "remotion") {
    // merge adjacent (frame-contiguous) chunks while over the worker budget and the merged length stays <= 4,000
    let merged = true;
    while (matrix.length > workers && merged) {
      merged = false;
      let bestI = -1, bestLen = Infinity;
      for (let i = 0; i + 1 < matrix.length; i++) {
        const a = matrix[i], b = matrix[i + 1];
        if (b.fromFrame !== a.toFrame + 1) continue;
        const len = b.toFrame - a.fromFrame + 1;
        if (len <= MAX_FRAMES && len < bestLen) { bestLen = len; bestI = i; }
      }
      if (bestI >= 0) {
        const a = matrix[bestI], b = matrix[bestI + 1];
        matrix.splice(bestI, 2, { id: a.id, fromFrame: a.fromFrame, toFrame: b.toFrame, ids: [...a.ids, ...b.ids] });
        merged = true;
      }
    }
  }
  return { matrix, overflow: matrix.length > workers };
}

function cli(argv: string[]) {
  const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const job = get("--job");
  if (!job) { console.error("usage: tsx scripts/ts/chunks.ts --job <id> --workers N --route remotion|ffmpeg"); process.exit(2); }
  const jobDir = fs.existsSync(path.join(job, "chunks.json")) ? path.resolve(job) : path.resolve("work", job);
  const workers = Math.max(1, parseInt(get("--workers") ?? "18", 10) || 18);
  const route = (get("--route") ?? "remotion") as Route;
  const chunks = JSON.parse(fs.readFileSync(path.join(jobDir, "chunks.json"), "utf8")) as Chunk[];
  const { matrix, overflow } = packChunks(chunks, workers, route);
  if (overflow) console.error(`warn: ${matrix.length} ${route} chunks exceed ${workers} workers; emitting all (the matrix runs them in waves)`);
  process.stdout.write(JSON.stringify(matrix) + "\n");
}
if (process.argv[1] && /chunks\.ts$/.test(process.argv[1])) cli(process.argv.slice(2));
