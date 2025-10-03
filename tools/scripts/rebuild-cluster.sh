#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="${ROOT_DIR}/tools/scripts"
RESET_SCRIPT="${SCRIPT_DIR}/reset-and-bootstrap-flux.sh"
RECONCILE_SCRIPT="${SCRIPT_DIR}/reconcile-flux.sh"
SEED_SCRIPT="${SCRIPT_DIR}/seed-scylla-admin.sh"
PUBLISH_SCRIPT="${SCRIPT_DIR}/publish-images.sh"

CLUSTER_NAME="home"
FLUX_GIT_URL="ssh://git@github.com/EyalRo/Tessaro.git"
FLUX_BRANCH="main"
FLUX_KUSTOMIZATION="tessaro-cluster"
REGISTRY_HOST_DEFAULT="registry.tessaro.dino.home"
VERSION_DEFAULT="v$(date -u +%Y%m%d%H%M%S)"

info() {
  printf '\033[1;34m[rebuild]\033[0m %s\n' "$*"
}

error() {
  printf '\033[1;31m[rebuild]\033[0m %s\n' "$*" 1>&2
}

require_command() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    error "Required command '${cmd}' was not found in PATH."
    exit 1
  fi
}

require_file() {
  local file="$1"
  if [[ ! -x "${file}" ]]; then
    error "Required helper script '${file}' is missing or not executable."
    exit 1
  fi
}

main() {
  require_command kubectl
  require_command flux
  require_command docker
  require_command npm

  require_file "${RESET_SCRIPT}"
  require_file "${RECONCILE_SCRIPT}"
  require_file "${SEED_SCRIPT}"
  require_file "${PUBLISH_SCRIPT}"

  info "Wiping cluster namespaces and re-bootstrapping Flux from Git..."
  "${RESET_SCRIPT}" "${CLUSTER_NAME}" "${FLUX_GIT_URL}" "${FLUX_BRANCH}"

  info "Reconciling Flux kustomization '${FLUX_KUSTOMIZATION}'..."
  DEFAULT_KUSTOMIZATION_OVERRIDE="${FLUX_KUSTOMIZATION}" \
    "${RECONCILE_SCRIPT}"

  info "Seeding ScyllaDB admin schema and demo data..."
  "${SEED_SCRIPT}"

  info "Installing npm dependencies..."
  (cd "${ROOT_DIR}" && npm install)

  info "Building admin web assets..."
  (cd "${ROOT_DIR}" && npm run admin:build)

  export REGISTRY_HOST="${REGISTRY_HOST:-${REGISTRY_HOST_DEFAULT}}"
  export VERSION="${VERSION:-${VERSION_DEFAULT}}"

  info "Building and pushing container images to ${REGISTRY_HOST} with tag ${VERSION}..."
  "${PUBLISH_SCRIPT}"

  info "Cluster rebuild workflow completed successfully."
}

main "$@"
