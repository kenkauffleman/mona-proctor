#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"
require_command terraform

print_cloudrun_target_summary

if [[ ! -f "${CLOUDRUN_PLAN_FILE}" ]]; then
  echo "Expected plan file ${CLOUDRUN_PLAN_FILE} was not found. Run the plan step first." >&2
  exit 1
fi

echo "About to apply reviewed Terraform plan ${CLOUDRUN_PLAN_FILE}."
read -r -p "Type APPLY to continue: " confirmation

if [[ "${confirmation}" != "APPLY" ]]; then
  echo "Apply cancelled."
  exit 1
fi

terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" apply "${CLOUDRUN_PLAN_BASENAME}"
