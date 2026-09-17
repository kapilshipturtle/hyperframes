// SEMANTIC TRIGGERS: what in the narration earns a graphic.
//
// The defect this fixes: a film of 22 shots carried 0 motion graphics and 1 text
// overlay, because motiongfx only fired on special layouts (stat cards, grids,
// list reveals). 18 plain full-screen clips were structurally incapable of
// carrying anything, so the film read as a narrated slideshow.
//
// The renderer was never the problem — it already draws 18 graphic types and
// composites them as an independent track ABOVE all b-roll. Only the planner
// restricted them.
//
// MEASURED RULES (Adobe Research B-Script, 1,100 YouTube vlogs,
// ar5iv.arxiv.org/html/1902.11216):
//   * "For 73% of the inserted B-roll, the query word can be found in a
//     neighborhood of 1 second before or after the starting point" -> a graphic
//     belongs within +/-1s of ITS TRIGGER WORD, not at a shot boundary.
//   * Trigger on LEXIS, not audio: the same paper found pauses and blinks were
//     WEAKER predictors than keyword signals. So we do not fire on silence.
//   * Corpus median gap between visual inserts is 9s -> ~13 events over 2 min.
//
// The trigger -> graphic-type mapping below is NOT published anywhere; it is
// assembled from the measured window plus the element catalogue observed in
// long-form frames ("keyword pops and quote cards, credit tags and spec cards,
// scorecards and bar charts, sticker stamps and floating labels, highlighter
// marks and arrows"). Treat the mapping as tunable, the window as fixed.
import type { Word } from "../types.js";

export type TriggerKind =
  | "number" | "date" | "place" | "person" | "quote" | "comparison"
  | "enumeration" | "causal" | "source";

export interface Trigger {
  kind: TriggerKind;
  wordId: number;        // the word that earned it
  text: string;          // the matched surface form
  /** Higher wins when one shot has several candidates. */
  priority: number;
}

// number > quote > comparison > place > date > source: a spoken statistic is the
// most concrete thing a graphic can add; a source credit the least.
const PRIORITY: Record<TriggerKind, number> = {
  number: 100, quote: 90, comparison: 80, enumeration: 75,
  place: 70, person: 65, date: 60, causal: 40, source: 20,
};

// A bare integer under this is usually "one of", "two things" — not a statistic.
const MIN_INTERESTING_NUMBER = 3;

const NUMERIC = /^\$?[\d][\d,.]*%?$/;
const SCALE = /^(million|billion|trillion|thousand|percent|percentage)$/i;
const YEAR = /^(1[5-9]\d{2}|20[0-4]\d)s?$/;
const COMPARISON = /^(twice|half|double|triple|more|less|fewer|greater|compared|versus|vs)$/i;
const ENUMERATION = /^(first|second|third|fourth|fifth|finally|lastly)$/i;
const CAUSAL = /^(because|therefore|consequently)$/i;
// Sentence-initial capitals are not evidence of a proper noun, so a place must
// also not be the first word of its sentence.
const PROPER = /^[A-Z][a-z]{2,}$/;
// A capitalised word after a title, or followed by a surname, is a PERSON, not a
// place — a location pin on someone's name is the kind of confidently wrong
// annotation that reads worse than no annotation at all.
const TITLE = /^(mr|mrs|ms|dr|prof|professor|president|senator|sir|lord|king|queen|general|captain)\.?$/i;
// Words that look like place-name context and raise confidence it IS a place.
const PLACE_CUE = /^(in|from|across|throughout|near|around|to|at)$/i;
// Geographic word-shape: a capitalised word ending like a place usually is one.
const GEO_SUFFIX = /(land|burg|shire|ton|ville|stan|dam|port|field|ford|mouth|bury|caster|chester|City|Island|Valley|River|Bay|Coast)$/;
// A second word that is itself a geographic noun ("New York City", "Hudson River").
const GEO_WORD = /^(City|Island|Valley|River|Bay|Coast|County|State|Province|Republic|Kingdom|Empire|Sea|Ocean|Desert|Mountains?)$/;
// A small gazetteer for names that carry no geographic word-shape. Regexes
// cannot tell "South Africa" from a person; a list can. Deliberately short —
// it covers the names that actually recur in documentary narration, and an
// unknown proper noun is simply left unlabelled rather than guessed at.
const GAZETTEER = new Set([
  "africa", "america", "asia", "europe", "australia", "antarctica",
  "britain", "england", "scotland", "wales", "ireland", "france", "germany",
  "italy", "spain", "portugal", "greece", "turkey", "russia", "ukraine",
  "poland", "sweden", "norway", "denmark", "finland", "netherlands", "belgium",
  "switzerland", "austria", "china", "japan", "korea", "india", "pakistan",
  "vietnam", "thailand", "indonesia", "singapore", "malaysia", "philippines",
  "egypt", "nigeria", "kenya", "ethiopia", "morocco", "algeria",
  "brazil", "argentina", "chile", "peru", "colombia", "mexico", "canada",
  "cuba", "jamaica", "israel", "iran", "iraq", "syria", "saudi", "emirates",
  "rome", "london", "paris", "berlin", "moscow", "beijing", "tokyo", "delhi",
  "cairo", "athens", "venice", "florence", "vienna", "prague", "budapest",
  "chicago", "boston", "detroit", "seattle", "denver", "atlanta", "houston",
  "midwest", "appalachia", "siberia", "sahara", "amazon", "himalayas",
]);
const inGazetteer = (w: string): boolean => GAZETTEER.has(w.toLowerCase());

