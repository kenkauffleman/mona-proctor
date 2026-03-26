#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"
require_command terraform

print_cloudrun_target_summary

terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" init -input=false
terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" plan \
  -input=false \
  -out="${CLOUDRUN_PLAN_BASENAME}" \
  -var="project_id=${CLOUDRUN_PROJECT_ID}" \
  -var="region=${CLOUDRUN_REGION}" \
  -var="service_name=${CLOUDRUN_SERVICE_NAME}" \
  -var="container_image=${CLOUDRUN_CONTAINER_IMAGE}" \
  -var="invoker_principal=${CLOUDRUN_INVOKER_PRINCIPAL}"

echo "Saved Terraform plan to ${CLOUDRUN_PLAN_FILE}."
