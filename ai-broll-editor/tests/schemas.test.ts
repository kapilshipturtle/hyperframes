import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCHEMA_DIR, SCHEMA_NAMES, listSchemas, newAjv, validateAgainst } from "../scripts/ts/lib/schema.js";
import { GRADES, LAYOUTS } from "../scripts/ts/types.js";

const FIXTURES = join(__dirname, "fixtures", "spec-examples");
const load = (name: string) => JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8"));

describe("schemas compile", () => {
  it("has all seven contract schemas", () => {
    expect(listSchemas().sort()).toEqual([...SCHEMA_NAMES].sort());
  });
  for (const f of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".schema.json"))) {
    it(`${f} compiles under strict Ajv (draft-07)`, () => {
      const schema = JSON.parse(readFileSync(join(SCHEMA_DIR, f), "utf8"));
      expect(schema.$schema).toBe("http://json-schema.org/draft-07/schema#");
      expect(() => newAjv().compile(schema)).not.toThrow();
    });
  }
});

describe("spec section 10 examples validate", () => {
  for (const name of SCHEMA_NAMES) {
    it(`${name}.json`, () => { expect(validateAgainst(name, load(name))).toEqual([]); });
  }
});

describe("enums are verbatim from types.ts", () => {
  const shot = JSON.parse(readFileSync(join(SCHEMA_DIR, "shotplan.schema.json"), "utf8"));
  const tl = JSON.parse(readFileSync(join(SCHEMA_DIR, "timeline.schema.json"), "utf8"));
  it("layouts", () => {
    expect(shot.properties.shots.items.properties.layoutPreference.enum).toEqual(LAYOUTS);
    expect(tl.properties.tracks.properties.broll.items.properties.layout.enum).toEqual(LAYOUTS);
  });
  it("grades", () => {
    expect(shot.properties.grade.enum).toEqual(GRADES);
    expect(tl.properties.grade.enum).toEqual(GRADES);
  });
});

describe("closed contracts reject drift", () => {
  it("timeline rejects an unknown top-level key and a bad transition type", () => {
    const t = load("timeline");
    t.bogus = 1;
    t.tracks.broll[0].transitionIn.type = "cube";
    const errs = validateAgainst("timeline", t);
    expect(errs.some((e) => e.includes("bogus"))).toBe(true);
    expect(errs.some((e) => e.includes("/tracks/broll/0/transitionIn/type"))).toBe(true);
  });
  it("shotplan rejects times (Director outputs intent only)", () => {
    const p = load("shotplan");
    p.shots[0].startMs = 120;
    expect(validateAgainst("shotplan", p).join("\n")).toMatch(/additional properties/);
  });
  it("beats rejects a section kind outside the enum", () => {
    const b = load("beats");
    b.sections[0].kind = "intro";
    expect(validateAgainst("beats", b).length).toBeGreaterThan(0);
  });
  it("chunks rejects a missing brollIds", () => {
    const c = load("chunks");
    delete c[0].brollIds;
    expect(validateAgainst("chunks", c).join()).toMatch(/brollIds/);
  });
});
