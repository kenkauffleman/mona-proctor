#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/firestore-common.sh"

load_firestore_args "$@"
require_command terraform

print_target_summary

if [[ ! -f "${FIRESTORE_PLAN_FILE}" ]]; then
  echo "Expected plan file ${FIRESTORE_PLAN_FILE} was not found. Run the plan step first." >&2
  exit 1
fi

echo "About to apply reviewed Terraform plan ${FIRESTORE_PLAN_FILE}."
read -r -p "Type APPLY to continue: " confirmation

if [[ "${confirmation}" != "APPLY" ]]; then
  echo "Apply cancelled."
  exit 1
fi

terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" apply "${FIRESTORE_PLAN_FILE}"
