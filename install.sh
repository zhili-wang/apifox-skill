#!/usr/bin/env bash
#
# Unified installer for apifox-skill.
#
# Installs the skill into one or more AI terminal skill directories.
# When using --all/--global, the skill is first installed to the canonical
# global hub ~/.agents/skills/apifox-skill, then symlinked into every
# supported agent's skills directory.
#
# Usage:
#   bash install.sh                       # auto-detect installed agents
#   bash install.sh --claude              # install to Claude Code only
#   bash install.sh --codex               # install to Codex CLI only
#   bash install.sh --claude --codex      # install to both
#   bash install.sh --all                 # install to global hub + all agents
#   bash install.sh -u                    # uninstall from detected agents
#   bash install.sh -u --claude           # uninstall from Claude Code only
#   bash install.sh -u --all              # uninstall global hub + all agents
#
# Works on macOS and Linux. Idempotent: safe to re-run.

set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Canonical global hub (Agent Skills standard).
GLOBAL_DIR="${HOME}/.agents/skills/apifox-skill"

# Supported agents: id | human name | default install dir
SUPPORTED_AGENTS=(
  "claude:Claude Code:${HOME}/.claude/skills/apifox-skill"
  "codex:Codex CLI:${HOME}/.codex/skills/apifox-skill"
)

SELECTED_IDS=()
UNINSTALL=false
ALL=false

# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

log() { echo "$@"; }

print_help() {
  cat <<'EOF'
apifox-skill unified installer

Usage:
  bash install.sh                       Auto-detect installed agents and install
  bash install.sh --claude              Install to Claude Code only
  bash install.sh --codex               Install to Codex CLI only
  bash install.sh --claude --codex      Install to Claude Code and Codex CLI
  bash install.sh --all                 Install to global hub + all agents
  bash install.sh -u                    Uninstall from detected agents
  bash install.sh -u --claude           Uninstall from Claude Code only
  bash install.sh -u --all              Uninstall global hub + all agents
  bash install.sh -h, --help            Show this help

Supported agents:
  --claude, --claude-code    Claude Code  → ~/.claude/skills/apifox-skill
  --codex                    Codex CLI    → ~/.codex/skills/apifox-skill

When --all is used, the canonical copy lives in ~/.agents/skills/apifox-skill
and each agent directory receives a symlink to that global copy.
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --claude|--claude-code)
        SELECTED_IDS+=("claude")
        shift
        ;;
      --codex)
        SELECTED_IDS+=("codex")
        shift
        ;;
      --all|--global)
        ALL=true
        shift
        ;;
      -u|--uninstall)
        UNINSTALL=true
        shift
        ;;
      -h|--help)
        print_help
        exit 0
        ;;
      *)
        echo "Unknown option: $1" >&2
        print_help >&2
        exit 2
        ;;
    esac
  done
}

agent_dir() {
  local id="$1"
  for entry in "${SUPPORTED_AGENTS[@]}"; do
    if [[ "${entry%%:*}" == "$id" ]]; then
      echo "${entry##*:}"
      return
    fi
  done
}

agent_name() {
  local id="$1"
  for entry in "${SUPPORTED_AGENTS[@]}"; do
    if [[ "${entry%%:*}" == "$id" ]]; then
      # entry format: id:name:dir
      local rest="${entry#*:}"
      echo "${rest%:*}"
      return
    fi
  done
}

agent_home_dir() {
  local dir
  dir="$(agent_dir "$1")"
  # dir is ~/.<agent>/skills/apifox-skill; home is ~/.<agent>
  dirname "$(dirname "$dir")"
}

is_agent_installed() {
  local id="$1"
  local home
  home="$(agent_home_dir "$id")"
  [[ -d "$home" ]]
}

