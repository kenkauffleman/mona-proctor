#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
require_command terraform
check_hosted_cloud_prereqs

print_hosted_target_summary

npm test
npm run lint
npm run typecheck
npx tsx scripts/checkHostedTerraformConfig.ts
terraform -chdir="${HOSTED_TERRAFORM_DIR}" fmt -check
terraform -chdir="${HOSTED_TERRAFORM_DIR}" init -input=false
terraform -chdir="${HOSTED_TERRAFORM_DIR}" validate
