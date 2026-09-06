#!/usr/bin/env node
// fetch-clips.mjs — stock footage AND photo search across Pexels, Pixabay,
// Videvo, Openverse (CC-licensed/public-domain real photos, no API key), and
// (opt-in only, NOT in the default --sources list — see below) archive.org's
// Internet Archive for archival/historical/newsreel-style footage.
// Plain HTTP, no LLM calls, no MCP process. Token-lean by design: this script
// does all the network I/O and JSON wrangling; the calling agent only ever
// sees the final one-line result per beat, never raw API payloads.
//
// Searches BOTH video clips and still photos per beat, then ranks them
// together so the mix (video vs. photo) is decided by match quality per
// beat, not a fixed rule — a beat with strong video coverage gets a clip,
// a beat where only a photo matches well gets a photo. Neither provider
// exposes a numeric relevance score, so each provider's own top-of-results
// ordering is trusted as its best-relevance pick; video is preferred over
// photo only as an explicit, modest tiebreak (see rankCandidates).
//
// Usage:
//   node fetch-clips.mjs --query "senior couple reviewing tax documents" \
//     --duration 6.2 --orientation landscape --out ./.broll/beat-04.json \
//     [--exclude id1,id2,id3] [--sources pixabay,pexels,coverr,openverse] [--media video,photo]
//
// `archiveorg` and `wikimedia` are NOT in the default --sources list.
// `archiveorg`'s corpus is archival/historical film footage (Prelinger
// Archives, newsreels, home movies) — low-relevance noise for most modern-
// b-roll queries. `wikimedia`'s video corpus is real but skews scientific/
// educational/nature (verified live: zero results for a typical human-
// b-roll query like "senior woman reading letter," strong results for
// nature/science/technical subjects) — also low-relevance noise outside
// that register. Pass `--sources pexels,pixabay,coverr,openverse,archiveorg,wikimedia`
// explicitly only for a beat whose narration is genuinely archival/
// historical OR scientific/nature/technical — see references/providers.md
// for the exact when-to-use guidance for each.
//
// Env: PEXELS_API_KEY (200 req/hour, 25k/month), PIXABAY_API_KEY (100 req/60s,
//   free self-service), COVERR_API_KEY (50 req/hour free tier, attribution
//   required), optional OPENVERSE_CLIENT_ID/OPENVERSE_CLIENT_SECRET (raises
//   Openverse's anonymous 1 req/s limits). Openverse, archive.org and Wikimedia
//   need no key. VIDEVO_API_KEY exists but Videvo's API is partner-only (no
//   self-service key) — not a default source.
//
// Rate limits are handled for you: lib/http-budget.mjs paces each source to its own
// documented limit, backs off on 429, and caches every search for 24 hours.
//
// Output JSON: { query, candidates: [{ source, mediaType, id, url, previewUrl, width, height,
//   durationSeconds|null, orientation, downloadUrl }], chosen: <candidate|null>, anomalies: [] }

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { loadEnv } from "./lib/load-env.mjs";
import { logIfRequested } from "./lib/run-log.mjs";
import { take, penalise, cacheGet, cacheSet, cachePrune, budgetReport, LIMITS } from "./lib/http-budget.mjs";

loadEnv();

const flag = (argv, name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};

// Pexels' video-search endpoint returns NO per-clip alt-text/description
// field at all (confirmed live — photos get one via `p.alt`, videos don't),
// which meant every video candidate's `description` was `null` and Step 3's
// semantic matching pass had nothing to check that candidate's ACTUAL
// content against — a real production run picked a video whose Pexels page
// URL slug was literally "person-writing-on-a-paper" (genuinely descriptive
// real content) for a Social Security beat, and it turned out on inspection
// to be an unrelated adoption/medical-report clip, because the matching pass
// had no description text to catch the mismatch. Pexels' own URL slugs ARE
// real, human-written descriptive text (not the search query — the page's
// own title, e.g. ".../video/close-up-footage-of-a-person-filling-up-the-form-8060739/")
// — extracting it is a free, always-available fallback description for any
// candidate whose provider returns none.
function slugDescription(url) {
  if (!url) return null;
  const m = String(url).match(/\/(?:video|photo)\/([a-z0-9-]+)-\d+\/?$/i);
  if (!m) return null;
  return m[1].replace(/-/g, " ");
}

