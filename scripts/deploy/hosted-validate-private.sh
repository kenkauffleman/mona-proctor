#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"

exec npx tsx scripts/validatePrivateCloudRunHistory.ts \
  --project "${HOSTED_PROJECT_ID}" \
  --region "${HOSTED_REGION}" \
  --service "${HOSTED_CLOUD_RUN_SERVICE_NAME}"
