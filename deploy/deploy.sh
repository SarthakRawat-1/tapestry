#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TF_DIR="${SCRIPT_DIR}/terraform"
TF_VARS_FILE="${TF_VARS_FILE:-${TF_DIR}/terraform.tfvars}"

if ! command -v terraform >/dev/null 2>&1; then
  echo "Error: terraform is not installed or not in PATH." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is not installed or not in PATH." >&2
  exit 1
fi

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud is not installed or not in PATH." >&2
  exit 1
fi

if [[ ! -f "${TF_VARS_FILE}" ]]; then
  echo "Error: terraform vars file not found at ${TF_VARS_FILE}" >&2
  echo "Create it first from deploy/terraform/terraform.tfvars.example" >&2
  exit 1
fi

extract_var() {
  local key="$1"
  local value
  value=$(grep -E "^[[:space:]]*${key}[[:space:]]*=" "${TF_VARS_FILE}" | head -n1 | sed -E 's/^[^=]*=[[:space:]]*"?([^"#]+)"?.*$/\1/' | tr -d '[:space:]')
  echo "${value}"
}

PROJECT_ID="${PROJECT_ID:-$(extract_var project_id)}"
REGION="${REGION:-$(extract_var region)}"
CONTAINER_IMAGE="${CONTAINER_IMAGE:-$(extract_var container_image)}"

if [[ -z "${PROJECT_ID}" || -z "${REGION}" || -z "${CONTAINER_IMAGE}" ]]; then
  echo "Error: project_id, region, and container_image must be set (env var or terraform.tfvars)." >&2
  exit 1
fi

echo "==> Using project: ${PROJECT_ID}"
echo "==> Using region: ${REGION}"
echo "==> Using image: ${CONTAINER_IMAGE}"

echo "==> Initializing Terraform"
terraform -chdir="${TF_DIR}" init

echo "==> Enabling APIs and creating Artifact Registry (bootstrap apply)"
terraform -chdir="${TF_DIR}" apply -var-file="${TF_VARS_FILE}" -target=google_project_service.required -target=google_artifact_registry_repository.docker_repo -auto-approve

echo "==> Configuring Docker auth for Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

echo "==> Building image"
docker build -f "${SCRIPT_DIR}/Dockerfile" -t "${CONTAINER_IMAGE}" "${REPO_ROOT}"

echo "==> Pushing image"
docker push "${CONTAINER_IMAGE}"

echo "==> Applying full Terraform deployment"
terraform -chdir="${TF_DIR}" apply -var-file="${TF_VARS_FILE}" -auto-approve

echo "==> Deployment complete. Cloud Run URL:"
terraform -chdir="${TF_DIR}" output -raw cloud_run_service_url