// Every provider call goes through here: a 24-hour on-disk cache first (Pixabay's
// terms REQUIRE 24 h caching; for a long film it also means retries and re-runs
// cost zero requests), then per-source pacing against that provider's DOCUMENTED
// limit (lib/http-budget.mjs), then exponential back-off on a real 429. This is
// what fixes "Pexels rate limited us" on a 100+ beat film: the monthly quota was
// never the problem, the hourly burst was.
async function fetchJson(url, opts = {}, { retries = 1, backoffMs = 400, source = null, noCache = false } = {}) {
  if (source && !noCache) {
    const hit = cacheGet(source, url);
    if (hit) return hit;
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (source) {
        try { await take(source); }
        catch (e) { throw new Error(`RATE_SKIP:${e.message}`); } // surfaced as a per-source anomaly by the caller
      }
      const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(Number(process.env.DOCUMENTARY_BROLL_HTTP_TIMEOUT_MS || 8000)) });
      if (res.status === 429) {
        const waited = source ? penalise(source, res.headers.get("retry-after")) : backoffMs * 2 ** attempt;
        if (attempt < retries) { await new Promise((r) => setTimeout(r, source ? 0 : waited)); continue; }
        throw new Error(`429 rate limited by ${source || url} — backed off ${Math.round(waited / 1000)}s and still limited`);
      }
      if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
      const body = await res.json();
      if (source && !noCache) cacheSet(source, url, body);
      return body;
    } catch (e) {
      lastErr = e;
      if (String(e.message).startsWith("RATE_SKIP:")) throw e; // pacing already waited as long as it should — don't retry, let the caller record an anomaly
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * 2 ** attempt + Math.random() * 200));
      }
    }
  }
  throw lastErr;
}

