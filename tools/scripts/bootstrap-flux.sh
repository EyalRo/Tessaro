#!/usr/bin/env bash
set -euo pipefail

FLUX_VERSION="${FLUX_VERSION:-v2.2.3}"
AGE_KEY_PATH="${AGE_KEY_PATH:-$HOME/.config/sops/age/keys.txt}"
BRANCH="${BRANCH:-main}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${ROOT_DIR}/.env}"

if [[ -f "${ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
else
  echo "Warning: ${ENV_FILE} not found; secrets will need manual creation" >&2
fi

create_flux_secret() {
  if [[ -z "${FLUX_DEPLOY_KEY_B64:-}" ]]; then
    echo "Warning: FLUX_DEPLOY_KEY_B64 not set; skipping flux-system deploy key" >&2
    return
  fi

  local tmp_identity tmp_identity_pub tmp_known
  tmp_identity="$(mktemp)"
  tmp_identity_pub="$(mktemp)"
  tmp_known="$(mktemp)"

  if ! printf '%s' "${FLUX_DEPLOY_KEY_B64}" | base64 --decode > "${tmp_identity}" 2>/dev/null; then
    echo "Error: failed to decode FLUX_DEPLOY_KEY_B64" >&2
    rm -f "${tmp_identity}" "${tmp_identity_pub}" "${tmp_known}"
    return
  fi
  chmod 600 "${tmp_identity}"

  if [[ -n "${FLUX_DEPLOY_KEY_PUB:-}" ]]; then
    printf '%s\n' "${FLUX_DEPLOY_KEY_PUB}" > "${tmp_identity_pub}"
  else
    ssh-keygen -y -f "${tmp_identity}" > "${tmp_identity_pub}"
  fi

  if [[ -n "${FLUX_KNOWN_HOSTS_B64:-}" ]]; then
    if ! printf '%s' "${FLUX_KNOWN_HOSTS_B64}" | base64 --decode > "${tmp_known}" 2>/dev/null; then
      echo "Error: failed to decode FLUX_KNOWN_HOSTS_B64" >&2
      rm -f "${tmp_identity}" "${tmp_identity_pub}" "${tmp_known}"
      return
    fi
  else
    ssh-keyscan -t ed25519 github.com > "${tmp_known}"
  fi

  kubectl -n flux-system create secret generic flux-system \
    --from-file=identity="${tmp_identity}" \
    --from-file=identity.pub="${tmp_identity_pub}" \
    --from-file=known_hosts="${tmp_known}" \
    --dry-run=client -o yaml | kubectl apply -f -

  rm -f "${tmp_identity}" "${tmp_identity_pub}" "${tmp_known}"
}

create_minio_secret() {
  if [[ -z "${MINIO_ROOT_USER:-}" || -z "${MINIO_ROOT_PASSWORD:-}" ]]; then
    echo "Warning: MinIO credentials not set; skipping minio-root-credentials secret" >&2
    return
  fi

  kubectl -n object-storage create secret generic minio-root-credentials \
    --from-literal=username="${MINIO_ROOT_USER}" \
    --from-literal=password="${MINIO_ROOT_PASSWORD}" \
    --dry-run=client -o yaml | kubectl apply -f -
}

usage() {
  cat <<USAGE
Usage: $0 <cluster-name> <git-url> [branch]

Arguments:
  cluster-name  Cluster folder under platform/flux/clusters (e.g. home)
  git-url       Git URL Flux should sync from (ssh recommended)
  branch        Optional branch name (default: main or BRANCH env)

Environment:
  FLUX_VERSION   Flux release tag to install (default: v2.2.3)
  AGE_KEY_PATH   Path to the SOPS Age private key (default: ~/.config/sops/age/keys.txt)
USAGE
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

CLUSTER="$1"
GIT_URL="$2"
if [[ $# -ge 3 ]]; then
  BRANCH="$3"
fi

CLUSTER_ROOT="${ROOT_DIR}/platform/flux/clusters/${CLUSTER}"
SYNC_FILE="${CLUSTER_ROOT}/flux-system/gotk-sync.yaml"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "kubectl is required" >&2
  exit 1
fi

if ! command -v flux >/dev/null 2>&1; then
  echo "flux CLI is required" >&2
  exit 1
fi

if [[ ! -d "${CLUSTER_ROOT}" ]]; then
  echo "Cluster directory ${CLUSTER_ROOT} not found" >&2
  exit 1
fi

if [[ ! -f "${SYNC_FILE}" ]]; then
  echo "Flux sync manifest ${SYNC_FILE} not found" >&2
  exit 1
fi

# Update the Git repository URL and branch inside gotk-sync.yaml.
python - <<'PY' "${SYNC_FILE}" "${GIT_URL}" "${BRANCH}"
import pathlib
import re
import sys

path = pathlib.Path(sys.argv[1])
git_url = sys.argv[2]
branch = sys.argv[3]
text = path.read_text()

url_pattern = re.compile(r"(?m)^(\s*url:\s*).+$")
text, count = url_pattern.subn(rf"\g<1>{git_url}", text, count=1)
if count == 0:
    sys.exit("Failed to update git URL in gotk-sync.yaml")

branch_pattern = re.compile(r"(?m)^(\s*branch:\s*).+$")
text, count = branch_pattern.subn(rf"\g<1>{branch}", text, count=1)
if count == 0:
    sys.exit("Failed to update branch in gotk-sync.yaml")

path.write_text(text)
PY

# Determine the Flux kustomization name from the sync manifest so we can
# trigger the correct reconciliation even if the name changes.
KUSTOMIZATION_NAME="$(python - <<'PY' "${SYNC_FILE}"
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

sys.exit('Failed to locate Kustomization metadata.name in gotk-sync.yaml')
PY
)"

# Ensure the name was discovered successfully.
if [[ -z "${KUSTOMIZATION_NAME}" ]]; then
  echo "Failed to determine the Flux kustomization name from ${SYNC_FILE}" >&2
  exit 1
fi

# Install (or upgrade) the Flux controllers.
echo "Installing Flux controllers ${FLUX_VERSION}..."
kubectl apply -f "https://github.com/fluxcd/flux2/releases/download/${FLUX_VERSION}/install.yaml"

# Create/update the Flux system resources.
echo "Applying flux-system manifests..."
kubectl apply -k "${CLUSTER_ROOT}/flux-system"

# Ensure the SOPS Age secret exists if the key is present locally.
if [[ -f "${AGE_KEY_PATH}" ]]; then
  echo "Creating/Updating sops-age secret from ${AGE_KEY_PATH}..."
  kubectl -n flux-system create secret generic sops-age \
    --from-file=age.agekey="${AGE_KEY_PATH}" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "Age key not found at ${AGE_KEY_PATH}; skip sops-age secret creation" >&2
fi

# Apply the cluster state handled by Flux (namespaces, workloads, etc.).
echo "Applying cluster kustomization..."
kubectl apply -k "${CLUSTER_ROOT}"

# Create runtime secrets that are sourced from the local environment.
create_minio_secret
create_flux_secret

# Trigger an initial reconciliation.
echo "Triggering Flux reconciliation for '${KUSTOMIZATION_NAME}'..."
flux reconcile kustomization "${KUSTOMIZATION_NAME}" --namespace=flux-system --with-source

echo "Flux bootstrap for cluster '${CLUSTER}' complete."
