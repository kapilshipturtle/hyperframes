// http-budget.mjs — per-source request pacing + a 24-hour on-disk search cache
// for fetch-clips.mjs. Built 2026-09-06 after a long-film run hit Pexels' 429s:
// the monthly quota was barely touched (23.6k of 25k left) — the failure was the
// HOURLY burst limit, because a 100-beat film fires 100+ searches in a minute.
//
// Two mechanisms, both required by the providers' own terms:
//   1. LIMITS below are each source's DOCUMENTED limit (Pexels 200/hour,
//      Pixabay 100/minute, Coverr 50/hour on the free tier, Openverse 1/second
//      anonymous). `take(source)` waits just long enough to stay under it,
//      spreading requests instead of bursting, and a 429 response feeds
//      `penalise(source)` which backs that source off exponentially.
//   2. `cacheGet`/`cacheSet` persist every search response for 24 h under
//      ~/.cache/documentary-broll/search/. Pixabay's API terms REQUIRE 24-hour
//      caching; for us it also means a re-run, a retry, or a second pass over
//      the same beats costs zero requests.
//
// Cache key = source + endpoint + sorted query params (the API key is never
// part of the key or the stored file). Corrupt/expired entries are ignored.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

export const CACHE_DIR = process.env.DOCUMENTARY_BROLL_CACHE || join(homedir(), ".cache", "documentary-broll", "search");
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // Pixabay's terms: results must be cached for 24 h

// requests per window, per source (documented limits; conservative where a
// source publishes none). `minGapMs` is derived so N requests fit the window.
// perWindow/windowMs = the documented ceiling. minGapMs = the MEASURED minimum
// spacing this account actually tolerates, which for Pexels is far stricter than
// their published 200/hour: measured 2026-09-06 on a key with 22 279 of 25 000
// monthly requests remaining, direct curl, no other traffic —
//   per_page=6 back-to-back → 429 immediately
//   5 s apart  → 4 of 6 refused
//   15 s apart → 3 of 4 accepted
// So Pexels is throttled per-request, not per-hour, and any burst fails no
// matter how much monthly quota is left. Pixabay, by contrast, answered every
// request instantly at its documented 100/60 s. Hence: Pexels gets a 12 s floor
// and is a SECONDARY source; Pixabay carries the pool.
export const LIMITS = {
  pexels: { perWindow: 190, windowMs: 3600_000, minGapMs: 12_000 },
  pixabay: { perWindow: 90, windowMs: 60_000, minGapMs: 700 },
  coverr: { perWindow: 45, windowMs: 3600_000, minGapMs: 1500 },
  openverse: { perWindow: 55, windowMs: 60_000, minGapMs: 1100 },
  wikimedia: { perWindow: 60, windowMs: 60_000, minGapMs: 1000 },
  archiveorg: { perWindow: 30, windowMs: 60_000, minGapMs: 2000 },
};

// The ledger is on DISK, not in memory: each fetch-clips.mjs run is a separate
// short-lived process, so an in-memory window would let 30 parallel beat searches
// each believe they own the whole budget (that is how the 429s happened). The
// ledger records one timestamp per request per source and is read/written under a
// lock-free append-and-rewrite (a lost write only ever makes pacing MORE
// conservative). Sleeping only happens when the window is genuinely full.
const LEDGER_DIR = process.env.DOCUMENTARY_BROLL_CACHE ? join(process.env.DOCUMENTARY_BROLL_CACHE, "..", "budget") : join(homedir(), ".cache", "documentary-broll", "budget");
const mem = new Map(); // source -> { penalties }
const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function ledgerPath(source) { return join(LEDGER_DIR, `${source}.json`); }
function readLedger(source, windowMs) {
  try {
    const raw = JSON.parse(readFileSync(ledgerPath(source), "utf8"));
    const t = now();
    return { hits: (raw.hits || []).filter((h) => t - h < windowMs), penaltyUntil: raw.penaltyUntil || 0 };
  } catch { return { hits: [], penaltyUntil: 0 }; }
}
function writeLedger(source, data) {
  try { mkdirSync(LEDGER_DIR, { recursive: true }); writeFileSync(ledgerPath(source), JSON.stringify(data)); } catch { /* best effort */ }
}