// Openverse works fully anonymously (1 req/s). If the user registered an app
// (OPENVERSE_CLIENT_ID/SECRET in ~/.config/documentary-broll/.env) we exchange
// them for a bearer token once per process, which raises the page-size and
// rate limits. Failure to get a token is never fatal — we fall back to anonymous.
let _ovToken = null, _ovTried = false;
async function openverseToken() {
  if (_ovTried) return _ovToken;
  _ovTried = true;
  const id = process.env.OPENVERSE_CLIENT_ID, secret = process.env.OPENVERSE_CLIENT_SECRET;
  if (!id || !secret) return null;
  try {
    const res = await fetch("https://api.openverse.org/v1/auth_tokens/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) _ovToken = (await res.json()).access_token || null;
  } catch { _ovToken = null; }
  return _ovToken;
}
function openverseAuth() { return _ovToken ? { headers: { Authorization: `Bearer ${_ovToken}` } } : {}; }

// ---------- video adapters ----------

// Coverr (coverr.co) — free self-service API key from coverr.co/developers,
// 50 requests/hour on the Demo (free) tier, all content commercially licensed
// with Coverr attribution required (recorded on each candidate so
// build-credits.mjs surfaces it). Curated library: fewer, cleaner clips than
// Pexels/Pixabay — a good third opinion per beat rather than a bulk source.
async function searchCoverrVideo(query, { perPage = 6 } = {}) {
  const key = process.env.COVERR_API_KEY;
  if (!key) return { candidates: [], anomaly: "COVERR_API_KEY not set — skipped (video)" };
  const params = new URLSearchParams({ query, page_size: String(Math.max(3, perPage)), urls: "true" });
  const data = await fetchJson(`https://api.coverr.co/videos?${params}`, { headers: { Authorization: `Bearer ${key}` } }, { source: "coverr" });
  const candidates = (data.hits ?? data.data ?? []).map((v, rank) => {
    const w = v.max_width ?? v.width ?? 1920, h = v.max_height ?? v.height ?? 1080;
    return {
      source: "coverr",
      mediaType: "video",
      id: `coverr-${v.id}`,
      url: v.urls?.landing ?? `https://coverr.co/videos/${v.slug ?? v.id}`,
      previewUrl: v.thumbnail ?? v.poster ?? null,
      width: w,
      height: h,
      durationSeconds: v.duration ?? null,
      orientation: w >= h ? "landscape" : "portrait",
      downloadUrl: v.urls?.mp4_download ?? v.urls?.mp4 ?? v.download_url ?? null,
      license: "coverr",
      attributionRequired: true,
      creditLine: `Video by Coverr (${v.title ?? v.id})`,
      description: v.title ?? (Array.isArray(v.tags) ? v.tags.join(", ") : null),
      providerRank: rank,
    };
  }).filter((c) => c.downloadUrl);
  return { candidates, anomaly: null };
}


async function searchPexelsVideo(query, { perPage = 6, orientation } = {}) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { candidates: [], anomaly: "PEXELS_API_KEY not set — skipped (video)" };
  const params = new URLSearchParams({ query, per_page: String(perPage) });
  if (orientation) params.set("orientation", orientation);
  const data = await fetchJson(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: key },
  }, { source: "pexels" });
  const candidates = (data.videos ?? []).map((v, rank) => {
    const files = (v.video_files ?? []).slice().sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    const hd = files.find((f) => f.width >= 1280 && f.width <= 1920) ?? files[0];
    return {
      source: "pexels",
      mediaType: "video",
      id: `pexels-v${v.id}`,
      url: v.url,
      previewUrl: v.image,
      width: hd?.width ?? v.width,
      height: hd?.height ?? v.height,
      durationSeconds: v.duration,
      orientation: v.width >= v.height ? "landscape" : "portrait",
      downloadUrl: hd?.link,
      description: slugDescription(v.url), // Pexels video search has no per-clip alt-text field (photos do — see searchPexelsPhoto); the URL slug is real descriptive text and a free fallback signal for Step 3's semantic matching pass
      providerRank: rank,
    };
  });
  return { candidates, anomaly: null };
}

async function searchPixabayVideo(query, { perPage = 6, orientation } = {}) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return { candidates: [], anomaly: "PIXABAY_API_KEY not set — skipped (video)" };
  const params = new URLSearchParams({
    key,
    q: query,
    per_page: String(Math.max(3, perPage)), // Pixabay minimum is 3
  });
  if (orientation) params.set("orientation", orientation === "landscape" ? "horizontal" : "vertical");
  const data = await fetchJson(`https://pixabay.com/api/videos/?${params}`, {}, { source: "pixabay" });
  const candidates = (data.hits ?? []).map((v, rank) => {
    const files = v.videos ?? {};
    const best = files.large ?? files.medium ?? files.small ?? files.tiny;
    return {
      source: "pixabay",
      mediaType: "video",
      id: `pixabay-v${v.id}`,
      url: v.pageURL,
      previewUrl: v.picture_id ? `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg` : null,
      width: best?.width,
      height: best?.height,
      durationSeconds: v.duration,
      orientation: (best?.width ?? 1) >= (best?.height ?? 0) ? "landscape" : "portrait",
      downloadUrl: best?.url,
      description: v.tags || null, // Pixabay returns a comma-separated tags string per hit
      providerRank: rank,
    };
  });
  return { candidates, anomaly: null };
}

