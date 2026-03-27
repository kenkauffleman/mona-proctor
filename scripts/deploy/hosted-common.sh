#!/usr/bin/env bash

set -euo pipefail

source "$(dirname "$0")/common.sh"

readonly HOSTED_TERRAFORM_DIR="infra/terraform/hosted"
readonly HOSTED_ENVIRONMENTS_DIR="${HOSTED_TERRAFORM_DIR}/environments"
readonly HOSTED_PLAN_BASENAME="hosted.tfplan"
readonly HOSTED_PLAN_FILE="${HOSTED_TERRAFORM_DIR}/${HOSTED_PLAN_BASENAME}"

print_hosted_usage() {
  cat <<'EOF'
Usage:
  npm run deploy -- <build|validate|plan|deploy> [--env <name>] [--project <project-id>] [--region <region>] [--tag <image-tag>]

Optional:
  --service <service-name>     Defaults to mona-proctor-backend
  --repo <artifact-repository> Defaults to mona-proctor
  --image-name <image-name>    Defaults to backend
  --web-app-name <name>        Defaults to mona-proctor-web
  --quota-project <project-id> Defaults to the deploy project
  --invoker <member>           Optional extra direct invoker member
  --database <database-name>   Defaults to (default)
EOF
}

load_hosted_args() {
  load_shared_deploy_env_file

  DEPLOY_ENVIRONMENT_NAME="${DEPLOY_ENVIRONMENT:-test}"
  HOSTED_PROJECT_ID="${DEPLOY_PROJECT_ID:-}"
  HOSTED_QUOTA_PROJECT_ID="${DEPLOY_QUOTA_PROJECT_ID:-${DEPLOY_PROJECT_ID:-}}"
  HOSTED_REGION="${DEPLOY_REGION:-}"
  HOSTED_FIRESTORE_DATABASE_NAME="${FIRESTORE_DATABASE_NAME:-"(default)"}"
  HOSTED_CLOUD_RUN_SERVICE_NAME="${CLOUDRUN_SERVICE_NAME:-mona-proctor-backend}"
  HOSTED_ARTIFACT_REPOSITORY="${CLOUDRUN_ARTIFACT_REPOSITORY:-mona-proctor}"
  HOSTED_IMAGE_NAME="${CLOUDRUN_IMAGE_NAME:-backend}"
  HOSTED_IMAGE_TAG="${CLOUDRUN_IMAGE_TAG:-wave11}"
  HOSTED_FIREBASE_WEB_APP_NAME="${FIREBASE_WEB_APP_NAME:-mona-proctor-web}"
  HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL="${CLOUDRUN_INVOKER_PRINCIPAL:-}"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --env)
        DEPLOY_ENVIRONMENT_NAME="${2:-}"
        shift 2
        ;;
      --project)
        HOSTED_PROJECT_ID="${2:-}"
        shift 2
        ;;
      --region)
        HOSTED_REGION="${2:-}"
        shift 2
        ;;
      --quota-project)
        HOSTED_QUOTA_PROJECT_ID="${2:-}"
        shift 2
        ;;
      --database)
        HOSTED_FIRESTORE_DATABASE_NAME="${2:-}"
        shift 2
        ;;
      --service)
        HOSTED_CLOUD_RUN_SERVICE_NAME="${2:-}"
        shift 2
        ;;
      --repo)
        HOSTED_ARTIFACT_REPOSITORY="${2:-}"
        shift 2
        ;;
      --image-name)
        HOSTED_IMAGE_NAME="${2:-}"
        shift 2
        ;;
      --tag)
        HOSTED_IMAGE_TAG="${2:-}"
        shift 2
        ;;
      --web-app-name)
        HOSTED_FIREBASE_WEB_APP_NAME="${2:-}"
        shift 2
        ;;
      --invoker)
        HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL="${2:-}"
        shift 2
        ;;
      --help|-h)
        print_hosted_usage
        exit 0
        ;;
      *)
        echo "Unknown argument: $1" >&2
        print_hosted_usage >&2
        exit 1
        ;;
    esac
  done

  HOSTED_ENV_FILE=".env.deploy.${DEPLOY_ENVIRONMENT_NAME}"
  if [[ -f "${HOSTED_ENV_FILE}" ]]; then
    # shellcheck disable=SC1090
    source "${HOSTED_ENV_FILE}"
    HOSTED_PROJECT_ID="${DEPLOY_PROJECT_ID:-${HOSTED_PROJECT_ID}}"
    HOSTED_QUOTA_PROJECT_ID="${DEPLOY_QUOTA_PROJECT_ID:-${HOSTED_QUOTA_PROJECT_ID}}"
    HOSTED_REGION="${DEPLOY_REGION:-${HOSTED_REGION}}"
    HOSTED_FIRESTORE_DATABASE_NAME="${FIRESTORE_DATABASE_NAME:-${HOSTED_FIRESTORE_DATABASE_NAME}}"
    HOSTED_CLOUD_RUN_SERVICE_NAME="${CLOUDRUN_SERVICE_NAME:-${HOSTED_CLOUD_RUN_SERVICE_NAME}}"
    HOSTED_ARTIFACT_REPOSITORY="${CLOUDRUN_ARTIFACT_REPOSITORY:-${HOSTED_ARTIFACT_REPOSITORY}}"
    HOSTED_IMAGE_NAME="${CLOUDRUN_IMAGE_NAME:-${HOSTED_IMAGE_NAME}}"
    HOSTED_IMAGE_TAG="${CLOUDRUN_IMAGE_TAG:-${HOSTED_IMAGE_TAG}}"
    HOSTED_FIREBASE_WEB_APP_NAME="${FIREBASE_WEB_APP_NAME:-${HOSTED_FIREBASE_WEB_APP_NAME}}"
    HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL="${CLOUDRUN_INVOKER_PRINCIPAL:-${HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL}}"
  fi

  if [[ -z "${HOSTED_PROJECT_ID}" || -z "${HOSTED_REGION}" ]]; then
    echo "project and region are required for hosted deployment." >&2
    print_hosted_usage >&2
    exit 1
  fi

  if [[ "${HOSTED_FIRESTORE_DATABASE_NAME}" != "(default)" ]]; then
    cat >&2 <<'EOF'
