#!/usr/bin/env bash

set -euo pipefail

readonly FIRESTORE_TERRAFORM_DIR="infra/terraform/firestore"
readonly FIRESTORE_PLAN_FILE="${FIRESTORE_TERRAFORM_DIR}/firestore.tfplan"
readonly FIRESTORE_ENV_FILE_DEFAULT=".env.firestore"

print_usage() {
  cat <<'EOF'
Usage:
  --project <existing-project-id>
  --location <firestore-location>

Optional:
  --database <database-name>    Defaults to (default)
EOF
}

require_command() {
  local command_name="$1"

  if ! command -v "${command_name}" >/dev/null 2>&1; then
    echo "Missing required command: ${command_name}" >&2
    exit 1
  fi
}

load_firestore_env_file() {
  local env_file="${FIRESTORE_DEPLOY_ENV_FILE:-${FIRESTORE_ENV_FILE_DEFAULT}}"

  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    source "${env_file}"
  fi
}

load_firestore_args() {
  load_firestore_env_file

  FIRESTORE_PROJECT_ID="${FIRESTORE_PROJECT_ID:-}"
  FIRESTORE_LOCATION="${FIRESTORE_LOCATION:-}"
  FIRESTORE_DATABASE_NAME="${FIRESTORE_DATABASE_NAME:-"(default)"}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project)
        FIRESTORE_PROJECT_ID="${2:-}"
        shift 2
        ;;
      --location)
        FIRESTORE_LOCATION="${2:-}"
        shift 2
        ;;
      --database)
        FIRESTORE_DATABASE_NAME="${2:-}"
        shift 2
        ;;
      --help|-h)
        print_usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        print_usage >&2
        exit 1
        ;;
    esac
  done

  if [[ -z "${FIRESTORE_PROJECT_ID}" || -z "${FIRESTORE_LOCATION}" ]]; then
    echo "Both --project and --location are required." >&2
    print_usage >&2
    exit 1
  fi
}

print_target_summary() {
  echo "Target project: ${FIRESTORE_PROJECT_ID}"
  echo "Firestore location: ${FIRESTORE_LOCATION}"
  echo "Firestore database: ${FIRESTORE_DATABASE_NAME}"
  echo "Terraform root: ${FIRESTORE_TERRAFORM_DIR}"
}
