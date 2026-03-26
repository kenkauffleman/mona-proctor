#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common.sh"

readonly FIRESTORE_TERRAFORM_DIR="infra/terraform/firestore"
readonly FIRESTORE_PLAN_BASENAME="firestore.tfplan"
readonly FIRESTORE_PLAN_FILE="${FIRESTORE_TERRAFORM_DIR}/firestore.tfplan"

print_usage() {
  cat <<'EOF'
Usage:
  --project <existing-project-id>
  --region <shared-region>

Optional:
  --database <database-name>    Defaults to (default)
EOF
}

load_firestore_env_file() {
  load_shared_deploy_env_file
}

load_firestore_args() {
  load_firestore_env_file

  FIRESTORE_PROJECT_ID="${DEPLOY_PROJECT_ID:-}"
  FIRESTORE_LOCATION="${DEPLOY_REGION:-}"
  FIRESTORE_DATABASE_NAME="${FIRESTORE_DATABASE_NAME:-"(default)"}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project)
        FIRESTORE_PROJECT_ID="${2:-}"
        shift 2
        ;;
      --location|--region)
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
    echo "Both --project and --region are required." >&2
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
