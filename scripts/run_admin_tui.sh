#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required to run this script." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Error: docker compose is required to run this script." >&2
  exit 1
fi

started_services=()
start_service_if_needed() {
  local service="$1"
  if [[ -z "$(docker compose ps -q "${service}")" ]]; then
    echo "Starting ${service}..."
    docker compose up -d "${service}"
    started_services+=("${service}")
  else
    echo "${service} is already running."
  fi
}

cleanup() {
  if [[ ${#started_services[@]} -gt 0 ]]; then
    echo "\nStopping services started by this script..."
    docker compose stop "${started_services[@]}"
  fi
}
trap cleanup EXIT

start_service_if_needed ravendb
start_service_if_needed api-server

printf '\nAdmin TUI is starting. Use Ctrl+C to exit.\n\n'

docker compose run --rm admin-tui
