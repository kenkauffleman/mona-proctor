#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common.sh"

readonly CLOUDRUN_TERRAFORM_DIR="infra/terraform/cloud-run-backend"
readonly CLOUDRUN_PLAN_BASENAME="cloud-run-backend.tfplan"
readonly CLOUDRUN_PLAN_FILE="${CLOUDRUN_TERRAFORM_DIR}/${CLOUDRUN_PLAN_BASENAME}"
readonly CLOUDRUN_ENV_FILE_DEFAULT=".env.cloudrun"

print_cloudrun_usage() {
  cat <<'EOF'
Usage:
  --project <existing-project-id>
  --region <cloud-run-region>
  --image <container-image-uri>
  --invoker <member>

Optional:
  --service <service-name>     Defaults to mona-proctor-backend
EOF
}

load_cloudrun_env_file() {
  load_shared_deploy_env_file

  local env_file="${CLOUDRUN_DEPLOY_ENV_FILE:-${CLOUDRUN_ENV_FILE_DEFAULT}}"

  if [[ -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    source "${env_file}"
  fi
}

load_cloudrun_args() {
  load_cloudrun_env_file

  CLOUDRUN_PROJECT_ID="${CLOUDRUN_PROJECT_ID:-}"
  CLOUDRUN_REGION="${CLOUDRUN_REGION:-}"
  CLOUDRUN_SERVICE_NAME="${CLOUDRUN_SERVICE_NAME:-mona-proctor-backend}"
  CLOUDRUN_CONTAINER_IMAGE="${CLOUDRUN_CONTAINER_IMAGE:-}"
  CLOUDRUN_INVOKER_PRINCIPAL="${CLOUDRUN_INVOKER_PRINCIPAL:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project)
        CLOUDRUN_PROJECT_ID="${2:-}"
        shift 2
        ;;
      --region)
        CLOUDRUN_REGION="${2:-}"
        shift 2
        ;;
      --service)
        CLOUDRUN_SERVICE_NAME="${2:-}"
        shift 2
        ;;
      --image)
        CLOUDRUN_CONTAINER_IMAGE="${2:-}"
        shift 2
        ;;
      --invoker)
        CLOUDRUN_INVOKER_PRINCIPAL="${2:-}"
        shift 2
        ;;
      --help|-h)
        print_cloudrun_usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        print_cloudrun_usage >&2
        exit 1
        ;;
    esac
  done

  if [[ -z "${CLOUDRUN_PROJECT_ID}" || -z "${CLOUDRUN_REGION}" || -z "${CLOUDRUN_CONTAINER_IMAGE}" || -z "${CLOUDRUN_INVOKER_PRINCIPAL}" ]]; then
    echo "--project, --region, --image, and --invoker are required." >&2
    print_cloudrun_usage >&2
    exit 1
  fi
}

print_cloudrun_target_summary() {
  echo "Target project: ${CLOUDRUN_PROJECT_ID}"
  echo "Cloud Run region: ${CLOUDRUN_REGION}"
  echo "Cloud Run service: ${CLOUDRUN_SERVICE_NAME}"
  echo "Container image: ${CLOUDRUN_CONTAINER_IMAGE}"
  echo "Private invoker: ${CLOUDRUN_INVOKER_PRINCIPAL}"
  echo "Terraform root: ${CLOUDRUN_TERRAFORM_DIR}"
}

build_and_push_cloudrun_image() {
  require_command gcloud

  print_cloudrun_target_summary
  echo "Building and pushing backend image with Cloud Build..."

  gcloud builds submit --tag "${CLOUDRUN_CONTAINER_IMAGE}"
}
