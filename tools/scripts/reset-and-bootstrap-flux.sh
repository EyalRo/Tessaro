#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPT_DIR="${ROOT_DIR}/tools/scripts"
BOOTSTRAP_SCRIPT="${SCRIPT_DIR}/bootstrap-flux.sh"
FLUX_NAMESPACE="${FLUX_NAMESPACE:-flux-system}"
PROTECTED_NAMESPACES=(default kube-system kube-public kube-node-lease)

usage() {
  cat <<USAGE
Usage: $0 <cluster-name> <git-url> [branch]

Arguments:
  cluster-name  Cluster folder under platform/flux/clusters (e.g. home)
  git-url       Git URL Flux should sync from (ssh recommended)
  branch        Optional branch name (defaults to value used by bootstrap script)

The script deletes every namespace in the current Kubernetes cluster except
for the built-in system namespaces, uninstalls Flux if present, and then
re-runs the standard bootstrap helper to repopulate the cluster from Git.
USAGE
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

if [[ ! -x "${BOOTSTRAP_SCRIPT}" ]]; then
  echo "Error: bootstrap helper not found at ${BOOTSTRAP_SCRIPT}" >&2
  exit 1
fi

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Error: kubectl is required but was not found in PATH." >&2
  exit 1
fi

mapfile -t ALL_NAMESPACES < <(kubectl get namespaces -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' 2>/dev/null || true)

declare -a NAMESPACES_TO_DELETE=()
for ns in "${ALL_NAMESPACES[@]}"; do
  skip=false
  for protected in "${PROTECTED_NAMESPACES[@]}"; do
    if [[ "${ns}" == "${protected}" ]]; then
      skip=true
      break
    fi
  done
  if [[ "${ns}" == "${FLUX_NAMESPACE}" ]]; then
    skip=false
  fi
  if [[ "${ns}" != "" && "${skip}" == "false" ]]; then
    NAMESPACES_TO_DELETE+=("${ns}")
  fi
done

if command -v flux >/dev/null 2>&1; then
  echo "Uninstalling Flux components (if present)..."
  if ! flux uninstall --silent >/dev/null 2>&1; then
    echo "Warning: flux uninstall did not complete cleanly; continuing anyway" >&2
  fi
else
  echo "flux CLI not found; skipping flux uninstall step" >&2
fi

for ns in "${NAMESPACES_TO_DELETE[@]}"; do
  echo "Deleting namespace '${ns}'..."
  kubectl delete namespace "${ns}" --ignore-not-found --wait=false
done

wait_for_namespaces() {
  local remaining=()
  remaining=("$@")
  if [[ ${#remaining[@]} -eq 0 ]]; then
    return
  fi

  echo "Waiting for namespaces to terminate..."
  local attempt
  for attempt in {1..60}; do
    local still_exists=()
    for ns in "${remaining[@]}"; do
      if kubectl get namespace "${ns}" >/dev/null 2>&1; then
        still_exists+=("${ns}")
      fi
    done

    if [[ ${#still_exists[@]} -eq 0 ]]; then
      echo "All namespaces removed."
      return
    fi

    remaining=("${still_exists[@]}")
    sleep 5
  done

  echo "Error: Timed out waiting for namespaces to terminate: ${remaining[*]}" >&2
  exit 1
}

wait_for_namespaces "${NAMESPACES_TO_DELETE[@]}"

echo "Rebootstrapping Flux with latest Git state..."
"${BOOTSTRAP_SCRIPT}" "$@"
