#!/usr/bin/env bash
set -euo pipefail

# Seeds the ScyllaDB instance managed by Flux inside Kubernetes with the
# tessaro_admin schema and demo data used by the Admin app.

KUBECTL=${KUBECTL:-kubectl}
SCYLLA_NAMESPACE=${SCYLLA_NAMESPACE:-databases}
SCYLLA_LABEL=${SCYLLA_LABEL:-app.kubernetes.io/name=scylla}
SCYLLA_SERVICE=${SCYLLA_SERVICE:-scylla-client.databases.svc.cluster.local}
SCYLLA_PORT=${SCYLLA_PORT:-9042}
RESET_KEYSPACE=${RESET_KEYSPACE:-1}
WAIT_TIMEOUT_SECONDS=${WAIT_TIMEOUT_SECONDS:-240}
POLL_INTERVAL_SECONDS=${POLL_INTERVAL_SECONDS:-5}

info() {
  printf '\033[1;34m[seed]\033[0m %s\n' "$*"
}

warn() {
  printf '\033[1;33m[seed]\033[0m %s\n' "$*" 1>&2
}

error() {
  printf '\033[1;31m[seed]\033[0m %s\n' "$*" 1>&2
}

require_kubectl() {
  if ! command -v "${KUBECTL}" >/dev/null 2>&1; then
    error "kubectl not found in PATH; set KUBECTL to a valid executable."
    exit 1
  fi
}

lookup_scylla_pod() {
  "${KUBECTL}" -n "${SCYLLA_NAMESPACE}" get pod \
    -l "${SCYLLA_LABEL}" \
    -o jsonpath='{.items[0].metadata.name}' 2>/dev/null
}

wait_for_scylla() {
  info "Waiting for a Scylla pod in namespace '${SCYLLA_NAMESPACE}'..."
  local waited=0
  while true; do
    SCYLLA_POD=$(lookup_scylla_pod)
    if [[ -n "${SCYLLA_POD}" ]]; then
      info "Found pod ${SCYLLA_POD}. Ensuring CQL endpoint is reachable..."
      break
    fi
    if (( waited >= WAIT_TIMEOUT_SECONDS )); then
      error "Timed out waiting for a Scylla pod with label ${SCYLLA_LABEL}."
      exit 1
    fi
    sleep "${POLL_INTERVAL_SECONDS}"
    waited=$((waited + POLL_INTERVAL_SECONDS))
  done

  waited=0
  while true; do
    if "${KUBECTL}" -n "${SCYLLA_NAMESPACE}" exec "${SCYLLA_POD}" -- \
        cqlsh "${SCYLLA_SERVICE}" "${SCYLLA_PORT}" -e "SELECT now() FROM system.local" >/dev/null 2>&1; then
      info "CQL endpoint is responding."
      break
    fi
    if (( waited >= WAIT_TIMEOUT_SECONDS )); then
      error "Timed out waiting for CQL connectivity to ${SCYLLA_SERVICE}:${SCYLLA_PORT}."
      exit 1
    fi
    sleep "${POLL_INTERVAL_SECONDS}"
    waited=$((waited + POLL_INTERVAL_SECONDS))
  done
}

run_cql() {
  local label=$1
  shift
  info "Executing ${label} statements..."
  "${KUBECTL}" -n "${SCYLLA_NAMESPACE}" exec -i "${SCYLLA_POD}" -- \
    cqlsh "${SCYLLA_SERVICE}" "${SCYLLA_PORT}" "$@"
}

apply_schema() {
  if [[ "${RESET_KEYSPACE}" == "1" ]]; then
    warn "RESET_KEYSPACE=1; existing tessaro_admin data will be dropped."
    run_cql schema <<'CQL'
DROP KEYSPACE IF EXISTS tessaro_admin;
CQL
  fi

  run_cql schema <<'CQL'
CREATE KEYSPACE IF NOT EXISTS tessaro_admin
  WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
  AND durable_writes = true;

USE tessaro_admin;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text,
  name text,
  role text,
  avatar_url text,
  created_at timestamp,
  updated_at timestamp
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text,
  plan text,
  status text,
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY,
  name text,
  type text,
  status text,
  created_at timestamp,
  updated_at timestamp
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY,
  action text,
  user_id uuid,
  target_id text,
  ip_address text,
  timestamp timestamp,
  metadata text
);

CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs (user_id);
CQL
}

seed_data() {
  run_cql seed <<'CQL'
USE tessaro_admin;

TRUNCATE users;
TRUNCATE organizations;
TRUNCATE services;
TRUNCATE audit_logs;

INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at)
VALUES (
  00000000-0000-0000-0000-000000000001,
  'admin@tessaro.dev',
  'Admin User',
  'Administrator',
  null,
  toTimestamp(now()),
  toTimestamp(now())
);

INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at)
VALUES (
  00000000-0000-0000-0000-000000000002,
  'alex.manager@acme.co',
  'Alex Manager',
  'Manager',
  'https://avatars.example.com/alex.png',
  toTimestamp(now()),
  toTimestamp(now())
);

INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at)
VALUES (
  00000000-0000-0000-0000-000000000003,
  'sarah.analyst@acme.co',
  'Sarah Analyst',
  'Analyst',
  null,
  toTimestamp(now()),
  toTimestamp(now())
);

INSERT INTO organizations (id, name, plan, status, created_at, updated_at)
VALUES (
  10000000-0000-0000-0000-000000000001,
  'Acme Corporation',
  'enterprise',
  'active',
  toTimestamp(now()),
  toTimestamp(now())
);

INSERT INTO services (id, name, type, status, created_at, updated_at)
VALUES (
  20000000-0000-0000-0000-000000000001,
  'Workflow Automation',
  'automation',
  'active',
  toTimestamp(now()),
  toTimestamp(now())
);

INSERT INTO audit_logs (id, action, user_id, target_id, ip_address, timestamp, metadata)
VALUES (
  30000000-0000-0000-0000-000000000001,
  'USER_LOGIN',
  00000000-0000-0000-0000-000000000001,
  'admin@tessaro.dev',
  '192.168.1.100',
  toTimestamp(now()),
  '{"role":"Administrator"}'
);
CQL
}

main() {
  require_kubectl
  wait_for_scylla
  apply_schema
  seed_data
  info "Scylla seeding complete."
}

main "$@"
