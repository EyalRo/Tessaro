# Tessaro GitOps Infrastructure

This directory defines the FluxCD-driven GitOps layout used to reproduce the Tessaro platform in any Kubernetes cluster.

## Layout

- `clusters/<name>/` – cluster specific state. Each cluster folder contains the `flux-system/` bootstrap manifests produced by `flux bootstrap --export` and the kustomize entrypoint for that cluster.
- `namespaces/` – reusable namespace definitions consumed by each cluster.
- `databases/` – stateful data stores such as ScyllaDB.
- `object-storage/` – MinIO object storage deployment and bootstrap jobs.
- `platform/` – shared platform services (Knative, Scylla operator, CoreDNS patches).
- Service specific Flux overlays now live with their source under `services/*/deploy/flux`.

```
platform/flux/
├── clusters
│   └── home
│       ├── flux-system
│       │   ├── gotk-components.yaml
│       │   ├── gotk-sync.yaml
│       │   └── kustomization.yaml
│       └── kustomization.yaml
├── databases
│   └── scylla
│       ├── kustomization.yaml
│       ├── scylla-client-service.yaml
│       ├── scylla-schema-job.yaml
│       ├── scylla-service.yaml
│       └── scylla-statefulset.yaml
├── namespaces
│   ├── kustomization.yaml
│   └── namespaces.yaml
├── object-storage
│   └── minio
│       ├── kustomization.yaml
│       ├── minio-bucket-job.yaml
│       ├── minio-console-service.yaml
│       ├── minio-pvc.yaml
│       ├── minio-service.yaml
│       └── minio-statefulset.yaml
└── platform
    ├── coredns
    │   ├── coredns-configmap.yaml
    │   └── kustomization.yaml
    ├── knative
    │   ├── kustomization.yaml
    │   ├── knative-eventing-helmrelease.yaml
    │   ├── knative-helmrepository.yaml
    │   ├── knative-serving-domain-config.yaml
    │   ├── knative-serving-helmrelease.yaml
    │   └── net-kourier-helmrelease.yaml
    └── scylla-operator
        ├── kustomization.yaml
        ├── scylla-operator-helmrelease.yaml
        └── scylla-operator-helmrepository.yaml
```

Add new shared infrastructure under the relevant category above and reference it from the appropriate cluster `kustomization.yaml`.

## Bootstrapping FluxCD

1. Generate or reuse an SSH deploy key with write access to the Tessaro repository and store the public key in the Git provider.
2. Create an Age key pair for SOPS decryption and keep the generated secret material safe (`age-keygen -o age.agekey`).
3. Populate a `.env` file in the repository root (see *Local Secrets* below) with Flux deploy key material and MinIO credentials.
4. Run `tools/scripts/bootstrap-flux.sh <cluster-name> <git-url>` from the repository root. The script will:
    - install the Flux controllers (`v2.2.3`) into the `flux-system` namespace,
    - configure Flux to sync from the provided Git repository and branch,
    - create the SOPS Age secret (`sops-age`) in `flux-system` using the key at `~/.config/sops/age/keys.txt`.
5. Commit any changes Flux makes back to Git (image updates, etc.) to keep the Git history in sync with the cluster state.

By default the `gotk-sync.yaml` file expects the Git repository at `ssh://git@github.com/EyalRo/Tessaro.git` on branch `main`. Update this value if the repository lives elsewhere.

## Secure Secret Management

Flux is configured to decrypt SOPS secrets using the `sops-age` secret. Store encrypted files alongside manifests (e.g. `secret.enc.yaml`) and give them a `.sops.yaml` configuration when you introduce the first secret.

To create the Kubernetes secret expected by Flux after generating an Age key:

```bash
kubectl -n flux-system create secret generic sops-age \
  --from-file=age.agekey=$HOME/.config/sops/age/keys.txt
```

## Local Secrets (.env)

Secrets that should not be committed (Flux deploy key, MinIO root credentials) live in a root-level `.env` file that is excluded from Git. The bootstrap script sources this file and renders Kubernetes secrets on demand.

Expected keys:

```
MINIO_ROOT_USER=<minio root user>
MINIO_ROOT_PASSWORD='<minio root password>'
FLUX_DEPLOY_KEY_B64=<base64 encoded private key>
FLUX_DEPLOY_KEY_PUB='<public key to register in GitHub>'
FLUX_KNOWN_HOSTS_B64=<base64 encoded ssh-keyscan output for github.com>
```

The script decodes these values to create the `minio-root-credentials` secret in `object-storage` and the `flux-system` deploy key secret in `flux-system`. Regenerate the secrets by rerunning the bootstrap script after updating the `.env` contents.

## Cluster Storage

Cluster workloads now rely on the default storage classes available inside the Kubernetes cluster itself:

- `databases/scylla` deploys a single-node ScyllaDB `StatefulSet`, exposes a client service, and runs a bootstrap Job that creates the `tessaro_admin` keyspace and core tables. Its `PersistentVolumeClaim` omits `storageClassName` and is compatible with standard `ReadWriteOnce` provisioners.
- `object-storage/minio` deploys MinIO with `ReadWriteOnce` storage, root credentials sourced from `.env`, and a bootstrap job to create the `tessaro-profile-pictures` bucket with anonymous download access.
- `platform/coredns` patches CoreDNS for custom host entries needed by the home cluster (edit the ConfigMap to match your LAN as required).

## Environments

The repository currently contains a single `home` cluster definition suited for a home-lab deployment. To add more environments:

1. Copy `clusters/home` to `clusters/<env>`.
2. Adjust `gotk-sync.yaml` with the target branch and path for that environment.
3. Patch the cluster `kustomization.yaml` to pull in environment-specific overlays or components.
