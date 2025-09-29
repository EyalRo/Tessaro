# Tessaro GitOps Infrastructure

This directory defines the FluxCD-driven GitOps layout used to reproduce the Tessaro platform in any Kubernetes cluster.

## Layout

- `clusters/<name>/` – cluster specific state. Each cluster folder contains the `flux-system/` bootstrap manifests produced by `flux bootstrap --export` and the kustomize entrypoint for that cluster.
- `modules/` – reusable building blocks (namespaces, storage, applications). These modules are composed per-cluster through kustomize.

```
infra/k8s/
├── clusters
│   └── home
│       ├── flux-system
│       │   ├── gotk-components.yaml
│       │   ├── gotk-sync.yaml
│       │   └── kustomization.yaml
│       └── kustomization.yaml
└── modules
    ├── namespaces
    │   ├── kustomization.yaml
    │   └── namespaces.yaml
    └── storage
        └── nfs
            ├── base
            │   ├── kustomization.yaml
            │   ├── pvc.yaml
            │   └── storageclass.yaml
            └── kustomization.yaml
```

Add new shared components under `modules/` and reference them from the appropriate cluster `kustomization.yaml`.

## Bootstrapping FluxCD

1. Generate or reuse an SSH deploy key with write access to the Tessaro repository and store the public key in the Git provider.
2. Create an Age key pair for SOPS decryption and keep the generated secret material safe (`age-keygen -o age.agekey`).
3. Populate a `.env` file in the repository root (see *Local Secrets* below) with NAS credentials and Flux deploy key material.
4. Run `scripts/bootstrap-flux.sh <cluster-name> <git-url>` from the repository root. The script will:
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

Secrets that should not be committed (NAS credentials, Flux deploy key) live in a root-level `.env` file that is excluded from Git. The bootstrap script sources this file and renders Kubernetes secrets on demand.

Expected keys:

```
NAS_USERNAME=<nas user>
NAS_PASSWORD='<nas password>'
FLUX_DEPLOY_KEY_B64=<base64 encoded private key>
FLUX_DEPLOY_KEY_PUB='<public key to register in GitHub>'
FLUX_KNOWN_HOSTS_B64=<base64 encoded ssh-keyscan output for github.com>
```

The script decodes these values to create the `nas-nfs-credentials` secret in the `storage` namespace and the `flux-system` deploy key secret in `flux-system`. Regenerate the secrets by rerunning the bootstrap script after updating the `.env` contents.

## NAS Backed Storage

The `modules/storage/nfs` package provisions:

- a `storage` namespace used to isolate storage configuration,
- an automatically generated `nas-nfs-credentials` secret populated from `.env`,
- a `nas-nfs-csi` storage class targeting `nfs://nas.dino.home/volume1/k8s` via the NFS CSI driver,
- a reusable `nas-shared-pvc` claim (`ReadWriteMany`, 100Gi) for workloads that need shared persistent storage.

Ensure that the [Kubernetes NFS CSI Driver](https://github.com/kubernetes-csi/csi-driver-nfs) is deployed in the target cluster; Flux can manage it as another module once you add the manifests here.

## Environments

The repository currently contains a single `home` cluster definition suited for a home-lab deployment. To add more environments:

1. Copy `clusters/home` to `clusters/<env>`.
2. Adjust `gotk-sync.yaml` with the target branch and path for that environment.
3. Patch the cluster `kustomization.yaml` to pull in environment-specific overlays or modules.
