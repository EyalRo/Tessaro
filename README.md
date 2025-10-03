# Tessaro Monorepo

> ⚠️ **IMPORTANT**: This repository uses GitOps with FluxCD for all infrastructure and application management.
> **NEVER** run commands directly on the Kubernetes cluster. **ONLY** update the manifests in this repository,
> commit the change, and reconcile Flux to apply it. Once you've made changes, push to a new branch and create a PR.

This repository contains all code and infrastructure for the **Tessaro platform**, including the **Admin Interface** and the **Main App** (customer-facing). It is organized as a monorepo to enable shared libraries, consistent CI/CD, and Infrastructure-as-Code management.

---

## Overview

Tessaro is a SaaS platform providing multiple services under one umbrella. Customers access services through the **Main App**, while Tessaro administrators govern users, organizations, and services via the **Admin Interface**.

### Applications

* **Main App** (Customer-facing)

  * Public landing page (logged-out state)
  * Log-in flow with shared identity provider
  * Org picker for multi-org users
  * Logged-in shell showing entitled services per org

* **Admin App** (Restricted)

  * CRUD for Users, Organizations, Services
  * Dashboard with system metrics and recent activity
  * Audit logs, bulk operations, and compliance features

### Functions & Microservices

* **Serverless functions and microservices** power API endpoints for user, organization, and service management.
* **Event-Driven Architecture (EDA)**: NATS is used as the messaging backbone for asynchronous communication and queueing.
* **ScyllaDB** is the primary database, optimized for high throughput and low latency, and now runs inside Kubernetes via FluxCD.
* **MinIO** provides S3-compatible object storage and is also managed inside Kubernetes with FluxCD, persisting data to the shared NFS backend.
* **Knative** now hosts the stateless API surface; use port-forwarding or the `kn` CLI for rapid feedback loops.

### Shared Libraries

* **UI Kit**: Shared components across apps (buttons, modals, forms).
* **Auth SDK**: Identity provider integration, role/claim helpers, org-context utilities.
* **API Client**: Typed clients for backend functions and services.
* **Utils**: Logging, date/time formatting, data validation.

### Infrastructure

* **FluxCD + Kubernetes** reconcile stateful platform dependencies (ScyllaDB, MinIO) against this repository and persist them on the NAS-backed NFS share.
* **FluxCD + Knative** keep the fleet reconciled; local overrides happen via namespace-scoped Kustomizations or temporary `kn` revisions.
* CI/CD pipelines are defined in GitHub Actions.

---

## Folder Structure

```bash
📦 tessaro/
├── services/                     # Deployable surfaces own their code, tests, and manifests
│   ├── admin-app/
│   │   ├── app/                  # Vite-powered admin UI
│   │   └── deploy/flux/          # Flux kustomization for the admin web app
│   ├── users-api/
│   │   ├── functions/            # Knative functions for user CRUD
│   │   └── deploy/flux/          # Flux definitions for the users API services
│   ├── orgs-api/
│   │   ├── functions/            # Knative functions for organization CRUD
│   │   └── deploy/flux/          # Reserved for future org API manifests
│   ├── services-api/
│   │   ├── functions/            # Knative functions for service catalog CRUD
│   │   └── deploy/flux/          # Reserved for future service API manifests
│   └── storage-service/
│       ├── functions/            # Storage handlers and asset workflows
│       └── deploy/flux/          # Reserved for storage deployment manifests
│
├── shared/
│   ├── libs/                     # Reusable TypeScript packages (auth, database, API clients)
│   ├── config/                   # Cross-service configuration helpers
│   └── testing/                  # Shared Jest reporters and utilities
│
├── platform/
│   └── flux/                     # GitOps source of truth for infrastructure
│       ├── clusters/             # Cluster bootstrap and Flux sync manifests
│       ├── databases/            # ScyllaDB stateful set and schema jobs
│       ├── namespaces/           # Namespace definitions
│       ├── object-storage/       # MinIO deployment, services, and bootstrap jobs
│       └── platform/             # Knative, Scylla operator, and supporting components
│
├── tools/
│   └── scripts/                  # Flux reconciliation, bootstrap, and data seeding helpers
│
├── jest.config.cjs
├── jest.setup.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

---

## Development

### Prerequisites

* kubectl with access to the Flux-managed Kubernetes cluster (ScyllaDB, MinIO, Knative)
* Flux CLI (for reconciliation when testing module updates)
* Optional: Knative CLI (`kn`) for direct service inspection and invocation

### Running Locally

> ⚠️ **IMPORTANT**: This repository uses GitOps with FluxCD for all infrastructure and application management.
> **NEVER** run commands directly on the Kubernetes cluster. **ONLY** update the manifests in this repository,
> commit the change, and reconcile Flux to apply it. Once you've made changes, push to a new branch and create a PR.

Knative now hosts the serverless APIs. Deployments flow through Flux, so local workflows typically involve:

* Triggering a reconciliation with `./tools/scripts/reconcile-flux.sh` (or `flux reconcile kustomization home`) after changing manifests.
* Using `kubectl port-forward svc/users-api-get -n apps 8080:80` (or `kn service proxy`) to exercise functions locally.

For configuration management, the platform now uses Kubernetes ConfigMaps. When running locally, ensure that the `tessaro-config` ConfigMap is deployed to your cluster. This ConfigMap contains environment-specific configuration such as service URLs and CORS origins.

#### Admin App

For quick UI development you can run the Admin app directly:

```bash
npm install --prefix services/admin-app/app
npm run admin:dev
```

The development server listens on <http://localhost:5173> by default. Use `PORT` to override the port when needed. For mocked API interactions during UI work, point `VITE_USERS_API_URL` at a port-forwarded Knative service or a local stub.

To point to a Knative service via port-forwarding:
```bash
kubectl port-forward svc/users-api-get -n apps 8080:80
```
Then set `VITE_USERS_API_URL=http://localhost:8080` when starting the admin app.

