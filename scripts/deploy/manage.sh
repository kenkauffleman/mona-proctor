#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
source "${script_dir}/common.sh"
load_shared_deploy_env_file

print_usage() {
  cat <<'EOF'
Usage:
  bash scripts/deploy/manage.sh <adopt|build|validate|plan|deploy> [flags]
EOF
}

action="${1:-}"

if [[ -z "${action}" ]]; then
  print_usage >&2
  exit 1
fi

shift 1

case "${action}" in
  adopt)
    exec bash "${script_dir}/hosted-adopt.sh" "$@"
    ;;
  build)
    exec bash "${script_dir}/hosted-build.sh" "$@"
    ;;
  validate)
    exec bash "${script_dir}/hosted-validate.sh" "$@"
    ;;
  plan)
    exec bash "${script_dir}/hosted-plan.sh" "$@"
    ;;
  deploy)
    exec bash "${script_dir}/hosted-deploy.sh" "$@"
    ;;
  *)
    echo "Unsupported deploy action: ${action}" >&2
    print_usage >&2
    exit 1
    ;;
esac
