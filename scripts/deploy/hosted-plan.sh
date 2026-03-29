#!/usr/bin/env bash

set -euo pipefail

HOSTED_DEPLOY_ACTION="plan"
source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
require_command terraform
check_hosted_cloud_prereqs

print_hosted_target_summary

if [[ -f "${HOSTED_TFVARS_FILE}" ]]; then
  echo "Using checked-in environment tfvars from ${HOSTED_TFVARS_FILE}"
fi

terraform_args=()
append_terraform_hosted_var_args

terraform -chdir="${HOSTED_TERRAFORM_DIR}" init -input=false
terraform -chdir="${HOSTED_TERRAFORM_DIR}" plan \
  -input=false \
  -out="${HOSTED_PLAN_BASENAME}" \
  -var-file="environments/${DEPLOY_ENVIRONMENT_NAME}.tfvars" \
  "${terraform_args[@]}"

echo "Saved Terraform plan to ${HOSTED_PLAN_FILE}."
