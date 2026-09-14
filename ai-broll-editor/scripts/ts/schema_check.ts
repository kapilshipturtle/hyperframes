// Validate one JSON file against one of schemas/*.schema.json.
//   tsx scripts/ts/schema_check.ts --file work/job/timeline.json --schema timeline
import { existsSync } from "node:fs";
import { CliError, flagString, main, parseArgs, readJson } from "./lib/common.js";
import { listSchemas, validateAgainst } from "./lib/schema.js";

main(() => {
  const args = parseArgs();
  const file = flagString(args, "file");
  const schema = flagString(args, "schema");
  if (!file || !schema) throw new CliError(`usage: schema_check --file <json> --schema <${listSchemas().join("|")}>`, 2);
  if (!listSchemas().includes(schema)) throw new CliError(`Unknown schema "${schema}". Available: ${listSchemas().join(", ")}`, 2);
  if (!existsSync(file)) throw new CliError(`File not found: ${file}`, 2);
  const errors = validateAgainst(schema, readJson(file));
  if (errors.length) {
    console.error(`INVALID ${file} against ${schema}.schema.json (${errors.length} error${errors.length === 1 ? "" : "s"}):`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`OK ${file} matches ${schema}.schema.json`);
});
