# Repository Guidelines

> ⚠️ **IMPORTANT**: Apply infrastructure and application manifests directly with
> `kubectl`. Update the manifests in this repository, commit the change, and use
> `kubectl apply -k` against the appropriate kustomization. Once you've made
> changes, push to a new branch and create a PR.

## Project Structure & Module Organization
This monorepo separates deployable services, shared libraries, and platform
tooling. Keep feature logic in reusable libs and keep service folders thin.
- `services/admin-app/app` hosts the Vite-powered admin UI; pull components and
  helpers from `shared/libs`.
- `services/*/functions` contain serverless handlers grouped by domain (users,
  orgs, services, storage) with their contracts alongside.
- Kubernetes-ready manifests for each surface live beside the code in
  `services/*/deploy/k8s`.
- Cluster compositions live in `infra/k8s`; update those kustomizations when you
  need to roll changes across environments.

## Build, Test, and Development Commands
Move fast by leaning on package scripts:
- `npm run admin:dev` serves the admin UI at `http://localhost:5173` (override
  with `PORT=5000 npm run admin:dev`).
- `npm run admin:build` followed by `npm run admin:preview` validates production
  bundles in `services/admin-app/app/dist`.
- `npm test` runs the Jest suite across apps and libs; append `-- --coverage` for
  a report.
- After modifying infrastructure manifests, push your changes to a new branch and
  create a PR, then apply with `kubectl apply -k infra/k8s/clusters/<name>`.

## Coding Style & Naming Conventions
Two-space indentation, semicolons, and single quotes are standard. TypeScript
runs in strict mode—favor `.tsx` for React views and `.ts` for supporting logic.
Export interfaces for API contracts. Components use `PascalCase`,
hooks/utilities use `camelCase`, and shared constants stay `ALL_CAPS`. Run the
project formatter before committing.

## Testing Guidelines
Jest with Testing Library (`jest.setup.ts`) drives unit and integration tests.
Place specs under `**/tests/**/*.test.ts(x)` and keep behavior-focused
assertions. Maintain the 35% global coverage threshold defined in
`jest.config.cjs`; raise gaps before merging.

## Commit & Pull Request Guidelines
Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with concise scopes and
revert-friendly changes. Pull requests should include a summary, linked issues,
verification steps (tests, coverage, docker), and UI screenshots when relevant.
Squash noisy branches before merge, but keep history readable.

## Security & Configuration Tips
Never commit secrets—copy sample env files into ignored `.env` variants. Treat
`infra/k8s` as the deployment source of truth; update docs when services or ports
change.