async function searchVidevoVideo(query, { perPage = 6, orientation } = {}) {
  const key = process.env.VIDEVO_API_KEY;
  if (!key) return { candidates: [], anomaly: "VIDEVO_API_KEY not set — skipped (video)" };
  // Videvo's public search API shape (api.videvo.net); adjust field names here
  // if their response envelope differs at integration time — kept isolated
  // in this one function so a schema change never touches the other providers.
  const params = new URLSearchParams({ q: query, per_page: String(perPage), api_key: key });
  const data = await fetchJson(`https://api.videvo.net/v1/videos/search?${params}`, {}, { source: "pexels" }); // partner-only API; paced under a generic bucket if ever used
  const candidates = (data.results ?? data.videos ?? []).map((v, rank) => ({
    source: "videvo",
    mediaType: "video",
    id: `videevo-v${v.id}`,
    url: v.page_url ?? v.url,
    previewUrl: v.thumbnail ?? v.preview_url ?? null,
    width: v.width,
    height: v.height,
    durationSeconds: v.duration,
    orientation: (v.width ?? 1) >= (v.height ?? 0) ? "landscape" : "portrait",
    downloadUrl: v.download_url ?? v.file_url,
    license: v.license, // Videvo mixes attribution / CC / public-domain / royalty-free
    description: v.title ?? v.description ?? slugDescription(v.page_url ?? v.url), // URL-slug fallback if this response shape ever omits title/description — see slugDescription's header comment
    providerRank: rank,
  }));
  return { candidates, anomaly: null };
}

async function searchArchiveOrgVideo(query, { perPage = 6 } = {}) {
  // Internet Archive (archive.org) — no API key, no rate-limit wall at this
  // scale. Real, mature, tested-live advancedsearch API. Strongest fit for
  // archival/historical/newsreel-style documentary beats (e.g. the Prelinger
  // Archives collection) — a genuinely different visual register than
  // Pexels/Pixabay's modern stock photography.
  //
  // CRITICAL caveat (verified live, not assumed): most archive.org items,
  // even in well-known public-domain collections, do NOT carry a
  // `licenseurl` field in their metadata — the API returns items regardless
  // of license status, and a missing field is NOT evidence of permission.
  // The `AND licenseurl:*` clause below is a REQUIRED server-side filter,
  // not an optional narrowing — it discards every item without an explicit,
  // machine-readable rights marker rather than trusting collection
  // membership or absence-of-a-field. Do not remove this clause to get more
  // results; that would silently reintroduce exactly the license-ambiguity
  // risk this adapter exists to avoid.
  // Scoped to known-curated archival collections, NOT the whole
  // mediatype:movies corpus — verified live that the unscoped corpus is
  // dominated by mirrored YouTube reuploads (horoscope channels, film-clip
  // compilations) that happen to match a query word, not genuine archival
  // documentary footage. `prelinger` (the Prelinger Archives — industrial/
  // educational/advertising films, newsreels) and `newsandpublicaffairs`
  // are real curated collections that actually deliver the archival/
  // historical register this adapter exists for.
  const ARCHIVAL_COLLECTIONS = ["prelinger", "newsandpublicaffairs"];
  const collectionClause = `(${ARCHIVAL_COLLECTIONS.map((c) => `collection:${c}`).join(" OR ")})`;
  const params = new URLSearchParams({
    q: `${collectionClause} AND (${query.split(/\s+/).map((w) => `text:${w}`).join(" AND ")}) AND licenseurl:*`,
    output: "json",
    rows: String(perPage),
  });
  params.append("fl[]", "identifier");
  params.append("fl[]", "title");
  params.append("fl[]", "licenseurl");
  params.append("fl[]", "description");
  const data = await fetchJson(`https://archive.org/advancedsearch.php?${params}`, {}, { source: "archiveorg" });
  const docs = data?.response?.docs ?? [];

  // Each hit needs a second call (item metadata) to find a real playable
  // video file and its resolution — do these in parallel, cap at perPage.
  const withFiles = await Promise.all(
    docs.slice(0, perPage).map(async (doc) => {
      try {
        const meta = await fetchJson(`https://archive.org/metadata/${doc.identifier}`, {}, { source: "archiveorg" });
        const files = meta?.files ?? [];
        // Prefer a real h.264 mp4 over the item's other derivatives (thumbnail
        // reels, subtitle files, etc.) — archive.org items often ship several
        // video derivatives at different resolutions under one identifier.
        const mp4Files = files
          .filter((f) => String(f.name).toLowerCase().endsWith(".mp4"))
          .sort((a, b) => (Number(b.width) || 0) - (Number(a.width) || 0));
        const best = mp4Files[0];
        if (!best) return null;
        return {
          source: "archive.org",
          mediaType: "video",
          id: `archiveorg-${doc.identifier}`,
          url: `https://archive.org/details/${doc.identifier}`,
          previewUrl: `https://archive.org/services/img/${doc.identifier}`,
          width: Number(best.width) || null,
          height: Number(best.height) || null,
          durationSeconds: best.length ? Number(best.length) : null,
          orientation: (Number(best.width) || 1) >= (Number(best.height) || 0) ? "landscape" : "portrait",
          downloadUrl: `https://archive.org/download/${doc.identifier}/${best.name}`,
          license: doc.licenseurl, // guaranteed present — filtered server-side above
          attributionRequired: !/publicdomain|\/zero\//i.test(doc.licenseurl || ""),
          description: doc.title ?? doc.description ?? null,
        };
      } catch {
        return null; // one item's metadata lookup failing shouldn't fail the whole search
      }
    }),
  );

  const candidates = withFiles.filter(Boolean).map((c, rank) => ({ ...c, providerRank: rank }));
  return { candidates, anomaly: null };
}

