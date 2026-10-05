#!/bin/bash
# Run the skill installer against a temp folder and check the copied files.
# Uses the checkout next to this script. It does not download from GitHub.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALLER="$ROOT/install-skills.sh"
SRC_SKILLS="$ROOT/plugins/tap-web-sdk/skills"
SRC_RULE="$ROOT/.cursor/rules/tap-sdk.mdc"

same_tree() {
  diff -rq "$1" "$2"
}

work="$(mktemp -d)"
home="$(mktemp -d)"
sdk="$(mktemp -d)"
trap 'rm -rf "$work" "$home" "$sdk"' EXIT

(
  cd "$work"
  "$INSTALLER" all
)

same_tree "$SRC_SKILLS" "$work/.claude/skills"
same_tree "$SRC_SKILLS" "$work/.agents/skills"
same_tree "$SRC_SKILLS" "$work/.cursor/skills"
cmp "$SRC_RULE" "$work/.cursor/rules/tap-sdk.mdc"

awk 'BEGIN { keep = 1 } /^## Contributing to this repository/ { keep = 0 } keep' \
  "$ROOT/AGENTS.md" > "$work/expected-agents.md"
diff -u "$work/expected-agents.md" "$work/AGENTS.md"
if grep -q "Contributing to this repository" "$work/AGENTS.md"; then
  echo "Error: AGENTS.md still has the contributor section." >&2
  exit 1
fi

HOME="$home" "$INSTALLER" -g cursor
same_tree "$SRC_SKILLS" "$home/.cursor/skills"
cmp "$SRC_RULE" "$home/.cursor/rules/tap-sdk.mdc"

HOME="$home" "$INSTALLER" -g agents
diff -u "$work/expected-agents.md" "$home/.codex/AGENTS.md"

printf 'my notes\n' > "$home/.codex/AGENTS.md"
if HOME="$home" "$INSTALLER" -g agents; then
  echo "Error: -g agents replaced an existing AGENTS.md." >&2
  exit 1
fi
[ "$(cat "$home/.codex/AGENTS.md")" = "my notes" ]

# A copy of this repository must keep its own AGENTS.md, including the contributor section.
mkdir -p "$sdk/plugins" "$sdk/.cursor/rules"
cp "$INSTALLER" "$sdk/install-skills.sh"
chmod +x "$sdk/install-skills.sh"
cp -R "$ROOT/plugins/tap-web-sdk" "$sdk/plugins/"
cp "$ROOT/AGENTS.md" "$sdk/AGENTS.md"
cp "$SRC_RULE" "$sdk/.cursor/rules/tap-sdk.mdc"
(
  cd "$sdk"
  ./install-skills.sh agents
)
cmp "$ROOT/AGENTS.md" "$sdk/AGENTS.md"

echo "Installer check passed."
