#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REGISTRY_HOST=${REGISTRY_HOST:-registry.tessaro.dino.home}
VERSION=${VERSION:-v0.1.0}
ADMIN_IMAGE="${REGISTRY_HOST}/apps/admin-web:${VERSION}"
USERS_API_IMAGE="${REGISTRY_HOST}/apps/users-api:${VERSION}"
USERS_API_KNATIVE_IMAGE="${REGISTRY_HOST}/apps/users-api-knative:${VERSION}"

build_and_push() {
  local image="$1"
  local dockerfile="$2"
  local context="$3"

  echo "Building ${image} from ${dockerfile}" >&2
  DOCKER_BUILDKIT=1 docker build \
    -f "${dockerfile}" \
    -t "${image}" \
    "${context}"

  echo "Pushing ${image}" >&2
  docker push "${image}"
}

main() {
  build_and_push "${ADMIN_IMAGE}" "${ROOT_DIR}/services/admin-app/app/Dockerfile" "${ROOT_DIR}"

  build_and_push "${USERS_API_IMAGE}" "${ROOT_DIR}/services/users-api/functions/Dockerfile" "${ROOT_DIR}"

  echo "Tagging ${USERS_API_IMAGE} as ${USERS_API_KNATIVE_IMAGE}" >&2
  docker tag "${USERS_API_IMAGE}" "${USERS_API_KNATIVE_IMAGE}"
  echo "Pushing ${USERS_API_KNATIVE_IMAGE}" >&2
  docker push "${USERS_API_KNATIVE_IMAGE}"
}

main "$@"
