import { describe, it, expect } from "vitest";
import { findTriggers, GRAPHIC_FOR, HOLD_SECONDS } from "../scripts/ts/brain/triggers.js";
import type { Word } from "../scripts/ts/types.js";

const mk = (s: string): Word[] =>
  s.split(/\s+/).map((text, id) => ({ id, text, startMs: id * 300, endMs: id * 300 + 280 } as Word));
const kinds = (s: string) => findTriggers(mk(s)).map((t) => t.kind);
const find = (s: string, kind: string) => findTriggers(mk(s)).find((t) => t.kind === kind);

describe("semantic triggers", () => {
  it("a spoken statistic earns a number trigger", () => {
    expect(find("Inflation reached 40 percent that year.", "number")?.text).toBe("40 percent");
    expect(find("Wages fell by $4,000 in a decade.", "number")?.text).toBe("$4,000");
    expect(find("Output rose 12 million tonnes.", "number")?.text).toBe("12 million");
  });

  it("a bare small number is NOT a statistic", () => {
    // "two things", "one of" — a graphic here would be noise
    expect(kinds("There were two reasons it failed.")).not.toContain("number");
  });

  it("a year is a date, not a quantity", () => {
    expect(find("By 1971 the system had collapsed.", "date")?.text).toBe("1971");
    expect(kinds("By 1971 the system had collapsed.")).not.toContain("number");
  });

  it("places are distinguished from people", () => {
    // Getting this wrong puts a location pin on somebody's name.
    expect(find("Trade moved to New York City.", "place")?.text).toBe("New York City");
    expect(find("Factories across the Midwest closed.", "place")?.text).toBe("Midwest");
    // A gazetteer entry on the SECOND word of a pair still resolves as a place.
    expect(find("The mines of South Africa closed.", "place")?.text).toBe("South Africa");
    // Mid-sentence so the leading capital is real evidence, not sentence case.
    expect(find("A report by Marc Fontaine argued otherwise.", "person")).toBeTruthy();
    expect(kinds("A report by Marc Fontaine argued otherwise.")).not.toContain("place");
  });

  it("an unknown capitalised word is left alone rather than guessed at", () => {
    expect(kinds("The Zorblatt initiative failed.")).toEqual([]);
  });

  it("sentence-initial capitals are not proper nouns", () => {
    expect(kinds("Factories closed. Markets followed.")).toEqual([]);
  });

  it("comparisons and enumerations fire", () => {
    expect(kinds("Output was twice the 1960 level.")).toContain("comparison");
    expect(kinds("First the banks failed.")).toContain("enumeration");
  });

  it("priority puts a statistic above a place", () => {
    const t = findTriggers(mk("Rotterdam handled 40 percent of trade."));
    t.sort((a, b) => b.priority - a.priority);
    expect(t[0].kind).toBe("number");
  });

  it("a person has NO graphic — a name wants a lower third we cannot verify", () => {
    expect(GRAPHIC_FOR.person).toBeUndefined();
    expect(GRAPHIC_FOR.number).toBe("stat-counter");
  });

  it("every trigger kind has a readable hold", () => {
    for (const k of Object.keys(HOLD_SECONDS) as (keyof typeof HOLD_SECONDS)[]) {
      // Under 1.5s nothing can be read.
      expect(HOLD_SECONDS[k]).toBeGreaterThanOrEqual(2.0);
      expect(HOLD_SECONDS[k]).toBeLessThanOrEqual(6.0);
    }
  });

  it("abstract narration yields no graphics, and that is correct", () => {
    // Our own worldeconomy intro: no numbers, dates or comparisons exist in it,
    // so no trigger system can honestly put a stat counter on it.
    const s = "In every century humanity believes its moment is unique.";
    expect(findTriggers(mk(s)).filter((t) => GRAPHIC_FOR[t.kind])).toEqual([]);
  });

  it("is deterministic", () => {
    const s = "By 1971 Rotterdam handled 40 percent of trade.";
    expect(findTriggers(mk(s))).toEqual(findTriggers(mk(s)));
  });
});
