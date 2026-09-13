// overlays-cards.mjs — the DESIGNED CARD archetypes the reference channels lean on
// (TheCheapFix / EliYoderSecrets / HiddenHomestead frames, 2026-09-06 comparison):
// poster-style info cards with a title and ticked bullets, a footage+side-panel
// layout, serif number badges on coloured plates, price tags, section title
// cards. These are what "proper motion graphics" meant in the user's review —
// a floating white word is not a card. Same contract as lib/overlays.mjs; each
// returns { html, css, js, mediaCss? } — `mediaCss` (side-panel only) is extra
// CSS build-frame applies to the footage wrap so the clip shares the frame.
//
// Typography is template-driven via `style` (build-frame --profile):
//   style.card = { font: "serif"|"bold-sans"|"condensed-sans", plate: "#f4ecd8"|"#111", ink, accent, accent2 }
// Defaults reproduce the Eli/Hidden look: serif display type, cream plate,
// ink text, orange + teal accents. CheapFix-style templates pass bold-sans,
// black plate, white ink, yellow accent.
import { escapeHtml } from "./overlays.mjs";

const FONTS = {
  serif: '700 1em/1.15 "Playfair Display", "Libre Baskerville", Georgia, "Times New Roman", serif',
  "bold-sans": '800 1em/1.1 "Inter", "Montserrat", -apple-system, sans-serif',
  "condensed-sans": '700 1em/1.05 "Oswald", "Barlow Condensed", "Inter", sans-serif',
  handwritten: '700 1em/1.1 "Caveat", "Comic Sans MS", cursive',
};
function card(style = {}) {
  const c = style.card || {};
  return {
    font: FONTS[c.font || "serif"] || FONTS.serif,
    bodyFont: FONTS[c.bodyFont || (c.font === "serif" ? "serif" : "regular")] || '500 1em/1.35 "Inter", -apple-system, sans-serif',
    plate: c.plate || "#f4ecd8",
    ink: c.ink || "#1c1c1c",
    accent: c.accent || "#f28c28",
    accent2: c.accent2 || "#2ab7c9",
    dim: c.dim != null ? c.dim : 0.55,
    exit: style.exit || "cut",
    exitAt: Number(style.exitAt) > 0 ? Number(style.exitAt) : null,
  };
}
const SHADOW = "0 2px 6px rgba(0,0,0,0.35), 0 12px 40px rgba(0,0,0,0.35)";
function exitJS(sel, s, duration) {
  if (s.exit === "fade") return [`tl.to("${sel}", { opacity: 0, duration: 0.3, ease: "power2.in" }, ${Math.max(0.3, (s.exitAt || duration) - 0.35).toFixed(2)});`];
  if (s.exit === "cut" && s.exitAt && s.exitAt < duration) return [`tl.set("${sel}", { opacity: 0 }, ${s.exitAt.toFixed(2)});`];
  return [];
}