Wave 9 only supports the default Firestore database named (default).
Set FIRESTORE_DATABASE_NAME="(default)" in your env file before running hosted deploy commands.
EOF
    exit 1
  fi

  HOSTED_CONTAINER_IMAGE="${HOSTED_REGION}-docker.pkg.dev/${HOSTED_PROJECT_ID}/${HOSTED_ARTIFACT_REPOSITORY}/${HOSTED_IMAGE_NAME}:${HOSTED_IMAGE_TAG}"
  HOSTED_TFVARS_FILE="${HOSTED_ENVIRONMENTS_DIR}/${DEPLOY_ENVIRONMENT_NAME}.tfvars"
}

print_hosted_target_summary() {
  echo "Environment: ${DEPLOY_ENVIRONMENT_NAME}"
  echo "Target project: ${HOSTED_PROJECT_ID}"
  echo "Quota project: ${HOSTED_QUOTA_PROJECT_ID}"
  echo "Shared region: ${HOSTED_REGION}"
  echo "Firestore database: ${HOSTED_FIRESTORE_DATABASE_NAME}"
  echo "Cloud Run service: ${HOSTED_CLOUD_RUN_SERVICE_NAME}"
  echo "Artifact repository: ${HOSTED_ARTIFACT_REPOSITORY}"
  echo "Image name: ${HOSTED_IMAGE_NAME}"
  echo "Image tag: ${HOSTED_IMAGE_TAG}"
  echo "Firebase web app name: ${HOSTED_FIREBASE_WEB_APP_NAME}"
  echo "Container image: ${HOSTED_CONTAINER_IMAGE}"
  echo "Extra direct invoker: ${HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL:-<none>}"
  echo "Terraform root: ${HOSTED_TERRAFORM_DIR}"
  echo "Terraform tfvars: ${HOSTED_TFVARS_FILE}"
}

terraform_hosted_var_args() {
  printf '%s\n' \
    "-var=project_id=${HOSTED_PROJECT_ID}" \
    "-var=quota_project_id=${HOSTED_QUOTA_PROJECT_ID}" \
    "-var=region=${HOSTED_REGION}" \
    "-var=firestore_database_name=${HOSTED_FIRESTORE_DATABASE_NAME}" \
    "-var=cloud_run_service_name=${HOSTED_CLOUD_RUN_SERVICE_NAME}" \
    "-var=firebase_web_app_display_name=${HOSTED_FIREBASE_WEB_APP_NAME}" \
    "-var=artifact_repository_name=${HOSTED_ARTIFACT_REPOSITORY}" \
    "-var=cloud_run_container_image=${HOSTED_CONTAINER_IMAGE}"

  if [[ -n "${HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL}" ]]; then
    printf '%s\n' "-var=cloud_run_invoker_principal=${HOSTED_CLOUD_RUN_INVOKER_PRINCIPAL}"
  fi
}

append_terraform_hosted_var_args() {
  local line

  while IFS= read -r line; do
    if [[ -n "${line}" ]]; then
      terraform_args+=("${line}")
    fi
  done < <(terraform_hosted_var_args)
}

terraform_state_has_resource() {
  local address="$1"
  terraform -chdir="${HOSTED_TERRAFORM_DIR}" state show "${address}" >/dev/null 2>&1
}

