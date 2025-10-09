#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
API_DIR="$ROOT_DIR/services/api-server"
ADMIN_DIR="$ROOT_DIR/services/admin-app/app"

API_PID=""
ADMIN_PID=""
MAIN_PID=""

cleanup() {
  local exit_code=${1:-$?}

  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi

  if [[ -n "$ADMIN_PID" ]] && kill -0 "$ADMIN_PID" 2>/dev/null; then
    kill "$ADMIN_PID" 2>/dev/null || true
  fi

  if [[ -n "$MAIN_PID" ]] && kill -0 "$MAIN_PID" 2>/dev/null; then
    kill "$MAIN_PID" 2>/dev/null || true
  fi

  if [[ -n "$API_PID" ]]; then
    wait "$API_PID" 2>/dev/null || true
  fi

  if [[ -n "$ADMIN_PID" ]]; then
    wait "$ADMIN_PID" 2>/dev/null || true
  fi

  if [[ -n "$MAIN_PID" ]]; then
    wait "$MAIN_PID" 2>/dev/null || true
  fi

  return "$exit_code"
}

trap 'cleanup $? > /dev/null' EXIT
trap 'cleanup 130 > /dev/null; exit 130' INT
trap 'cleanup 143 > /dev/null; exit 143' TERM

printf 'Starting Tessaro API server...\n'
(
  cd "$API_DIR"
  deno task dev
) &
API_PID=$!

printf 'Starting Tessaro admin app...\n'
(
  cd "$ADMIN_DIR"
  npm run dev -- --host
) &
ADMIN_PID=$!

printf 'Starting Tessaro main app...\n'
(
  cd "$ROOT_DIR/services/main-app/app"
  npm run dev -- --host
) &
MAIN_PID=$!

echo
printf 'API server PID: %s\n' "$API_PID"
printf 'Admin app PID: %s\n' "$ADMIN_PID"
printf 'Main app PID: %s\n' "$MAIN_PID"
printf 'Use Ctrl+C to stop all services.\n\n'

wait -n "$API_PID" "$ADMIN_PID" "$MAIN_PID"
first_exit=$?
cleanup "$first_exit" > /dev/null
exit "$first_exit"