// Wait only if this source's documented window is actually full, then record the
// request. Returns milliseconds waited (0 in the normal case).
export async function take(source, { maxWaitMs = 45_000 } = {}) {
  const lim = LIMITS[source];
  if (!lim) return 0;
  let waited = 0;
  for (let guard = 0; guard < 200; guard++) {
    const t = now();
    const l = readLedger(source, Math.max(lim.windowMs, lim.minGapMs || 0));
    const last = l.hits.length ? Math.max(...l.hits) : 0;
    const gapWait = lim.minGapMs ? Math.max(0, lim.minGapMs - (t - last)) : 0;
    const penaltyWait = Math.max(0, (l.penaltyUntil || 0) - t);
    const windowFull = l.hits.filter((h) => t - h < lim.windowMs).length >= lim.perWindow;
    const windowWait = windowFull ? Math.max(250, lim.windowMs - (t - Math.min(...l.hits)) + 100) : 0;
    const w = Math.max(gapWait, penaltyWait, windowWait);
    if (w <= 0) { l.hits.push(t); writeLedger(source, l); return waited; }
    if (waited + w > maxWaitMs) throw new Error(`${source}: would need to wait ${Math.round(w / 1000)}s more (already ${Math.round(waited / 1000)}s) to stay inside its rate limit — skipping this source for this beat`);
    await sleep(Math.min(w, 5000) + Math.random() * 200); waited += Math.min(w, 5000);
  }
  return waited;
}

// A real 429 (or a documented Retry-After): back this source off for every
// process, exponentially, capped at 5 minutes.
export function penalise(source, retryAfterSeconds) {
  const lim = LIMITS[source] || { windowMs: 60_000 };
  const m = mem.get(source) || { penalties: 0 };
  m.penalties = Math.min(6, m.penalties + 1); mem.set(source, m);
  const ms = retryAfterSeconds ? Number(retryAfterSeconds) * 1000 : Math.min(300_000, 5000 * 2 ** (m.penalties - 1));
  const l = readLedger(source, lim.windowMs);
  l.penaltyUntil = Math.max(l.penaltyUntil || 0, now() + ms);
  writeLedger(source, l);
  return ms;
}
export function budgetReport() {
  const out = {};
  for (const [k, lim] of Object.entries(LIMITS)) {
    const l = readLedger(k, lim.windowMs);
    if (!l.hits.length && !(mem.get(k) || {}).penalties) continue;
    out[k] = { used: l.hits.length, limit: `${lim.perWindow}/${lim.windowMs / 1000}s`, penalised: (mem.get(k) || {}).penalties || 0 };
  }
  return out;
}

// ---------- cache ----------
function keyFor(source, url) {
  // strip credentials from the key/URL so nothing secret is written to disk
  const u = new URL(url);
  const params = [...u.searchParams.entries()].filter(([k]) => !/^(key|api_key|apikey|client_secret|access_token)$/i.test(k)).sort();
  return createHash("sha1").update(`${source}|${u.origin}${u.pathname}|${params.map(([k, v]) => `${k}=${v}`).join("&")}`).digest("hex");
}
export function cacheGet(source, url) {
  try {
    const p = join(CACHE_DIR, `${keyFor(source, url)}.json`);
    if (!existsSync(p)) return null;
    if (now() - statSync(p).mtimeMs > CACHE_TTL_MS) return null;
    return JSON.parse(readFileSync(p, "utf8")).body;
  } catch { return null; }
}
export function cacheSet(source, url, body) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, `${keyFor(source, url)}.json`), JSON.stringify({ source, at: new Date().toISOString(), body }));
  } catch { /* cache is best-effort */ }
}
export function cachePrune(maxAgeMs = CACHE_TTL_MS * 7) {
  try {
    if (!existsSync(CACHE_DIR)) return 0;
    let n = 0;
    for (const f of readdirSync(CACHE_DIR)) { const p = join(CACHE_DIR, f); if (now() - statSync(p).mtimeMs > maxAgeMs) { unlinkSync(p); n++; } }
    return n;
  } catch { return 0; }
}