async function searchWikimediaVideo(query, { perPage = 6 } = {}) {
  // Wikimedia Commons — no API key, no rate-limit wall at this scale. Real
  // MediaWiki search + imageinfo API, verified live: strong per-file license
  // metadata (LicenseShortName/LicenseUrl/AttributionRequired, all
  // machine-readable — better attribution data than most stock APIs).
  // Video files here are WebM/Ogg, never MP4 — NOT a problem for this
  // pipeline specifically: download-clip.mjs already re-encodes every
  // fetched video to libx264/MP4 regardless of source format (ffmpeg reads
  // WebM natively as input), so no separate transcode step is needed here.
  const searchParams = new URLSearchParams({
    action: "query",
    list: "search",
    srnamespace: "6", // File: namespace
    srsearch: `${query} filetype:video`,
    format: "json",
    srlimit: String(perPage),
  });
  const searchData = await fetchJson(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {}, { source: "wikimedia" });
  const hits = searchData?.query?.search ?? [];

  const withInfo = await Promise.all(
    hits.map(async (hit) => {
      try {
        const infoParams = new URLSearchParams({
          action: "query",
          titles: hit.title,
          prop: "imageinfo",
          iiprop: "url|extmetadata|size|mime",
          format: "json",
        });
        const infoData = await fetchJson(`https://commons.wikimedia.org/w/api.php?${infoParams}`, {}, { source: "wikimedia" });
        const page = Object.values(infoData?.query?.pages ?? {})[0];
        const info = page?.imageinfo?.[0];
        if (!info?.url) return null;
        const meta = info.extmetadata ?? {};
        const licenseUrl = meta.LicenseUrl?.value ?? null;
        return {
          source: "wikimedia",
          mediaType: "video",
          id: `wikimedia-${page.pageid}`,
          url: info.descriptionurl ?? hit.title,
          previewUrl: null, // Commons doesn't reliably generate video thumbnails via this API
          width: info.width ?? null,
          height: info.height ?? null,
          durationSeconds: info.duration ?? null,
          orientation: (info.width ?? 1) >= (info.height ?? 0) ? "landscape" : "portrait",
          downloadUrl: info.url,
          license: meta.LicenseShortName?.value ?? licenseUrl ?? null,
          attributionRequired: meta.AttributionRequired?.value !== "false", // Commons defaults to requiring credit unless explicitly CC0/PD
          description: meta.ImageDescription?.value?.replace(/<[^>]+>/g, "").slice(0, 200) ?? hit.title,
        };
      } catch {
        return null;
      }
    }),
  );

  const candidates = withInfo.filter(Boolean).map((c, rank) => ({ ...c, providerRank: rank }));
  return { candidates, anomaly: null };
}

