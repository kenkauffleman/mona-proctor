#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/firestore-common.sh"

load_firestore_args "$@"
require_command terraform

print_target_summary

terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" init -input=false
terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" plan \
  -input=false \
  -out="${FIRESTORE_PLAN_BASENAME}" \
  -var="project_id=${FIRESTORE_PROJECT_ID}" \
  -var="firestore_location=${FIRESTORE_LOCATION}" \
  -var="firestore_database_name=${FIRESTORE_DATABASE_NAME}"

echo "Saved Terraform plan to ${FIRESTORE_PLAN_FILE}."