// ---------- info-card ----------
// Poster card: title + 2-5 bullets, each with a tick (or number) drawing in one
// by one, over dimmed footage. `bullets` array, `title`, optional `kicker`
// (small label above the title), `marker` "check"|"number"|"dot".
export function infoCard({ title, bullets = [], kicker, marker = "check", enterAt, duration, elId, style }) {
  if (!title || !bullets.length) throw new Error(`overlays-cards infoCard: "title" and "bullets" are required.`);
  const s = card(style); const items = bullets.slice(0, 5);
  const mark = (i) => marker === "number" ? `<span class="ov-ic-mk ov-ic-num">${i + 1}</span>` : marker === "dot" ? `<span class="ov-ic-mk ov-ic-dot"></span>` : `<span class="ov-ic-mk ov-ic-chk">✓</span>`;
  const html = `<div class="ov-ic-scrim" id="${elId}-scrim"></div><div class="ov-ic" id="${elId}">${kicker ? `<div class="ov-ic-kicker">${escapeHtml(kicker)}</div>` : ""}<div class="ov-ic-title" id="${elId}-t">${escapeHtml(title)}</div><div class="ov-ic-rule"></div>${items.map((b, i) => `<div class="ov-ic-item" id="${elId}-b${i}">${mark(i)}<span class="ov-ic-txt">${escapeHtml(b)}</span></div>`).join("")}</div>`;
  const css = `
    .ov-ic-scrim { position: absolute; inset: 0; background: rgba(0,0,0,${s.dim}); opacity: 0; pointer-events: none; }
    .ov-ic { position: absolute; left: 50%; top: 46%; transform: translate(-50%,-50%); width: 1060px; max-width: 78%; max-height: 700px; overflow: hidden; background: ${s.plate}; color: ${s.ink}; padding: 44px 70px 48px; border-radius: 14px; box-shadow: ${SHADOW}; opacity: 0; } /* sits above the caption band (bottom ~130 px) */
    .ov-ic-kicker { font: ${s.bodyFont}; font-size: 24px; letter-spacing: 0.18em; text-transform: uppercase; color: ${s.accent}; margin-bottom: 10px; }
    .ov-ic-title { font: ${s.font}; font-size: 56px; line-height: 1.1; }
    .ov-ic-rule { height: 4px; width: 120px; background: ${s.accent}; margin: 18px 0 26px; transform-origin: left center; }
    .ov-ic-item { display: flex; align-items: flex-start; gap: 18px; font: ${s.bodyFont}; font-size: 32px; margin: 12px 0; opacity: 0; }
    .ov-ic-mk { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font: 800 26px/1 "Inter", sans-serif; }
    .ov-ic-chk { border: 3px solid ${s.ink}; color: ${s.ink}; }
    .ov-ic-num { background: ${s.accent}; color: #1a1a1a; }
    .ov-ic-dot { width: 16px; height: 16px; margin: 12px 12px; border-radius: 50%; background: ${s.accent2}; }
    .ov-ic-txt { padding-top: 3px; }`;
  const js = [
    `tl.to("#${elId}-scrim", { opacity: 1, duration: 0.3 }, ${enterAt.toFixed(2)});`,
    `tl.fromTo("#${elId}", { opacity: 0, y: 40, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: "power3.out" }, ${enterAt.toFixed(2)});`,
    `tl.fromTo("#${elId} .ov-ic-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.out" }, ${(enterAt + 0.3).toFixed(2)});`,
    ...items.map((_, i) => `tl.fromTo("#${elId}-b${i}", { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, ${(enterAt + 0.55 + i * 0.32).toFixed(2)});`),
    ...exitJS(`#${elId}`, s, duration), ...exitJS(`#${elId}-scrim`, s, duration),
  ];
  return { html, css, js };
}

// ---------- side-panel ----------
// Footage keeps the LEFT 58 % of the frame (build-frame applies `mediaCss`),
// a card fills the right with a title + 2-5 bullets — the "Earth's Cool
// Secret" layout. Bullets can be the sentence's key claims.
export function sidePanel({ title, bullets = [], kicker, side = "right", enterAt, duration, elId, style }) {
  if (!title) throw new Error(`overlays-cards sidePanel: "title" is required.`);
  const s = card(style); const items = bullets.slice(0, 5); const right = side !== "left";
  const html = `<div class="ov-sp ${right ? "ov-sp-right" : "ov-sp-left"}" id="${elId}">${kicker ? `<div class="ov-sp-kicker">${escapeHtml(kicker)}</div>` : ""}<div class="ov-sp-title">${escapeHtml(title)}</div>${items.map((b, i) => `<div class="ov-sp-item" id="${elId}-b${i}"><span class="ov-sp-dot"></span>${escapeHtml(b)}</div>`).join("")}</div>`;
  const css = `
    .ov-sp { position: absolute; top: 0; bottom: 0; width: 42%; background: ${s.plate}; color: ${s.ink}; padding: 120px 64px 0; box-sizing: border-box; opacity: 0; }
    .ov-sp-right { right: 0; } .ov-sp-left { left: 0; }
    .ov-sp-kicker { font: ${s.bodyFont}; font-size: 22px; letter-spacing: 0.18em; text-transform: uppercase; color: ${s.accent}; margin-bottom: 14px; }
    .ov-sp-title { font: ${s.font}; font-size: 54px; line-height: 1.1; margin-bottom: 34px; }
    .ov-sp-item { display: flex; gap: 16px; align-items: flex-start; font: ${s.bodyFont}; font-size: 30px; line-height: 1.3; margin: 16px 0; opacity: 0; }
    .ov-sp-dot { flex: 0 0 auto; width: 12px; height: 12px; margin-top: 12px; border-radius: 50%; background: ${s.accent}; }`;
  const mediaCss = `
    /* side-panel layout: the footage wrap shares the frame with the card */
    .broll-wrap { inset: 0 !important; width: ${right ? 58 : 58}% !important; height: 100% !important; ${right ? "left: 0 !important;" : "left: 42% !important;"} }`;
  const js = [
    `tl.fromTo("#${elId}", { opacity: 0, x: ${right ? 60 : -60} }, { opacity: 1, x: 0, duration: 0.45, ease: "power3.out" }, ${enterAt.toFixed(2)});`,
    ...items.map((_, i) => `tl.fromTo("#${elId}-b${i}", { opacity: 0, x: ${right ? 20 : -20} }, { opacity: 1, x: 0, duration: 0.3, ease: "power3.out" }, ${(enterAt + 0.45 + i * 0.3).toFixed(2)});`),
    ...exitJS(`#${elId}`, s, duration),
  ];
  return { html, css, js, mediaCss };
}

