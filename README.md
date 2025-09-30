# Tessaro Monorepo

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
├── apps/
│   ├── admin/                # Tessaro Admin Interface (restricted)
│   │   ├── src/
│   │   │   ├── components/   # Admin UI components
│   │   │   ├── pages/        # Routes: /users, /orgs, /services
│   │   │   ├── layouts/      # Dashboard & navigation
│   │   │   ├── hooks/        # Admin-specific hooks (RBAC, audit)
│   │   │   └── utils/
│   │   ├── public/           # Static assets
│   │   ├── tests/            # Unit & integration tests
│   │   └── project-config
│   │
│   ├── main/                 # Customer-facing Main App
│   │   ├── src/
│   │   │   ├── components/   # Landing, login, org picker, services
│   │   │   ├── pages/        # / (landing), /dashboard, /services
│   │   │   ├── layouts/      # Header, sidebar, footer
│   │   │   ├── hooks/        # Org context, entitlement checks
│   │   │   └── utils/
│   │   ├── public/
│   │   ├── tests/
│   │   └── project-config
│   │
│   └── functions/            # Serverless backend & microservices
│       ├── auth/             # Login, token exchange
│       ├── users/            # CRUD users
│       ├── orgs/             # CRUD organizations
│       ├── services/         # CRUD services
│       ├── audit/            # Logging & compliance
│       ├── storage/          # MinIO integration
│       ├── database/         # ScyllaDB access
│       └── messaging/        # NATS event consumers/producers
│
├── libs/                     # Shared libraries
│   ├── ui/                   # Shared UI components
│   ├── auth/                 # Identity provider helpers & context
│   ├── api-client/           # Typed service clients
│   └── utils/                # Common utilities
│
├── infra/                    # Infrastructure-as-Code
│   ├── k8s/                  # FluxCD-managed Kubernetes manifests (including Knative)
│   └── ci-cd/                # CI/CD pipelines & deployment workflows
│
├── docs/                     # Developer & admin documentation
├── tests/                    # End-to-end integration tests
├── scripts/                  # Dev scripts & database migrations
├── .github/                  # GitHub Actions workflows
└── project-config            # Root workspace configuration
```

---

## Development

### Prerequisites

* kubectl with access to the Flux-managed Kubernetes cluster (ScyllaDB, MinIO, Knative)
* Flux CLI (for reconciliation when testing module updates)
* Optional: Knative CLI (`kn`) for direct service inspection and invocation

### Running Locally

Knative now hosts the serverless APIs. Deployments flow through Flux, so local workflows typically involve:

* Triggering a reconciliation (`flux reconcile kustomization home`) after changing manifests.
* Using `kubectl port-forward svc/users-api-get -n apps 8080:80` (or `kn service proxy`) to exercise functions locally.

#### Admin App

For quick UI development you can run the Admin app directly:

```bash
npm install --prefix apps/admin
npm run admin:dev
```

The development server listens on <http://localhost:5173> by default. Use `PORT` to override the port when needed. For mocked API interactions during UI work, point `VITE_USERS_API_URL` at a port-forwarded Knative service or a local stub.

### Tests

* Unit tests exist under each app's `tests/` folder.
* End-to-end tests are located in the root `tests/` directory.
* When building container images, make sure Dockerfiles execute the test suite (e.g. `RUN npm test`) before the final build command so failures are caught during the image build.

---

## Deployment

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
