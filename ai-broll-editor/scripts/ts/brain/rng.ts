// Seeded deterministic PRNG (spec 11.3 P0: seed = sha1(job_id) unless job.yaml sets one).
import { createHash } from "node:crypto";

export const sha1 = (s: string): string => createHash("sha1").update(s).digest("hex");

export interface Rng {
  /** float in [0,1) */
  next(): number;
  /** integer in [0,n) */
  int(n: number): number;
  pick<T>(arr: T[]): T;
}

/** mulberry32 seeded from the first 4 bytes of sha1(seed). */
export function makeRng(seed: string): Rng {
  let a = parseInt(sha1(seed).slice(0, 8), 16) >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => (n <= 0 ? 0 : Math.floor(next() * n)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}

/** Stable JSON: object keys sorted recursively so identical data hashes identically (I12). */
export function stableStringify(v: unknown, indent?: number): string {
  const norm = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(norm);
    if (x && typeof x === "object") {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(x as Record<string, unknown>).sort()) {
        const val = (x as Record<string, unknown>)[k];
        if (val !== undefined) o[k] = norm(val);
      }
      return o;
    }
    return x;
  };
  return JSON.stringify(norm(v), null, indent);
}
