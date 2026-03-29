#!/usr/bin/env bash

set -euo pipefail

HOSTED_DEPLOY_ACTION="deploy"
source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
require_command terraform
check_hosted_cloud_prereqs

print_hosted_target_summary

if [[ ! -f "${HOSTED_PLAN_FILE}" ]]; then
  echo "Expected plan file ${HOSTED_PLAN_FILE} was not found. Run the plan step first." >&2
  exit 1
fi

echo "About to apply reviewed Terraform plan ${HOSTED_PLAN_FILE}."
read -r -p "Type DEPLOY to continue: " confirmation

if [[ "${confirmation}" != "DEPLOY" ]]; then
  echo "Deploy cancelled."
  exit 1
fi

terraform -chdir="${HOSTED_TERRAFORM_DIR}" apply "${HOSTED_PLAN_BASENAME}"
deploy_hosted_frontend
bash "$(dirname "$0")/hosted-validate-private.sh" "$@"
