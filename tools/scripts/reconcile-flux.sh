#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_KUSTOMIZATION="tessaro-cluster"
FLUX_NAMESPACE="${FLUX_NAMESPACE:-flux-system}"

find_default_kustomization() {
  if [[ -n "${DEFAULT_KUSTOMIZATION_OVERRIDE:-}" ]]; then
    DEFAULT_KUSTOMIZATION="${DEFAULT_KUSTOMIZATION_OVERRIDE}"
    return
  fi

  local sync_file
  sync_file="$(find "${ROOT_DIR}/platform/flux/clusters" -maxdepth 3 -path '*/flux-system/gotk-sync.yaml' -print -quit 2>/dev/null || true)"

  if [[ -z "${sync_file}" ]]; then
    return
  fi

  local detected
  detected="$(python - <<'PY' "${sync_file}"
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
content = path.read_text()

def extract_name(block):
    lines = block.strip().splitlines()
    if not lines:
        return None

    kind = None
    metadata_name = None
    in_metadata = False

    for raw_line in lines:
        stripped = raw_line.strip()

        if stripped.startswith('kind:'):
            kind = stripped.split(':', 1)[1].strip()
        elif stripped.startswith('metadata:'):
            in_metadata = True
        elif in_metadata:
            if not raw_line.startswith(' '):
                in_metadata = False
            elif stripped.startswith('name:'):
                metadata_name = stripped.split(':', 1)[1].strip()
                break

    if kind == 'Kustomization':
        return metadata_name

    return None

for section in content.split('---'):
    name = extract_name(section)
    if name:
        print(name)
        sys.exit(0)

PY
)"

  if [[ -n "${detected}" ]]; then
    DEFAULT_KUSTOMIZATION="${detected}"
  fi
}

DEFAULT_KUSTOMIZATION_OVERRIDE="${DEFAULT_KUSTOMIZATION_OVERRIDE:-}" 
find_default_kustomization

KUSTOMIZATION_NAME="${1:-${DEFAULT_KUSTOMIZATION}}"

usage() {
  cat <<USAGE
Usage: $0 [kustomization-name]

Arguments:
  kustomization-name  Optional Flux kustomization to reconcile (default: ${DEFAULT_KUSTOMIZATION})
                        Pass a different name to target another kustomization managed by Flux.

Examples:
  $0 public-services
  $0 applications

Environment:
  FLUX_NAMESPACE      Namespace that hosts Flux resources (default: flux-system)
  DEFAULT_KUSTOMIZATION_OVERRIDE
                       Force a different default kustomization name when auto-detection
                       is not desired
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
