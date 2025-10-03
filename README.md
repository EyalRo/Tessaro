# Tessaro Monorepo

> ⚠️ **IMPORTANT**: This repository is now applied directly with `kubectl`.
> Update the manifests in Git, then use `kubectl apply -k` against the
> appropriate kustomization to push changes into the cluster.

This repository contains all code and infrastructure for the **Tessaro platform**,
including the **Admin Interface** and the **Main App** (customer-facing). It is
organized as a monorepo to enable shared libraries, consistent CI/CD, and
Infrastructure-as-Code management.

---

## Overview

Tessaro is a SaaS platform providing multiple services under one umbrella.
Customers access services through the **Main App**, while Tessaro administrators
govern users, organizations, and services via the **Admin Interface**.

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

* **Serverless functions and microservices** power API endpoints for user,
  organization, and service management.
* **Event-Driven Architecture (EDA)**: NATS is used as the messaging backbone for
  asynchronous communication and queueing.
* **ScyllaDB** is the primary database, optimized for high throughput and low
  latency, and now runs inside Kubernetes.
* **MinIO** provides S3-compatible object storage and persists data to the shared
  NFS backend.
* **Knative** hosts the stateless API surface; use port-forwarding or the `kn`
  CLI for rapid feedback loops.

### Shared Libraries

* **UI Kit**: Shared components across apps (buttons, modals, forms).
* **Auth SDK**: Identity provider integration, role/claim helpers, org-context
  utilities.
* **API Client**: Typed clients for backend functions and services.
* **Utils**: Logging, date/time formatting, data validation.

### Infrastructure

* **Kubernetes** reconciles stateful platform dependencies (ScyllaDB, MinIO) and
  the Knative control plane.
* **Kustomize** bases live under `infra/k8s`; apply them with `kubectl`.
* CI/CD pipelines are defined in GitHub Actions.

---

## Folder Structure

```bash
📦 tessaro/
├── services/                     # Deployable surfaces own their code, tests, and manifests
│   ├── admin-app/
│   │   ├── app/                  # Vite-powered admin UI
│   │   └── deploy/k8s/           # Kustomize entrypoint for the admin web app
│   ├── users-api/
│   │   ├── functions/            # Knative functions for user CRUD
│   │   └── deploy/k8s/           # Kustomize entrypoint for the users API services
│   ├── orgs-api/
│   │   ├── functions/            # Knative functions for organization CRUD
│   │   └── deploy/k8s/           # Reserved for future org API manifests
│   ├── services-api/
│   │   ├── functions/            # Knative functions for service catalog CRUD
│   │   └── deploy/k8s/           # Reserved for future service API manifests
│   └── storage-service/
│       ├── functions/            # Storage handlers and asset workflows
│       └── deploy/k8s/           # Reserved for storage deployment manifests
│
├── shared/
│   ├── libs/                     # Reusable TypeScript packages (auth, database, API clients)
│   ├── config/                   # Cross-service configuration helpers
│   └── testing/                  # Shared Jest reporters and utilities
│
├── infra/
│   └── k8s/                      # Cluster-level kustomizations applied with kubectl
│       └── clusters/
│           └── home/             # Example cluster composition that references service manifests
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

* `kubectl` with access to the Kubernetes cluster
* Optional: `kustomize` CLI (if you want to render manifests locally)
* Optional: Knative CLI (`kn`) for direct service inspection and invocation

### Running Locally

Knative hosts the serverless APIs. Local workflows typically involve:

* Applying updated manifests with `kubectl apply -k infra/k8s/clusters/home`.
* Using `kubectl port-forward svc/users-api-get -n apps 8080:80` (or `kn service proxy`)
  to exercise functions locally.

For configuration management, the platform uses Kubernetes ConfigMaps. When
running locally, ensure that the `tessaro-config` ConfigMap is deployed to your
cluster. This ConfigMap contains environment-specific configuration such as
service URLs and CORS origins.

#### Admin App

For quick UI development you can run the Admin app directly:

```bash
npm install --prefix services/admin-app/app
npm run admin:dev
```

The development server listens on <http://localhost:5173> by default. Use `PORT`
to override the port when needed. For mocked API interactions during UI work,
point `VITE_USERS_API_URL` at a port-forwarded Knative service or a local stub.

To point to a Knative service via port-forwarding:

```bash
kubectl port-forward svc/users-api-get -n apps 8080:80
```

Then set `VITE_USERS_API_URL=http://localhost:8080` when starting the admin app.

### Tests

* Unit tests exist under each service's `tests/` folder.
* End-to-end tests are located in the root `tests/` directory.
* When building container images, make sure Dockerfiles execute the test suite
  (e.g. `RUN npm test`) before the final build command so failures are caught
  during the image build.

---

## Deployment

### Building and publishing container images

First-party services pull images from the in-cluster registry at
`registry.tessaro.dino.home`. Build and push images using your container tool of
choice, for example:

```bash
docker build -t registry.tessaro.dino.home/admin-app:$(git rev-parse --short HEAD) services/admin-app/app
docker push registry.tessaro.dino.home/admin-app:$(git rev-parse --short HEAD)
```

Repeat for each service that needs an updated image.

### Applying manifests with kubectl

1. Update the desired manifests under `services/*/deploy/k8s` or `infra/k8s`.
2. Commit the change to Git.
3. Apply the kustomization for your cluster:

   ```bash
   kubectl apply -k infra/k8s/clusters/home
   ```

4. Watch resource status with standard Kubernetes tooling such as
   `kubectl get pods -n apps`.

CI/CD pipelines are defined in **.github/workflows/**. Each push to `main`
triggers build and test steps.

---

## Security & Compliance

* Separate OIDC clients for Admin vs. Main App.
* Immutable audit logs for all admin actions.
* Infrastructure and code changes peer-reviewed via pull requests.

---

**Summary**: This monorepo hosts everything needed to run Tessaro at scale —
apps, microservices, functions, shared libraries, and infrastructure — with a
secure, GitHub-driven CI/CD pipeline on Kubernetes.

# Tessaro
