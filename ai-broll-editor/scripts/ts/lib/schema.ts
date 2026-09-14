// Ajv instance shared by schema_check.ts, direct.ts and the tests.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import Ajv2019, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { CliError, PACKAGE_ROOT } from "./common.js";

export const SCHEMA_DIR = join(PACKAGE_ROOT, "schemas");
export const SCHEMA_NAMES = ["transcript", "beats", "shotplan", "assets", "timeline", "chunks", "credits"] as const;
export type SchemaName = (typeof SCHEMA_NAMES)[number];

export function listSchemas(): string[] {
  return readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".schema.json")).map((f) => f.replace(/\.schema\.json$/, ""));
}

export function newAjv(): Ajv2019 {
  const ajv = new Ajv2019({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  return ajv;
}

const compiled = new Map<string, ValidateFunction>();
export function getValidator(name: string): ValidateFunction {
  const hit = compiled.get(name);
  if (hit) return hit;
  const path = join(SCHEMA_DIR, `${name}.schema.json`);
  let schema: unknown;
  try { schema = JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { throw new CliError(`Schema "${name}" not found or invalid at ${path}: ${(e as Error).message}`, 2); }
  const v = newAjv().compile(schema as object);
  compiled.set(name, v);
  return v;
}

export function formatErrors(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => {
    const extra = e.params && Object.keys(e.params).length ? ` ${JSON.stringify(e.params)}` : "";
    return `${e.instancePath || "/"} ${e.message ?? ""}${extra}`;
  });
}

/** Returns [] when valid, else human-readable error lines. */
export function validateAgainst(name: string, data: unknown): string[] {
  const v = getValidator(name);
  return v(data) ? [] : formatErrors(v.errors);
}
