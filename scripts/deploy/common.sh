#!/usr/bin/env bash

set -euo pipefail

readonly DEPLOY_ENV_FILE_DEFAULT=".env.deploy"

require_command() {
  local command_name="$1"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
}

load_shared_deploy_env_file() {
  local env_file="${DEPLOY_ENV_FILE:-${DEPLOY_ENV_FILE_DEFAULT}}"

  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    source "${env_file}"
  fi
}
