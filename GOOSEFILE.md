# Goosefile for Tessaro Project

This Goosefile contains development workflows for the Tessaro monorepo, following GitOps principles with FluxCD.

## Project Structure
- apps/admin: Admin Interface (Vite)
- apps/main: Customer-facing Main App
- apps/functions: Serverless functions
- libs/: Shared libraries
- infra/k8s: Kubernetes manifests (FluxCD + Knative)

## GitOps Workflow
⚠️ IMPORTANT: Never run commands directly on the Kubernetes cluster.
ONLY update manifests in this repository and let FluxCD reconcile changes.
After making changes, push to a new branch and create a PR.

## Local Development Commands

### Admin App Development
Start the admin UI for rapid development:
`npm run admin:dev`

Override the default port (5173):
`PORT=5000 npm run admin:dev`

For API interactions during UI development, you can port-forward to Knative services:
`kubectl port-forward svc/users-api-get -n apps 8080:80`

Then set VITE_USERS_API_URL=http://localhost:8080 when starting the admin app.

### Main App Development
Start the main app for customer-facing UI development:
`npm run main:dev`

### Function Development
For rapid function testing, use Knative CLI or port-forwarding:
`kn service list` - List all Knative services
`kubectl port-forward svc/SERVICE_NAME -n apps PORT:80` - Port forward a service

## Testing Commands

Run the complete test suite:
`npm test`

Run tests with coverage report:
`npm test -- --coverage`

Run tests for a specific app or library:
`npm test -- --testPathPattern=apps/admin`
`npm test -- --testPathPattern=libs/ui`

## Build Commands

Build the admin app for production:
`npm run admin:build`

Preview the built admin app:
`npm run admin:preview`

Build the main app for production:
`npm run main:build`

Preview the built main app:
`npm run main:preview`

## Infrastructure Commands

After modifying infrastructure manifests, push changes to a new branch and create a PR.

Trigger Flux reconciliation manually:
`flux reconcile kustomization home`

Check Flux status:
`flux get kustomizations`

## Code Quality Commands

Run code formatting:
`npm run format`

Run linter:
`npm run lint`

## Commit Guidelines

Follow Conventional Commits:
- feat: New features
- fix: Bug fixes
- chore: Maintenance tasks
- docs: Documentation updates
- test: Test-related changes
- refactor: Code refactoring
- ci: CI/CD changes

Example: `feat: add user management page`

## Deployment Process

1. Make changes in a feature branch
2. Update manifests in infra/k8s as needed
3. Push changes and create a PR
4. CI/CD pipeline will run tests and build images
5. Merge to main triggers deployment via FluxCD
6. FluxCD reconciles cluster state with repository

## Security & Configuration

Never commit secrets - copy sample env files to .env variants:
`cp .env.sample .env`

Configuration is managed via Kubernetes ConfigMaps.
Ensure tessaro-config ConfigMap is deployed to your cluster for local development.
