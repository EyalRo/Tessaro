#!/usr/bin/env bash
set -euo pipefail

DEFAULT_KUSTOMIZATION="home"
FLUX_NAMESPACE="${FLUX_NAMESPACE:-flux-system}"
KUSTOMIZATION_NAME="${1:-${DEFAULT_KUSTOMIZATION}}"

usage() {
  cat <<USAGE
Usage: $0 [kustomization-name]

Arguments:
  kustomization-name  Optional Flux kustomization to reconcile (default: ${DEFAULT_KUSTOMIZATION})

Environment:
  FLUX_NAMESPACE      Namespace that hosts Flux resources (default: flux-system)
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v flux >/dev/null 2>&1; then
  echo "Error: flux CLI is required but was not found in PATH." >&2
  exit 1
fi

reconcile_args=("kustomization" "${KUSTOMIZATION_NAME}" "--namespace" "${FLUX_NAMESPACE}" "--with-source")

if [[ -n "${FLUX_TIMEOUT:-}" ]]; then
  reconcile_args+=("--timeout" "${FLUX_TIMEOUT}")
fi

if [[ -n "${FLUX_OUTPUT:-}" ]]; then
  reconcile_args+=("--output" "${FLUX_OUTPUT}")
fi

echo "Reconciling Flux kustomization '${KUSTOMIZATION_NAME}' in namespace '${FLUX_NAMESPACE}'..."
flux reconcile "${reconcile_args[@]}"

echo
flux get kustomizations --namespace "${FLUX_NAMESPACE}"
