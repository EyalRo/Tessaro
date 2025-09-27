#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${IMAGE_NAME:-tessaro-admin:latest}
CONTAINER_NAME=${CONTAINER_NAME:-tessaro-admin}
HOST_PORT=${HOST_PORT:-4173}
CONTAINER_PORT=${CONTAINER_PORT:-4173}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

cd "${REPO_ROOT}"

export PATH="${REPO_ROOT}/node_modules/.bin:${REPO_ROOT}/apps/admin/node_modules/.bin:${PATH}"

echo "Running jest suite..."
CI=true npm test -- --runInBand

echo "Building admin application bundle..."
npm run admin:build

echo "Building admin Docker image (${IMAGE_NAME})..."
docker build -t "${IMAGE_NAME}" -f apps/admin/Dockerfile .

if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}"; then
  echo "Removing existing container ${CONTAINER_NAME}..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

echo "Starting admin container ${CONTAINER_NAME} on port ${HOST_PORT}..."
docker run \
  --rm \
  --name "${CONTAINER_NAME}" \
  -e PORT="${CONTAINER_PORT}" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  "${IMAGE_NAME}"
