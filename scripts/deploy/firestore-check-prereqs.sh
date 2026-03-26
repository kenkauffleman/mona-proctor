#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/firestore-common.sh"

require_command terraform
require_command gcloud

echo "Checking Google Cloud authentication status..."
if ! gcloud auth application-default print-access-token >/dev/null 2>&1; then
  cat >&2 <<'EOF'
Application Default Credentials are not ready.
Run:
  gcloud auth login
  gcloud auth application-default login
EOF
  exit 1
fi

echo "Checking active gcloud account..."
gcloud auth list --filter=status:ACTIVE --format="value(account)"

echo "Prerequisite check passed."