// ---------- photo adapters ----------

async function searchPexelsPhoto(query, { perPage = 6, orientation } = {}) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { candidates: [], anomaly: "PEXELS_API_KEY not set — skipped (photo)" };
  const params = new URLSearchParams({ query, per_page: String(perPage) });
  if (orientation) params.set("orientation", orientation);
  const data = await fetchJson(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: key },
  }, { source: "pexels" });
  const candidates = (data.photos ?? []).map((p, rank) => ({
    source: "pexels",
    mediaType: "photo",
    id: `pexels-p${p.id}`,
    url: p.url,
    previewUrl: p.src?.medium ?? p.src?.small,
    width: p.width,
    height: p.height,
    durationSeconds: null,
    orientation: p.width >= p.height ? "landscape" : "portrait",
    downloadUrl: p.src?.large2x ?? p.src?.original ?? p.src?.large,
    description: p.alt || null,
    providerRank: rank,
  }));
  return { candidates, anomaly: null };
}

async function searchOpenversePhoto(query, { perPage = 6 } = {}) {
  // Openverse (openverse.org, a Creative Commons project) — no API key, no
  // rate-limit wall for this scale of use. Every result is CC-licensed or
  // public-domain BY CONSTRUCTION (it indexes Flickr Commons, Wikimedia,
  // museum collections, etc., not an arbitrary web index like a search
  // engine) — `license_type=commercial` additionally excludes NC/ND
  // variants, so every candidate here is safe for a monetized video without
  // per-item manual review. Photo-only: Openverse's video index is thin
  // compared to Pexels/Pixabay/Videvo, not worth a second adapter for this
  // skill's purposes.
  const params = new URLSearchParams({
    q: query,
    page_size: String(Math.min(20, Math.max(1, perPage))),
    license_type: "commercial", // excludes NC (non-commercial) and ND (no-derivatives) licenses
  });
  const data = await fetchJson(`https://api.openverse.org/v1/images/?${params}`, openverseAuth(), { source: "openverse" });
  const candidates = (data.results ?? [])
    .filter((p) => p.url && p.width && p.height) // a handful of Openverse entries lack a resolvable direct url
    .map((p, rank) => ({
      source: "openverse",
      mediaType: "photo",
      id: `openverse-${p.id}`,
      url: p.foreign_landing_url,
      previewUrl: p.thumbnail ?? p.url,
      width: p.width,
      height: p.height,
      durationSeconds: null,
      orientation: p.width >= p.height ? "landscape" : "portrait",
      downloadUrl: p.url,
      license: p.license, // e.g. "cc0", "by", "pdm" — see attribution below
      attributionRequired: !["cc0", "pdm"].includes(String(p.license).toLowerCase()),
      creditLine: p.attribution ?? null, // Openverse pre-formats a ready-to-use credit string
      description: p.title || null,
      providerRank: rank,
    }));
  return { candidates, anomaly: null };
}

async function searchPixabayPhoto(query, { perPage = 6, orientation } = {}) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return { candidates: [], anomaly: "PIXABAY_API_KEY not set — skipped (photo)" };
  const params = new URLSearchParams({
    key,
    q: query,
    per_page: String(Math.max(3, perPage)),
    image_type: "photo",
  });
  if (orientation) params.set("orientation", orientation === "landscape" ? "horizontal" : "vertical");
  const data = await fetchJson(`https://pixabay.com/api/?${params}`, {}, { source: "pixabay" });
  const candidates = (data.hits ?? []).map((p, rank) => ({
    source: "pixabay",
    mediaType: "photo",
    id: `pixabay-p${p.id}`,
    url: p.pageURL,
    previewUrl: p.previewURL,
    width: p.imageWidth,
    height: p.imageHeight,
    durationSeconds: null,
    orientation: (p.imageWidth ?? 1) >= (p.imageHeight ?? 0) ? "landscape" : "portrait",
    downloadUrl: p.largeImageURL ?? p.webformatURL,
    description: p.tags || null,
    providerRank: rank,
  }));
  return { candidates, anomaly: null };
}