const clean = (s: string): string => s.trim().replace(/^[^\w$]+|[^\w%]+$/g, "");

/** Extract every trigger in a word list, in narration order. */
export function findTriggers(words: Word[]): Trigger[] {
  const out: Trigger[] = [];
  const push = (kind: TriggerKind, w: Word, text: string) =>
    out.push({ kind, wordId: w.id, text, priority: PRIORITY[kind] });

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const t = clean(w.text);
    if (!t) continue;
    const prev = i > 0 ? clean(words[i - 1].text) : "";
    const next = i + 1 < words.length ? clean(words[i + 1].text) : "";

    // A year reads as a date, not a quantity, even though it is numeric.
    if (YEAR.test(t)) { push("date", w, t); continue; }

    if (NUMERIC.test(t)) {
      const bare = Number(t.replace(/[^0-9.]/g, ""));
      const scaled = SCALE.test(next);
      const money = t.startsWith("$");
      const pct = t.endsWith("%");
      // "$5", "40%", "5 million" are all statistics; a bare "two" is not.
      if (money || pct || scaled || (Number.isFinite(bare) && bare >= MIN_INTERESTING_NUMBER)) {
        push("number", w, scaled ? `${t} ${next}` : t);
      }
      continue;
    }

    if (COMPARISON.test(t)) { push("comparison", w, t); continue; }
    if (ENUMERATION.test(t)) { push("enumeration", w, t); continue; }
    if (CAUSAL.test(t)) { push("causal", w, t); continue; }

    // Proper noun, not sentence-initial. Multi-word names collapse to one
    // trigger so "New York Stock Exchange" does not fire four times.
    if (PROPER.test(t) && i > 0 && !/[.!?]$/.test(words[i - 1].text.trim())) {
      if (PROPER.test(prev)) continue;                  // mid-name, already fired
      // Distinguish a person from a place. Getting this wrong puts a location
      // pin on someone's name, which is worse than adding nothing.
      // "New York City" and "South Africa" are two capitalised words in a row
      // but are places, so a geographic suffix on EITHER word wins over the
      // two-capitals heuristic. Only a title, or a first name we cannot place,
      // makes it a person.
      const pairIsGeo = GEO_SUFFIX.test(t) || GEO_SUFFIX.test(next)
        || PLACE_CUE.test(prev) || GEO_WORD.test(next)
        || inGazetteer(t) || inGazetteer(next);
      const isPerson = TITLE.test(prev) || (PROPER.test(next) && !pairIsGeo);
      if (isPerson) { push("person", w, PROPER.test(next) ? `${t} ${next}` : t); continue; }
      // From here the span is geographic. Fall through to the place branch even
      // when the gazetteer hit was on the SECOND word ("South Africa"), which
      // pairIsGeo already accounts for.
      // Treat it as a place when the preposition before it says so, OR when it
      // carries a geographic suffix (-land, -burg, -shire, -ton, City, Island...).
      // Anything else capitalised is left alone: an unlabelled proper noun is
      // better than a wrong label.
      if (PLACE_CUE.test(prev) || GEO_SUFFIX.test(t) || inGazetteer(t) || pairIsGeo) {
        // Capture the whole span so the label reads "New York City", not "New".
        let span = t;
        for (let k = i + 1; k < words.length && k <= i + 2; k++) {
          const nx = clean(words[k].text);
          if (!PROPER.test(nx) && !GEO_WORD.test(nx)) break;
          span += ` ${nx}`;
        }
        push("place", w, span);
      }
      continue;
    }
  }
  return out;
}

/** Trigger -> graphic type. Unmapped kinds carry text rather than a graphic. */
export const GRAPHIC_FOR: Partial<Record<TriggerKind, string>> = {
  number: "stat-counter",
  comparison: "bar-chart-mini",
  enumeration: "checklist-tick",
  place: "icon-pop",
  date: "icon-pop",
  source: "corner-credit",
  // `person` deliberately has NO graphic: a name wants a lower third, which is
  // a text item, and we cannot verify the person is on screen.
};

/** Seconds a graphic stays on screen, by kind. Lower thirds are measured at
 *  3-5 s ("long enough to read aloud twice"); count-ups at 2-4 s. */
export const HOLD_SECONDS: Record<TriggerKind, number> = {
  number: 3.0, quote: 5.0, comparison: 4.0, enumeration: 3.0,
  place: 3.5, person: 4.0, date: 3.0, causal: 2.0, source: 3.5,
};
