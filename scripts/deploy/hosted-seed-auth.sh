#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/hosted-common.sh"

load_hosted_args "$@"
seed_hosted_auth_users