resolve_targets() {
  if $ALL; then
    SELECTED_IDS=("${SUPPORTED_AGENTS[@]%%:*}")
    return
  fi

  if [[ ${#SELECTED_IDS[@]} -eq 0 ]]; then
    # Auto-detect installed agents
    for entry in "${SUPPORTED_AGENTS[@]}"; do
      local id="${entry%%:*}"
      if is_agent_installed "$id"; then
        SELECTED_IDS+=("$id")
      fi
    done
  fi
}

# Install source files into a destination directory and clean up meta files.
copy_skill_to() {
  local dest_dir="$1"
  mkdir -p "$(dirname "$dest_dir")"
  rm -rf "$dest_dir"
  cp -R "$SRC_DIR" "$dest_dir"

  # Remove installer meta files from the installed copy.
  # Keep .gitignore so config.json (contains secrets) stays ignored even if
  # the parent directory itself is managed as a dotfiles git repository.
  rm -f "$dest_dir/install.sh"

  chmod +x \
    "$dest_dir/scripts/init.mjs" \
    "$dest_dir/scripts/read-config.mjs" \
    "$dest_dir/scripts/fetch-project.mjs" \
    "$dest_dir/scripts/read-project.mjs" \
    "$dest_dir/scripts/refresh-project.mjs" 2>/dev/null || true
}

# Install the canonical global copy.
install_global() {
  copy_skill_to "$GLOBAL_DIR"
  echo "✓ Installed global hub: $GLOBAL_DIR"
}

# Symlink one agent's skill directory to the global hub.
link_agent_to_global() {
  local id="$1"
  local agent_dir_val
  agent_dir_val="$(agent_dir "$id")"
  local name
  name="$(agent_name "$id")"

  mkdir -p "$(dirname "$agent_dir_val")"
  rm -rf "$agent_dir_val"
  ln -s "$GLOBAL_DIR" "$agent_dir_val"
  echo "✓ Linked $name → $agent_dir_val"
}

# Direct copy install for a single agent (used when --all is not requested).
install_to_agent() {
  local id="$1"
  local dest_dir
  dest_dir="$(agent_dir "$id")"
  local name
  name="$(agent_name "$id")"

  copy_skill_to "$dest_dir"
  echo "✓ Installed to $name: $dest_dir"
}

uninstall_from_agent() {
  local id="$1"
  local dest_dir
  dest_dir="$(agent_dir "$id")"
  local name
  name="$(agent_name "$id")"

  if [[ -d "$dest_dir" || -L "$dest_dir" ]]; then
    rm -rf "$dest_dir"
    echo "✓ Uninstalled from $name: $dest_dir"
  else
    echo "• Nothing to uninstall from $name: $dest_dir not present"
  fi
}

uninstall_global() {
  if [[ -d "$GLOBAL_DIR" || -L "$GLOBAL_DIR" ]]; then
    rm -rf "$GLOBAL_DIR"
    echo "✓ Uninstalled global hub: $GLOBAL_DIR"
  else
    echo "• Global hub not present: $GLOBAL_DIR"
  fi
}

print_next_steps() {
  local dest_dir
  if $ALL; then
    dest_dir="$GLOBAL_DIR"
  else
    dest_dir="$(agent_dir "claude")"
  fi

  echo
  echo "Next steps:"
  echo "  1. Restart your AI terminal(s) so the skill loads."
  echo "  2. Initialize config (token + project ids):"
  echo "       /apifox-skill --token=<Apifox访问令牌> --project-id=<项目ID> --project-id=<项目ID2> -y"
  echo "     (or directly: node \"$dest_dir/scripts/init.mjs\" --token=... --project-id=... -y)"
  echo "  3. Verify config: node \"$dest_dir/scripts/read-config.mjs\""
  echo "  4. Fetch API docs: node \"$dest_dir/scripts/fetch-project.mjs\" --project-name=<项目名>"
}

# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

parse_args "$@"
resolve_targets

if [[ ${#SELECTED_IDS[@]} -eq 0 ]]; then
  echo "⚠ No supported AI terminal detected." >&2
  echo "Supported terminals: Claude Code, Codex CLI" >&2
  echo "Install one first, or run: bash install.sh --all" >&2
  exit 1
fi

if $UNINSTALL; then
  if $ALL; then
    for id in "${SELECTED_IDS[@]}"; do
      uninstall_from_agent "$id"
    done
    uninstall_global
  else
    for id in "${SELECTED_IDS[@]}"; do
      uninstall_from_agent "$id"
    done
  fi
else
  if $ALL; then
    install_global
    for id in "${SELECTED_IDS[@]}"; do
      link_agent_to_global "$id"
    done
  else
    for id in "${SELECTED_IDS[@]}"; do
      install_to_agent "$id"
    done
  fi
  print_next_steps
fi