reconcile_firestore_state() {
  local terraform_args=()
  append_terraform_hosted_var_args

  local database_address="module.firestore.google_firestore_database.default"
  local release_address="module.firestore.google_firebaserules_release.firestore"
  local firebase_project_address="module.firestore.google_firebase_project.project"
  local firestore_services=(
    "firebase.googleapis.com"
    "firestore.googleapis.com"
    "firebaserules.googleapis.com"
  )

  echo "Reconciling existing Firestore resources into hosted Terraform state when needed..."

  for service in "${firestore_services[@]}"; do
    local service_address="module.firestore.google_project_service.required[\"${service}\"]"
    if ! terraform_state_has_resource "${service_address}"; then
      terraform -chdir="${HOSTED_TERRAFORM_DIR}" import "${terraform_args[@]}" \
        "${service_address}" \
        "projects/${HOSTED_PROJECT_ID}/services/${service}" >/dev/null 2>&1 || true
    fi
  done

  if ! terraform_state_has_resource "${firebase_project_address}"; then
    terraform -chdir="${HOSTED_TERRAFORM_DIR}" import "${terraform_args[@]}" \
      "${firebase_project_address}" \
      "${HOSTED_PROJECT_ID}" >/dev/null 2>&1 || true
  fi

  if terraform_state_has_resource "${database_address}"; then
    if ! terraform -chdir="${HOSTED_TERRAFORM_DIR}" state show "${database_address}" | grep -F 'name = "(default)"' >/dev/null 2>&1; then
      terraform -chdir="${HOSTED_TERRAFORM_DIR}" state rm "${database_address}" >/dev/null 2>&1 || true
    fi
  fi

  if ! terraform_state_has_resource "${database_address}"; then
    terraform -chdir="${HOSTED_TERRAFORM_DIR}" import "${terraform_args[@]}" \
      "${database_address}" \
      "(default)" >/dev/null 2>&1 || true
  fi

  if terraform_state_has_resource "${release_address}"; then
    if ! terraform -chdir="${HOSTED_TERRAFORM_DIR}" state show "${release_address}" | grep -F 'name = "cloud.firestore"' >/dev/null 2>&1; then
      terraform -chdir="${HOSTED_TERRAFORM_DIR}" state rm "${release_address}" >/dev/null 2>&1 || true
    fi
  fi

  if ! terraform_state_has_resource "${release_address}"; then
    terraform -chdir="${HOSTED_TERRAFORM_DIR}" import "${terraform_args[@]}" \
      "${release_address}" \
      "projects/${HOSTED_PROJECT_ID}/releases/cloud.firestore" >/dev/null 2>&1 || true
  fi
}

check_hosted_cloud_prereqs() {
  require_command gcloud
  require_command terraform

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
}

check_hosted_frontend_prereqs() {
  require_command npx
}

build_and_push_hosted_backend_image() {
  check_hosted_cloud_prereqs

  print_hosted_target_summary
  echo "Bootstrapping required Cloud Run APIs and Artifact Registry repository..."

  local terraform_args=()
  append_terraform_hosted_var_args
  terraform -chdir="${HOSTED_TERRAFORM_DIR}" init -input=false
  terraform -chdir="${HOSTED_TERRAFORM_DIR}" apply \
    -input=false \
    -auto-approve \
    -target="module.cloud_run_backend.google_project_service.required" \
    -target="module.cloud_run_backend.google_artifact_registry_repository.backend_images" \
    "${terraform_args[@]}"

  echo "Building and pushing backend image with Cloud Build..."

  local build_config
  build_config="$(mktemp)"
  trap 'rm -f "${build_config}"' EXIT

  cat > "${build_config}" <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args:
      - build
      - -f
      - backend/Dockerfile
      - -t
      - ${HOSTED_CONTAINER_IMAGE}
      - .
images:
  - ${HOSTED_CONTAINER_IMAGE}
EOF

  gcloud builds submit \
    --project="${HOSTED_PROJECT_ID}" \
    --config="${build_config}" \
    .

  trap - EXIT
  rm -f "${build_config}"
}

seed_hosted_auth_users() {
  check_hosted_cloud_prereqs
  print_hosted_target_summary
  npx tsx scripts/seedHostedAuthUsers.ts --project "${HOSTED_PROJECT_ID}"
}

deploy_hosted_frontend() {
  check_hosted_frontend_prereqs

  print_hosted_target_summary
  echo "Rendering hosted frontend runtime config from Terraform outputs..."
  npx tsx scripts/renderHostedFrontendEnv.ts --terraform-dir "${HOSTED_TERRAFORM_DIR}"

  echo "Building frontend with hosted Firebase and backend configuration..."
  set -a
  # shellcheck disable=SC1091
  source .firebase/hosting.frontend.env
  set +a
  npm run build

  echo "Deploying static frontend to Firebase Hosting..."
  npx firebase-tools deploy --project "${HOSTED_PROJECT_ID}" --only hosting
}