// ---------- number-badge ----------
// Serif number + unit on a coloured plate with a small label beneath ("55°F"
// / "GROUND TEMP", "125 LBS/FT³"). `value` (already formatted), `unit`, `label`,
// `position` corner|center|lower-center.
export function numberBadge({ value, unit = "", label, position = "upper-left", enterAt, duration, elId, style }) {
  if (value == null) throw new Error(`overlays-cards numberBadge: "value" is required.`);
  const s = card(style);
  // The MIDDLE row was missing until 2026-09-07. Measured over 3163 reference text
  // events, 59.5 % of all on-screen text sits in it (middle-center 30.1 %,
  // middle-left 16.5 %, middle-right 12.9 %) — so an overlay layer without it can
  // only ever use the corners and the caption band, which reads as one repeated
  // position. `center` is kept as an alias of middle-center for back-compatibility.
  const pos = { "upper-left": "left: 90px; top: 110px;", "upper-center": "left: 50%; top: 110px; transform: translateX(-50%);", "upper-right": "right: 90px; top: 110px;", "middle-left": "left: 90px; top: 46%; transform: translateY(-50%);", "middle-center": "left: 50%; top: 46%; transform: translate(-50%,-50%);", "middle-right": "right: 90px; top: 46%; transform: translateY(-50%);", "lower-left": "left: 90px; bottom: 170px;", "lower-right": "right: 90px; bottom: 170px;", center: "left: 50%; top: 46%; transform: translate(-50%,-50%);", "lower-center": "left: 50%; bottom: 170px; transform: translateX(-50%);" }[position] || "left: 90px; top: 110px;";
  const html = `<div class="ov-nb" id="${elId}" style="${pos}"><div class="ov-nb-num">${escapeHtml(String(value))}<span class="ov-nb-unit">${escapeHtml(unit)}</span></div>${label ? `<div class="ov-nb-label">${escapeHtml(label)}</div>` : ""}</div>`;
  const css = `
    .ov-nb { position: absolute; text-align: center; opacity: 0; }
    .ov-nb-num { font: ${s.font}; font-size: 124px; line-height: 1; color: #fff; text-shadow: 0 3px 10px rgba(0,0,0,0.55); letter-spacing: -0.01em; }
    .ov-nb-unit { font-size: 60px; margin-left: 8px; }
    .ov-nb-label { display: inline-block; margin-top: 12px; font: ${s.bodyFont}; font-size: 26px; letter-spacing: 0.16em; text-transform: uppercase; background: ${s.accent}; color: #1a1a1a; padding: 8px 22px; border-radius: 6px; }`;
  const js = [`tl.fromTo("#${elId}", { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.32, ease: "back.out(1.5)" }, ${enterAt.toFixed(2)});`, ...exitJS(`#${elId}`, s, duration)];
  return { html, css, js };
}

// ---------- price-tag ----------
// "$20 a Bottle" — serif on a small cream card, lower-left/right or centre.
export function priceTag({ text, position = "lower-left", enterAt, duration, elId, style }) {
  if (!text) throw new Error(`overlays-cards priceTag: "text" is required.`);
  const s = card(style);
  const pos = { "upper-left": "left: 90px; top: 110px;", "upper-center": "left: 50%; top: 110px; transform: translateX(-50%);", "upper-right": "right: 90px; top: 110px;", "middle-left": "left: 90px; top: 46%; transform: translateY(-50%);", "middle-center": "left: 50%; top: 46%; transform: translate(-50%,-50%);", "middle-right": "right: 90px; top: 46%; transform: translateY(-50%);", "lower-left": "left: 90px; bottom: 170px;", "lower-right": "right: 90px; bottom: 170px;", "lower-center": "left: 50%; bottom: 170px; transform: translateX(-50%);", center: "left: 50%; top: 46%; transform: translate(-50%,-50%);" }[position] || "left: 90px; bottom: 170px;";
  const html = `<div class="ov-pt" id="${elId}" style="${pos}">${escapeHtml(text)}</div>`;
  const css = `.ov-pt { position: absolute; font: ${s.font}; font-size: 54px; background: ${s.plate}; color: ${s.ink}; padding: 18px 34px; border-radius: 10px; box-shadow: ${SHADOW}; opacity: 0; white-space: nowrap; border-left: 10px solid ${s.accent}; }`;
  const js = [`tl.fromTo("#${elId}", { opacity: 0, y: 24, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.34, ease: "back.out(1.4)" }, ${enterAt.toFixed(2)});`, ...exitJS(`#${elId}`, s, duration)];
  return { html, css, js };
}

