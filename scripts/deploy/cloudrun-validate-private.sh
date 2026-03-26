#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"

exec npx tsx scripts/validatePrivateCloudRunHistory.ts \
  --project "${CLOUDRUN_PROJECT_ID}" \
  --region "${CLOUDRUN_REGION}" \
  --service "${CLOUDRUN_SERVICE_NAME}"
