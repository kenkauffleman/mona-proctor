#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"
require_command gcloud

print_cloudrun_target_summary

service_url="$(gcloud run services describe "${CLOUDRUN_SERVICE_NAME}" \
  --project="${CLOUDRUN_PROJECT_ID}" \
  --region="${CLOUDRUN_REGION}" \
  --format='value(status.url)')"

cat <<EOF

Private validation options for ${CLOUDRUN_SERVICE_NAME}:

1. Cloud Run proxy:
gcloud run services proxy ${CLOUDRUN_SERVICE_NAME} --project ${CLOUDRUN_PROJECT_ID} --region ${CLOUDRUN_REGION} --port 8080
curl http://127.0.0.1:8080/health

2. Identity-token curl:
SERVICE_URL="${service_url}"
curl -H "Authorization: Bearer \$(gcloud auth print-identity-token)" "\${SERVICE_URL}/health"

The operator principal ${CLOUDRUN_INVOKER_PRINCIPAL} must have roles/run.invoker on the service.
EOF