// ---------- title-card ----------
// Section title over dimmed footage: kicker ("PART 2"), serif title, optional
// subtitle, accent rule drawing on. Holds until the cut (measured: titles stay).
export function titleCard({ title, subtitle, kicker, enterAt, duration, elId, style }) {
  if (!title) throw new Error(`overlays-cards titleCard: "title" is required.`);
  const s = card(style);
  const html = `<div class="ov-tc-scrim" id="${elId}-scrim"></div><div class="ov-tc" id="${elId}">${kicker ? `<div class="ov-tc-kicker">${escapeHtml(kicker)}</div>` : ""}<div class="ov-tc-title">${escapeHtml(title)}</div><div class="ov-tc-rule" id="${elId}-rule"></div>${subtitle ? `<div class="ov-tc-sub">${escapeHtml(subtitle)}</div>` : ""}</div>`;
  const css = `
    .ov-tc-scrim { position: absolute; inset: 0; background: rgba(0,0,0,${s.dim}); opacity: 0; pointer-events: none; }
    .ov-tc { position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%); text-align: center; max-width: 80%; opacity: 0; }
    /* CONTRAST (ISS-0049, measured 2026-09-13): the accent kicker over the
       0.55 scrim measured 2.79:1 against a 3:1 minimum on a BRIGHT frame and
       failed a real CI check, killing a whole 31-chunk render at the lint gate.
       The scrim alone cannot guarantee contrast because it does not know how
       bright the footage behind it is. A text-shadow does — it travels with the
       glyphs, so the accent stays legible on any background without dimming the
       footage further or abandoning the brand accent colour. */
    /* CONTRAST (ISS-0049, measured 2026-09-13): the accent kicker sat directly
       on raw footage — the card's own scrim animates from opacity 0, so at the
       audited timestamp there is nothing between the text and the picture. On a
       bright frame it measured 2.79:1 against a 3:1 minimum and failed the CI
       lint gate, killing a whole 31-chunk render.
       NO FLAT COLOUR CAN FIX THIS, measured: #f28c28 reads 6.79:1 on dark
       footage but 1.47:1 on bright; darkening it to pass bright (#a34f08 ->
       3.41:1) drops it to 2.92:1 on dark. The text needs its OWN opaque
       backing, which is what makes it independent of the footage behind it. */
    .ov-tc-kicker { font: ${s.bodyFont}; font-size: 26px; letter-spacing: 0.22em; text-transform: uppercase; color: ${s.accent}; margin-bottom: 14px; display: inline-block; background: #0d0d0d; padding: 6px 14px; border-radius: 3px; }
    .ov-tc-title { font: ${s.font}; font-size: 92px; line-height: 1.05; color: #fff; text-shadow: 0 3px 12px rgba(0,0,0,0.5); }
    .ov-tc-rule { width: 160px; height: 5px; background: ${s.accent}; margin: 22px auto; transform-origin: center; }
    .ov-tc-sub { font: ${s.bodyFont}; font-size: 34px; color: rgba(255,255,255,0.85); }`;
  const js = [`tl.to("#${elId}-scrim", { opacity: 1, duration: 0.35 }, ${enterAt.toFixed(2)});`,
    `tl.fromTo("#${elId}", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, ${(enterAt + 0.05).toFixed(2)});`,
    `tl.fromTo("#${elId}-rule", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "power2.out" }, ${(enterAt + 0.4).toFixed(2)});`,
    ...exitJS(`#${elId}`, s, duration), ...exitJS(`#${elId}-scrim`, s, duration)];
  return { html, css, js };
}

export const CARD_ARCHETYPES = { "info-card": infoCard, "side-panel": sidePanel, "number-badge": numberBadge, "price-tag": priceTag, "title-card": titleCard };
export const CARD_DEFAULT_SFX = { "info-card": "paper-slide", "side-panel": "paper-slide", "number-badge": "ding", "price-tag": "cash", "title-card": "whoosh-sweep" };