const VIDEO_PROVIDERS = { pexels: searchPexelsVideo, pixabay: searchPixabayVideo, coverr: searchCoverrVideo, videvo: searchVidevoVideo, archiveorg: searchArchiveOrgVideo, wikimedia: searchWikimediaVideo }; // videvo kept for back-compat only — its API is partner-only (no self-service key), so it is NOT in the default --sources list
const PHOTO_PROVIDERS = { pexels: searchPexelsPhoto, pixabay: searchPixabayPhoto, openverse: searchOpenversePhoto }; // Coverr/Videvo are video-only

// ---------- ranking ----------
//
// Neither Pexels nor Pixabay exposes a numeric relevance score — both return
// results pre-sorted by their own relevance ranking. So `providerRank` (0 =
// that provider's own top pick for this query) is the real accuracy signal;
// everything else here is a tiebreak, not a substitute for it.

function rankCandidates(candidates, { targetDuration, orientation, exclude, mediaBias = "video" }) {
  const excludeSet = new Set(exclude ?? []);
  return candidates
    .filter((c) => c.downloadUrl && !excludeSet.has(c.id))
    .map((c) => {
      let score = 0;
      // Provider relevance rank dominates: the top-ranked result from any
      // provider/mediaType starts well ahead of anything ranked lower.
      score += Math.max(0, 10 - (c.providerRank ?? 5) * 2);
      if (orientation && c.orientation === orientation) score += 3;
      if (c.mediaType === "video" && c.durationSeconds) {
        const ratio = c.durationSeconds / Math.max(0.5, targetDuration);
        if (ratio >= 1 && ratio <= 3) score += 2;
        else if (ratio >= 1) score += 1;
        else score -= 2; // shorter than the beat — would need looping, avoid
      }
      if (c.width >= 1280) score += 1;
      // Modest, explicit tiebreak — video edges out a photo only when their
      // relevance ranks are otherwise close; a clearly better-ranked photo
      // still wins, so a beat with no good video match still gets a real
      // (accurate) photo instead of a forced mediocre clip.
      if (mediaBias === "video" && c.mediaType === "video") score += 1;
      return { ...c, _score: score };
    })
    .sort((a, b) => b._score - a._score);
}

// ---------- main ----------

