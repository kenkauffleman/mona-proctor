#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/firestore-common.sh"

load_firestore_args "$@"
require_command terraform

print_target_summary

terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" fmt -check
terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" init -input=false
terraform -chdir="${FIRESTORE_TERRAFORM_DIR}" validate
