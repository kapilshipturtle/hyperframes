// Golden test: the Brain on work/sample-fixture must match tests/golden/sample-fixture.timeline.json (written on first run).
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { runBrain } from "../scripts/ts/brain/index.js";
import { validateJob } from "../scripts/ts/validate.js";
import { stableStringify } from "../scripts/ts/brain/rng.js";
import { packChunks } from "../scripts/ts/chunks.js";
import { ROOT, PACKS } from "./helpers.js";

const jobDir = path.join(ROOT, "work", "sample-fixture");
const golden = path.join(ROOT, "tests", "golden", "sample-fixture.timeline.json");

describe("golden: work/sample-fixture", () => {
  it("matches the committed timeline", async () => {
    const r = runBrain(jobDir, { packsDir: PACKS });
    const json = stableStringify(r.timeline, 2) + "\n";
    if (!fs.existsSync(golden)) { fs.mkdirSync(path.dirname(golden), { recursive: true }); fs.writeFileSync(golden, json); }
    expect(json).toBe(fs.readFileSync(golden, "utf8"));
    const v = await validateJob(jobDir, { skipMedia: true, packsDir: PACKS });
    expect(v.errors, v.errors.join("\n")).toEqual([]);
    expect(fs.existsSync(path.join(jobDir, "report.md"))).toBe(true);
  });

  it("chunks.ts packs remotion chunks for the matrix", () => {
    const chunks = JSON.parse(fs.readFileSync(path.join(jobDir, "chunks.json"), "utf8"));
    const { matrix } = packChunks(chunks, 18, "remotion");
    expect(matrix.length).toBeGreaterThan(0);
    for (const m of matrix) { expect(m.toFrame - m.fromFrame + 1).toBeLessThanOrEqual(4000); expect(m.ids.length).toBeGreaterThan(0); }
    const ff = packChunks(chunks, 18, "ffmpeg");
    expect(ff.matrix.every((m) => m.ids.length === 1)).toBe(true);
  });
});
