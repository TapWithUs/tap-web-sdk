#!/usr/bin/env bash
# Install tap-sdk-web coding-agent skills into the current project.
#
# Usage (from your app root):
#   curl -sL https://raw.githubusercontent.com/TapWithUs/tap-web-sdk/master/install-skills.sh | bash
#   curl -sL .../install-skills.sh | bash -s -- cursor
#   curl -sL .../install-skills.sh | bash -s -- claude
#   curl -sL .../install-skills.sh | bash -s -- all
#
# Or from a local clone of tap-web-sdk:
#   ./install-skills.sh cursor
#   ./install-skills.sh claude
#   ./install-skills.sh all
#
# Skills install into the current working directory.

set -euo pipefail

REPO="TapWithUs/tap-web-sdk"
BRANCH="master"
ARCHIVE_URL="https://github.com/${REPO}/archive/refs/heads/${BRANCH}.tar.gz"
EXTRACT_DIR="tap-web-sdk-${BRANCH}"
SKILL_NAME="tap-sdk-web"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || true)"
SOURCE_DIR=""
DOWNLOADED=0

cleanup() {
  if [ "$DOWNLOADED" -eq 1 ] && [ -d "$EXTRACT_DIR" ]; then
    rm -rf "$EXTRACT_DIR"
  fi
}
trap cleanup EXIT

resolve_source() {
  if [ -n "${SCRIPT_DIR:-}" ] && [ -d "${SCRIPT_DIR}/.cursor/skills/${SKILL_NAME}" ]; then
    SOURCE_DIR="$SCRIPT_DIR"
    return 0
  fi

  if [ -d "${EXTRACT_DIR}/.cursor/skills/${SKILL_NAME}" ]; then
    SOURCE_DIR="$EXTRACT_DIR"
    return 0
  fi

  echo "Downloading ${REPO}@${BRANCH} skill files..."
  curl -sL "$ARCHIVE_URL" | tar xz
  DOWNLOADED=1

  if [ ! -d "${EXTRACT_DIR}/.cursor/skills/${SKILL_NAME}" ]; then
    echo "Error: could not find skills in downloaded archive." >&2
    return 1
  fi
  SOURCE_DIR="$EXTRACT_DIR"
}

install_cursor() {
  resolve_source
  mkdir -p .cursor/skills
  rm -rf ".cursor/skills/${SKILL_NAME}"
  cp -R "${SOURCE_DIR}/.cursor/skills/${SKILL_NAME}" .cursor/skills/
  echo "Installed .cursor/skills/${SKILL_NAME}/"
}

install_claude() {
  resolve_source
  mkdir -p .claude/skills
  rm -rf ".claude/skills/${SKILL_NAME}"
  cp -R "${SOURCE_DIR}/.claude/skills/${SKILL_NAME}" .claude/skills/
  echo "Installed .claude/skills/${SKILL_NAME}/"
}

install_all() {
  install_cursor
  install_claude
}

TOOL="${1:-all}"

case "$TOOL" in
  cursor) install_cursor ;;
  claude) install_claude ;;
  all)    install_all ;;
  *)
    echo "Unknown option: $TOOL" >&2
    echo "Use: cursor, claude, or all" >&2
    exit 1
    ;;
esac

echo ""
echo "Done. In your coding agent, ask for the app you want to build with @tapwithus/tapsdk."
echo "The ${SKILL_NAME} skill supplies SDK rules (Controller mode, browsers, install path)."
