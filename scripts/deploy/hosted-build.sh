#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
build_and_push_hosted_backend_image
