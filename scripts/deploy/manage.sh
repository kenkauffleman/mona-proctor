#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
source "${script_dir}/common.sh"
load_shared_deploy_env_file

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/deploy/manage.sh <target> <action>

Targets:
  firestore
  cloudrun

Actions:
  check
  init
  validate
  plan
  apply

Cloud Run-only actions:
  build
  validation-commands
  validate-private
EOF
}

target="${1:-}"
action="${2:-}"

if [[ -z "${target}" || -z "${action}" ]]; then
  print_usage >&2
  exit 1
fi

shift 2

case "${target}:${action}" in
  firestore:check)
    exec bash "${script_dir}/firestore-check-prereqs.sh" "$@"
    ;;
  firestore:init)
    exec bash "${script_dir}/firestore-init.sh" "$@"
    ;;
  firestore:validate)
    exec bash "${script_dir}/firestore-validate.sh" "$@"
    ;;
  firestore:plan)
    exec bash "${script_dir}/firestore-plan.sh" "$@"
    ;;
  firestore:apply)
    exec bash "${script_dir}/firestore-apply.sh" "$@"
    ;;
  cloudrun:check)
    exec bash "${script_dir}/cloudrun-check-prereqs.sh" "$@"
    ;;
  cloudrun:init)
    exec bash "${script_dir}/cloudrun-init.sh" "$@"
    ;;
  cloudrun:build)
    exec bash "${script_dir}/cloudrun-build.sh" "$@"
    ;;
  cloudrun:validate)
    exec bash "${script_dir}/cloudrun-validate.sh" "$@"
    ;;
  cloudrun:plan)
    exec bash "${script_dir}/cloudrun-plan.sh" "$@"
    ;;
  cloudrun:apply)
    exec bash "${script_dir}/cloudrun-apply.sh" "$@"
    ;;
  cloudrun:validation-commands)
    exec bash "${script_dir}/cloudrun-print-validation-commands.sh" "$@"
    ;;
  cloudrun:validate-private)
    exec bash "${script_dir}/cloudrun-validate-private.sh" "$@"
    ;;
  *)
    echo "Unsupported target/action: ${target} ${action}" >&2
    print_usage >&2
    exit 1
    ;;
esac
