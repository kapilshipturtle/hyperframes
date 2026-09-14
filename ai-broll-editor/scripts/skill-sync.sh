#!/usr/bin/env bash
# Mirror docs between the skill directory and the package so they never drift.
#   SKILL.md         : skill dir  -> package   (skill dir is the source of truth)
#   references/*.md  : package    -> skill dir (package is the source; spec-v3.md stays package-only)
# Usage: scripts/skill-sync.sh [--check]
#   --check  report differences and exit 1 if any, copy nothing
set -euo pipefail

PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL="${AI_BROLL_SKILL_DIR:-$HOME/.claude/skills/ai-broll-editor}"
CHECK=0
[[ "${1:-}" == "--check" ]] && CHECK=1

mkdir -p "$SKILL/references"
rc=0

sync_one() {
  local src="$1" dst="$2"
  if [[ ! -f "$src" ]]; then
    echo "missing source: $src" >&2
    rc=1
    return
  fi
  if [[ -f "$dst" ]] && cmp -s "$src" "$dst"; then
    return
  fi
  if [[ $CHECK -eq 1 ]]; then
    echo "differs: $src -> $dst"
    rc=1
  else
    cp "$src" "$dst"
    echo "copied:  $src -> $dst"
  fi
}

# SKILL.md: skill dir is the source.
sync_one "$SKILL/SKILL.md" "$PKG/SKILL.md"

# references: package is the source, spec-v3.md excluded.
for f in "$PKG"/references/*.md; do
  base="$(basename "$f")"
  [[ "$base" == "spec-v3.md" ]] && continue
  sync_one "$f" "$SKILL/references/$base"
done

# Warn about reference files that exist only in the skill dir.
for f in "$SKILL"/references/*.md; do
  [[ -e "$f" ]] || continue
  base="$(basename "$f")"
  if [[ ! -f "$PKG/references/$base" ]]; then
    echo "skill-only reference (not in package): $f" >&2
    rc=1
  fi
done

if [[ $CHECK -eq 1 && $rc -eq 0 ]]; then
  echo "in sync"
fi
exit $rc
