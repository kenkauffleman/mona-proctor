#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/cloudrun-common.sh"

load_cloudrun_args "$@"

build_and_push_cloudrun_image
