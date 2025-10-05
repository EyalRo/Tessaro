# Tessaro Monorepo

This repository contains the Tessaro admin experience along with supporting APIs and shared libraries. It is now designed to run entirely with Docker Compose so you can bring the full stack up with a single command—no Kubernetes required.

## Stack Overview

| Service | Description | Port |
| --- | --- | --- |
| `admin-app` | Vite-powered React admin UI served in production preview mode. | `4173` |
| `api-server` | Express API that serves user, organization, and service catalog endpoints backed by RavenDB. | `8080` |
| `admin-tui` | Charm-based terminal UI for managing users via the API server. | `-` |
| `ravendb` | RavenDB server used by the APIs. Studio is available on the exposed port. | `8085` |

Shared TypeScript packages live in the `shared/` directory and provide database clients, configuration helpers, and testing utilities that are consumed by the services.

## Prerequisites

* Docker Engine 24+
* Docker Compose v2 (`docker compose` CLI)

No other local dependencies are required.

## Running the Stack

1. Clone the repository and open a terminal in the project root.
2. Build and start every service:

   ```bash
   docker compose up --build
   ```

The first run will download container images and install Node.js dependencies for each service.

3. Once the stack is ready:
   * Admin UI: http://localhost:4173
   * API Server: http://localhost:8080 (health check at `/health`)
   * RavenDB Studio: http://localhost:8085
   * Admin TUI: `docker compose run --rm admin-tui`

4. To stop the stack, press `Ctrl+C` and run:

   ```bash
   docker compose down
   ```

### Environment Configuration

The default configuration works out of the box. If you need to adjust connection details, update the environment variables inside [`docker-compose.yml`](./docker-compose.yml). Common options include:

* `RAVEN_URLS` — override the database URL list for the APIs.
* `RAVEN_DATABASE` — change the database name used for storing documents.
* `VITE_USERS_API_URL` — change the admin app's API base URL.

APIs are configured to allow requests from any origin by default.

### Test & CI Status

Automated test suites and CI/CD pipelines have been removed from this repository. Local workflows now focus solely on building and running the services.

## Repository Structure

```
services/
  admin-app/          # React admin interface
  api-server/         # Express API for user, organization, and service catalog data
shared/               # Shared TypeScript libraries
infra/docker/         # Infrastructure assets for Docker Compose (schema, etc.)
```

Each API has an accompanying Dockerfile and can be extended with additional routes. Compose currently wires up the admin UI and consolidated API server; additional services can be added by following the same pattern.

## Extending the Environment

* Add new databases or services by defining them in `docker-compose.yml`.
* Seed databases using additional init containers or volumes in `infra/docker/`.
* Update shared libraries under `shared/` to expose cross-service utilities.

Feel free to tailor the Compose file to match your deployment or development needs.
