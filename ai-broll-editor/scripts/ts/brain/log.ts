// placement.log.jsonl writer (spec 11.13): one line per decision.
import type { LogLine } from "../types.js";

export class PlacementLog {
  lines: LogLine[] = [];
  warnings: string[] = [];
  add(line: LogLine): void { this.lines.push(line); }
  log(pass: string, decision: string, reason: string, extra: Partial<LogLine> = {}): void {
    this.lines.push({ pass, decision, reason, ...extra });
  }
  warn(msg: string): void { this.warnings.push(msg); this.lines.push({ pass: "warn", decision: "warning", reason: msg }); }
  toJsonl(): string { return this.lines.map((l) => JSON.stringify(l)).join("\n") + (this.lines.length ? "\n" : ""); }
}