### Tests

* Unit tests exist under each service's `tests/` folder.
* End-to-end tests are located in the root `tests/` directory.
* When building container images, make sure Dockerfiles execute the test suite (e.g. `RUN npm test`) before the final build command so failures are caught during the image build.

---

## Deployment

> ⚠️ **IMPORTANT**: This repository uses GitOps with FluxCD for all infrastructure and application management.
> **NEVER** run commands directly on the Kubernetes cluster. **ONLY** update the manifests in this repository,
> commit the change, and reconcile Flux to apply it. Once you've made changes, push to a new branch and create a PR.

### Building and publishing container images

First-party services now pull images from the in-cluster registry at `registry.tessaro.dino.home`.
Use the helper script below to build and push the admin web and users API images before
triggering a Flux reconciliation:

```bash
./tools/scripts/publish-images.sh
```

Override the target registry host or version tag if needed:

```bash
REGISTRY_HOST=registry.tessaro.example.com VERSION=v0.1.1 ./tools/scripts/publish-images.sh
```

### Reconciliation workflow

1. Update the desired manifests under `platform/flux`.
2. Commit the change to Git.
3. Run the Flux reconciliation script to apply the desired state:

   ```bash
   ./tools/scripts/reconcile-flux.sh
   ```

   Pass a custom kustomization name if required: `./tools/scripts/reconcile-flux.sh tessaro-cluster`.
4. Use the script output (or rerun `flux get kustomizations`) to confirm the reconciliation completed successfully.

* CI/CD pipelines are defined in **.github/workflows/**.
* Each push to `main` triggers build, test, and deploy steps.
* GitOps ensures infrastructure and services are synced with repo state.
* Stateful dependencies (ScyllaDB, MinIO) are deployed using FluxCD into Kubernetes with persistent storage on the NAS share.
* Flux bootstrap jobs seed the `tessaro_admin` keyspace/tables in Scylla and create the shared MinIO bucket so fresh clusters come up ready for the Admin UI.
* Knative services (e.g. `users-api-get`, `users-api-post`) deploy continuously via Flux—inspect revisions with `kn service list` when validating rollouts.

---

## Security & Compliance

* Separate OIDC clients for Admin vs. Main App.
* Immutable audit logs for all admin actions.
* Infrastructure and code changes peer-reviewed via pull requests.

---

**Summary**: This monorepo hosts everything needed to run Tessaro at scale — apps, microservices, functions, shared libraries, and infrastructure — with a secure, GitHub-driven CI/CD pipeline. Tessaro leverages **FluxCD-managed Kubernetes resources (ScyllaDB, MinIO backed by NFS), Knative for serverless ingress, microservices, and event-driven architecture (NATS)** to deliver scalable, reliable services.
# Tessaro
