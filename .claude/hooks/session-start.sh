#!/bin/bash
# SessionStart hook: make the GitLab CLI (glab) available and authenticated.
#
# Runs only in Claude Code on the web, where the container is ephemeral and
# starts without glab installed. Local machines are left alone.
#
# Requires GITLAB_TOKEN to be set in the remote environment's variables
# (claude.ai/code -> environment settings). Without it the hook warns and
# exits cleanly rather than blocking the session.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

GLAB_VERSION="${GLAB_VERSION:-1.114.0}"
GITLAB_HOSTNAME="${GITLAB_HOST:-gitlab.com}"
GITLAB_HOSTNAME="${GITLAB_HOSTNAME#https://}"
GITLAB_HOSTNAME="${GITLAB_HOSTNAME#http://}"
GITLAB_HOSTNAME="${GITLAB_HOSTNAME%%/*}"

note() { echo "[glab-setup] $*"; }

install_glab() {
  local arch download_url install_dir staging
  case "$(uname -m)" in
    x86_64 | amd64) arch=amd64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *)
      note "unsupported architecture $(uname -m); skipping glab install."
      return 1
      ;;
  esac

  if [ -w /usr/local/bin ]; then
    install_dir=/usr/local/bin
  else
    install_dir="$HOME/.local/bin"
    mkdir -p "$install_dir"
    case ":${PATH}:" in
      *":${install_dir}:"*) ;;
      *)
        export PATH="${install_dir}:${PATH}"
        if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
          echo "export PATH=\"${install_dir}:\$PATH\"" >> "$CLAUDE_ENV_FILE"
        fi
        ;;
    esac
  fi

  download_url="https://gitlab.com/gitlab-org/cli/-/releases/v${GLAB_VERSION}/downloads/glab_${GLAB_VERSION}_linux_${arch}.tar.gz"
  staging="$(mktemp -d)"
  trap 'rm -rf "$staging"' RETURN

  note "installing glab ${GLAB_VERSION} (${arch}) into ${install_dir}..."
  if ! curl -fsSL --retry 3 --retry-delay 2 --max-time 180 -o "${staging}/glab.tar.gz" "$download_url"; then
    note "download failed: ${download_url}"
    return 1
  fi
  if ! tar xzf "${staging}/glab.tar.gz" -C "$staging"; then
    note "could not extract the glab archive."
    return 1
  fi

  local binary
  binary="$(find "$staging" -type f -name glab -perm -u+x | head -1)"
  if [ -z "$binary" ]; then
    note "no glab binary found inside the archive."
    return 1
  fi
  install -m 0755 "$binary" "${install_dir}/glab"
}

# 1. Install, unless a matching glab is already on PATH (cached container state).
if command -v glab > /dev/null 2>&1 && glab --version 2>/dev/null | grep -q "$GLAB_VERSION"; then
  note "glab ${GLAB_VERSION} already installed."
elif ! install_glab; then
  note "continuing without glab. Re-run this hook once the download works."
  exit 0
fi

# 2. Authenticate. The token is piped on stdin and never echoed.
GITLAB_PAT="${GITLAB_TOKEN:-${GITLAB_ACCESS_TOKEN:-${GLAB_TOKEN:-}}}"
if [ -z "$GITLAB_PAT" ]; then
  note "GITLAB_TOKEN is not set, so glab stays unauthenticated."
  note "Add it under environment settings at claude.ai/code, then start a new session."
  exit 0
fi

# No OS keyring exists in this container, so store credentials in the config file.
if ! printf '%s' "$GITLAB_PAT" | glab auth login \
  --hostname "$GITLAB_HOSTNAME" \
  --stdin \
  --insecure-storage > /dev/null 2>&1; then
  note "glab auth login failed for ${GITLAB_HOSTNAME}."
  exit 0
fi

glab config set -h "$GITLAB_HOSTNAME" git_protocol https > /dev/null 2>&1 || true

# `glab auth login` stores the token without checking it, so confirm against the API.
GITLAB_USERNAME="$(glab api user 2>/dev/null | grep -oE '"username":"[^"]+"' | head -1 | cut -d'"' -f4 || true)"
if [ -n "$GITLAB_USERNAME" ]; then
  note "authenticated to ${GITLAB_HOSTNAME} as ${GITLAB_USERNAME}."
else
  note "${GITLAB_HOSTNAME} rejected the token. Check that GITLAB_TOKEN is valid, unexpired,"
  note "and carries the 'api' scope (add 'write_repository' to push over HTTPS)."
fi

exit 0
