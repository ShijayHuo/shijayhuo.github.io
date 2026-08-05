#!/usr/bin/env bash
#
# Prepare the Ruby and Bundler environment required by this repository.

set -euo pipefail

BOOTSTRAP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$BOOTSTRAP_DIR/.." && pwd)"
RUBY_VERSION_FILE="$PROJECT_DIR/.ruby-version"

bootstrap_log() {
  printf '\n> %s\n' "$*"
}

bootstrap_error() {
  printf '\nError: %s\n' "$*" >&2
  return 1
}

bootstrap_find_brew() {
  local candidate

  if command -v brew >/dev/null 2>&1; then
    command -v brew
    return
  fi

  for candidate in \
    /opt/homebrew/bin/brew \
    /usr/local/bin/brew \
    /home/linuxbrew/.linuxbrew/bin/brew \
    "$HOME/.linuxbrew/bin/brew"; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return
    fi
  done

  return 1
}

bootstrap_enable_homebrew() {
  local brew_bin

  if brew_bin="$(bootstrap_find_brew)"; then
    eval "$("$brew_bin" shellenv)"
    return
  fi

  case "$(uname -s)" in
  Darwin | Linux) ;;
  *)
    bootstrap_error "Automatic setup currently supports macOS and Linux only."
    return 1
    ;;
  esac

  if ! command -v curl >/dev/null 2>&1; then
    bootstrap_error "curl is required to install Homebrew."
    return 1
  fi

  # Cache sudo credentials once, then let Homebrew run without its interactive
  # confirmation prompt. The password itself is never read or stored here.
  if [[ "$(uname -s)" == "Darwin" && "$(id -u)" -ne 0 ]]; then
    bootstrap_log "Administrator access is required to install Homebrew"
    if [[ -t 0 ]]; then
      sudo -v
    elif ! sudo -n -v; then
      bootstrap_error "Run this script once from an interactive terminal so sudo can request your password."
      return 1
    fi
  fi

  bootstrap_log "Homebrew was not found; installing it from the official installer"
  NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if ! brew_bin="$(bootstrap_find_brew)"; then
    bootstrap_error "Homebrew was installed, but its executable could not be found."
    return 1
  fi

  eval "$("$brew_bin" shellenv)"
}

bootstrap_enable_rbenv() {
  if ! command -v rbenv >/dev/null 2>&1 && [[ -x "$HOME/.rbenv/bin/rbenv" ]]; then
    export PATH="$HOME/.rbenv/bin:$PATH"
  fi

  if ! command -v rbenv >/dev/null 2>&1; then
    bootstrap_enable_homebrew
    bootstrap_log "Installing rbenv and ruby-build"
    brew install rbenv ruby-build
  elif ! rbenv commands | grep -qx install; then
    bootstrap_enable_homebrew
    bootstrap_log "Installing ruby-build"
    brew install ruby-build
  fi

  eval "$(rbenv init - bash)"
}

bootstrap_current_ruby() {
  ruby -e 'print RUBY_VERSION' 2>/dev/null || true
}

bootstrap_environment() {
  local required_ruby current_ruby

  if [[ ! -f "$RUBY_VERSION_FILE" ]]; then
    bootstrap_error "Missing Ruby version file: $RUBY_VERSION_FILE"
    return 1
  fi

  required_ruby="$(tr -d '[:space:]' <"$RUBY_VERSION_FILE")"
  if [[ -z "$required_ruby" ]]; then
    bootstrap_error "$RUBY_VERSION_FILE is empty."
    return 1
  fi

  # Activate an existing Homebrew/rbenv installation even when the caller's
  # shell has not added it to PATH.
  if bootstrap_find_brew >/dev/null 2>&1; then
    bootstrap_enable_homebrew
  fi
  if command -v rbenv >/dev/null 2>&1 || [[ -x "$HOME/.rbenv/bin/rbenv" ]]; then
    bootstrap_enable_rbenv
  fi

  current_ruby="$(bootstrap_current_ruby)"
  if [[ "$current_ruby" != "$required_ruby" ]]; then
    bootstrap_log "Ruby $required_ruby is required (current: ${current_ruby:-not available})"
    bootstrap_enable_rbenv
    bootstrap_log "Installing Ruby $required_ruby (this can take several minutes)"
    rbenv install -s "$required_ruby"
    export RBENV_VERSION="$required_ruby"
    rbenv rehash
  fi

  current_ruby="$(bootstrap_current_ruby)"
  if [[ "$current_ruby" != "$required_ruby" ]]; then
    bootstrap_error "Expected Ruby $required_ruby, but found ${current_ruby:-none}."
    return 1
  fi

  cd "$PROJECT_DIR"

  if ! command -v bundle >/dev/null 2>&1 || ! bundle --version >/dev/null 2>&1; then
    bootstrap_log "Installing Bundler"
    gem install bundler --no-document
    if command -v rbenv >/dev/null 2>&1; then
      rbenv rehash
    fi
  fi

  if ! bundle check >/dev/null 2>&1; then
    bootstrap_log "Installing project gems"
    bundle install
  fi
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  bootstrap_environment
  bootstrap_log "Environment is ready"
fi
