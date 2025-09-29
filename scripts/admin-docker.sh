#!/usr/bin/env bash
set -euo pipefail

IMAGE_NAME=${IMAGE_NAME:-tessaro-admin:latest}
CONTAINER_NAME=${CONTAINER_NAME:-tessaro-admin}
HOST_PORT=${HOST_PORT:-4173}
CONTAINER_PORT=${CONTAINER_PORT:-4173}
USERS_API_HOST=${USERS_API_HOST:-users-api}
USERS_API_PORT=${USERS_API_PORT:-4000}
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-tessaro}
COMPOSE_FILE=${COMPOSE_FILE:-infra/docker/docker-compose.yml}
ADMIN_COMPOSE_FILE=${ADMIN_COMPOSE_FILE:-infra/docker/docker-compose.admin.yml}

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

cd "${REPO_ROOT}"

export PATH="${REPO_ROOT}/node_modules/.bin:${REPO_ROOT}/apps/admin/node_modules/.bin:${PATH}"

echo "Running jest suite..."
CI=true npm test -- --runInBand

echo "Building admin application bundle..."
npm run admin:build

export IMAGE_NAME
export CONTAINER_NAME
export HOST_PORT
export CONTAINER_PORT
export VITE_USERS_API_URL=${VITE_USERS_API_URL:-http://${USERS_API_HOST}:${USERS_API_PORT}}

COMPOSE_ARGS=(
  compose
  -p "${COMPOSE_PROJECT_NAME}"
  -f "${COMPOSE_FILE}"
  -f "${ADMIN_COMPOSE_FILE}"
)

echo "Stopping any existing admin stack (project: ${COMPOSE_PROJECT_NAME})..."
docker "${COMPOSE_ARGS[@]}" down --remove-orphans >/dev/null 2>&1 || true

echo "Building admin Docker image (${IMAGE_NAME}) via docker compose..."
docker "${COMPOSE_ARGS[@]}" build admin

echo "Starting ScyllaDB and MinIO dependencies..."
docker "${COMPOSE_ARGS[@]}" up -d scylladb users-api minio create-buckets

echo "Starting admin container ${CONTAINER_NAME} on port ${HOST_PORT}..."
docker "${COMPOSE_ARGS[@]}" up -d admin

docker "${COMPOSE_ARGS[@]}" ps

echo "Streaming admin logs (Ctrl+C to detach, containers keep running)..."
docker "${COMPOSE_ARGS[@]}" logs -f admin