async function main() {
  const argv = process.argv.slice(2);
  const query = flag(argv, "query", null);
  const outPath = flag(argv, "out", null);
  const duration = Number(flag(argv, "duration", "5"));
  const orientation = flag(argv, "orientation", "landscape");
  const exclude = (flag(argv, "exclude", "") || "").split(",").filter(Boolean);
  await openverseToken(); // no-op unless OPENVERSE_CLIENT_ID/SECRET are configured
  const sources = (flag(argv, "sources", "pixabay,coverr") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const mediaTypes = (flag(argv, "media", "video,photo") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  // craft-upgrade E2: every provider function already accepted a perPage
  // param (default 6) but main() never wired it to anything — every beat
  // got the same fixed pool size regardless of how long it is. A short
  // beat (~2-3s) genuinely doesn't need a deep pool; a long beat (6s+,
  // the same threshold Step 5's --cutaway-asset guidance already uses)
  // benefits from a wider pool because it needs a good candidate for BOTH
  // the primary shot and a real second/cutaway shot (see E1 below), so it
  // has to search deeper to have real options for both, not just one.
  const perPage = Number(flag(argv, "per-page", "6"));

  if (!query || !outPath) {
    console.error("Usage: fetch-clips.mjs --query <text> --out <path> [--duration N] [--orientation landscape|portrait] [--exclude id1,id2] [--sources pixabay,pexels,coverr,openverse] [--media video,photo] [--per-page N]");
    process.exit(1);
  }

  const anomalies = [];
  const jobs = [];
  if (mediaTypes.includes("video")) {
    for (const s of sources) {
      const fn = VIDEO_PROVIDERS[s];
      if (!fn) continue;
      jobs.push(
        fn(query, { orientation, perPage }).then(
          ({ candidates, anomaly }) => {
            if (anomaly) anomalies.push(`${s}: ${anomaly}`);
            return candidates;
          },
          (e) => {
            anomalies.push(`${s} (video): ${e.message}`);
            return [];
          },
        ),
      );
    }
  }
  if (mediaTypes.includes("photo")) {
    for (const s of sources) {
      const fn = PHOTO_PROVIDERS[s];
      if (!fn) continue; // e.g. videvo has no photo adapter — silently skipped, not an anomaly
      jobs.push(
        fn(query, { orientation, perPage }).then(
          ({ candidates, anomaly }) => {
            if (anomaly) anomalies.push(`${s}: ${anomaly}`);
            return candidates;
          },
          (e) => {
            anomalies.push(`${s} (photo): ${e.message}`);
            return [];
          },
        ),
      );
    }
  }

  const results = await Promise.all(jobs);
  const allCandidates = results.flat();
  const ranked = rankCandidates(allCandidates, { targetDuration: duration, orientation, exclude });
  const chosen = ranked[0] ?? null;

  const payload = {
    query,
    targetDuration: duration,
    orientation,
    candidates: ranked,
    chosen,
    anomalies,
  };

  mkdirSync(dirname(resolve(outPath)), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2));

  const beatId = (outPath.match(/beat-([^./]+)/) || [])[1] ?? "?";

  if (!chosen) {
    console.error(`✗ fetch-clips: no usable candidate for "${query}" (${ranked.length} scored, ${allCandidates.length} raw) — anomalies: ${anomalies.join("; ") || "none"}`);
    logIfRequested(argv, "Step 3 — fetch-clips", `beat ${beatId}: NO usable candidate for "${query}"`, {
      "candidates scored": ranked.length,
      "candidates raw": allCandidates.length,
      anomalies: anomalies.join("; ") || "none",
    });
    process.exit(2);
  }
  console.log(`✓ fetch-clips: "${query}" → ${chosen.source}/${chosen.id} [${chosen.mediaType}] (${chosen.width}x${chosen.height}${chosen.durationSeconds ? `, ${chosen.durationSeconds}s` : ""}) [${ranked.length} candidates]${anomalies.length ? " — anomalies: " + anomalies.join("; ") : ""}`);
  const bud = budgetReport();
  if (Object.keys(bud).length) console.log(`  budget: ${Object.entries(bud).map(([k, v]) => `${k} ${v.used}/${v.limit}${v.penalised ? ` (backed off ${v.penalised}x)` : ""}`).join(" · ")}`);

  logIfRequested(argv, "Step 3 — fetch-clips", `beat ${beatId}: query "${query}"`, {
    "script-level pick": `${chosen.source}/${chosen.id} [${chosen.mediaType}] ${chosen.width}x${chosen.height}${chosen.durationSeconds ? `, ${chosen.durationSeconds}s` : ""}`,
    "candidates (scored/raw)": `${ranked.length}/${allCandidates.length}`,
    "top 3 by score": ranked.slice(0, 3).map((c) => `${c.source}/${c.id}(${c._score})`).join(", ") || "none",
    anomalies: anomalies.join("; ") || "none",
  });
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((e) => {
    console.error(`✗ fetch-clips: ${e.message}`);
    process.exit(1);
  });
}

export { searchPexelsVideo, searchPixabayVideo, searchVidevoVideo, searchArchiveOrgVideo, searchWikimediaVideo, searchPexelsPhoto, searchPixabayPhoto, searchOpenversePhoto, rankCandidates };
