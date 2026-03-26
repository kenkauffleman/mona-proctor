#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"
require_command terraform

print_cloudrun_target_summary

terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" fmt -check
terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" init -input=false
terraform -chdir="${CLOUDRUN_TERRAFORM_DIR}" validate
