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
* **ScyllaDB** is the primary database, optimized for high throughput and low latency.
* **MinIO** provides S3-compatible object storage.
* **Every component runs as a container and is orchestrated together with Docker Compose.**

### Shared Libraries

* **UI Kit**: Shared components across apps (buttons, modals, forms).
* **Auth SDK**: Identity provider integration, role/claim helpers, org-context utilities.
* **API Client**: Typed clients for backend functions and services.
* **Utils**: Logging, date/time formatting, data validation.

### Infrastructure

* **Docker Compose** is used to orchestrate all components: Admin App, Main App, Functions, ScyllaDB, MinIO, and NATS.
* CI/CD pipelines are defined in GitHub Actions.
* Migration path toward Kubernetes exists for scaling needs, but **initial rollout is Docker-first**.

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
│   ├── docker/               # Docker Compose configs for local/dev
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

* Docker & Docker Compose
* ScyllaDB (database)
* MinIO (object storage)
* NATS (messaging)

### Running Locally

* Use Docker Compose to spin up all services:

```bash
cd infra/docker
docker compose up
```

* This will start Admin App, Main App, Functions, ScyllaDB, MinIO, and NATS in one deployment.

### Tests

* Unit tests exist under each app's `tests/` folder.
* End-to-end tests are located in the root `tests/` directory.

---

## Deployment

* CI/CD pipelines are defined in **.github/workflows/**.
* Each push to `main` triggers build, test, and deploy steps.
* GitOps ensures infrastructure and services are synced with repo state.
* All components (Admin App, Main App, Functions, ScyllaDB, MinIO, NATS) are deployed together using **Docker Compose**.
* Kubernetes migration will be considered for scaling in future phases.

---

## Security & Compliance

* Separate OIDC clients for Admin vs. Main App.
* Immutable audit logs for all admin actions.
* Infrastructure and code changes peer-reviewed via pull requests.

---

**Summary**: This monorepo hosts everything needed to run Tessaro at scale — apps, microservices, functions, shared libraries, and infrastructure — with a secure, GitHub-driven CI/CD pipeline. Tessaro leverages **Docker Compose deployments, microservices, event-driven architecture (NATS), ScyllaDB, and MinIO** to deliver scalable, reliable services.
# Tessaro
