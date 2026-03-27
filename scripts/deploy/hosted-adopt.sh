#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
check_hosted_cloud_prereqs

print_hosted_target_summary

echo "This command is for adopting existing hosted singleton resources into the unified Terraform state."
echo "Use it once per environment when migrating from the old split Terraform roots."
echo
read -r -p "Type ADOPT to continue: " confirmation

if [[ "${confirmation}" != "ADOPT" ]]; then
  echo "Adoption cancelled."
  exit 1
fi

terraform -chdir="${HOSTED_TERRAFORM_DIR}" init -input=false
reconcile_firestore_state
reconcile_firebase_frontend_state
