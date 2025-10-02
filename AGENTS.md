# Repository Guidelines

> ⚠️ **IMPORTANT**: This repository uses GitOps with FluxCD for all infrastructure and application management.
> **NEVER** run commands directly on the Kubernetes cluster. **ONLY** update the manifests in this repository,
> commit the change, and let FluxCD reconcile it. Use the `./scripts/reconcile-flux.sh` helper (or the equivalent
> `flux reconcile kustomization ...` commands) to apply updates after modifying manifests. Once you've made
> changes, push to a new branch and create a PR.

## Project Structure & Module Organization
This monorepo separates UI shells, shared libraries, and platform tooling. Keep feature logic in reusable libs and keep app folders thin.
- `apps/admin` hosts the Vite-powered admin UI; pull components from `libs/ui` and data helpers from `libs/utils`.
- `apps/main` delivers the customer shell and reuses auth/API adapters from `libs/auth` and `libs/api-client`.
- `apps/functions` contains serverless handlers grouped by domain (auth, users, orgs, services, audit, storage, messaging) with their contracts alongside.
- Platform assets live in `infra/k8s` (Flux + Knative manifests), `tests/` (cross-app flows), `docs/`, and `scripts/` (automation and database seeding).

## Build, Test, and Development Commands
Move fast by leaning on package scripts:
- `npm run admin:dev` serves the admin UI at `http://localhost:5173` (override with `PORT=5000 npm run admin:dev`).
- `npm run admin:build` followed by `npm run admin:preview` validates production bundles in `apps/admin/dist`.
- `npm test` runs the Jest suite across apps and libs; append `-- --coverage` for a report.
- After modifying infrastructure manifests, push your changes to a new branch and create a PR. Let FluxCD reconcile the changes automatically.

## Coding Style & Naming Conventions
Two-space indentation, semicolons, and single quotes are standard. TypeScript runs in strict mode—favor `.tsx` for React views and `.ts` for supporting logic. Export interfaces for API contracts. Components use `PascalCase`, hooks/utilities use `camelCase`, and shared constants stay `ALL_CAPS`. Run the project formatter before committing.

## Testing Guidelines
Jest with Testing Library (`jest.setup.ts`) drives unit and integration tests. Place specs under `**/tests/**/*.test.ts(x)` and keep behavior-focused assertions. Maintain the 35% global coverage threshold defined in `jest.config.cjs`; raise gaps before merging.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with concise scopes and revert-friendly changes. Pull requests should include a summary, linked issues, verification steps (tests, coverage, docker), and UI screenshots when relevant. Squash noisy branches before merge, but keep history readable.

## Security & Configuration Tips
Never commit secrets—copy sample env files into ignored `.env` variants. Treat `infra/k8s` as the deployment source of truth; update docs when services or ports change. Run scripts in `scripts/` with GNU `bash` or WSL to avoid platform-specific quirks.
