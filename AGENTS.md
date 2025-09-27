# Repository Guidelines

## Project Structure & Module Organization
- `apps/admin` contains the Vite admin UI; lean on `libs/ui` and `libs/utils` instead of duplicating patterns inside `src`.
- `apps/main` is the customer-facing shell and should reuse auth and API helpers from `libs/auth` and `libs/api-client`.
- `apps/functions` stores serverless handlers per domain (auth, users, orgs, services, audit, storage, messaging) with contracts collocated.
- Platform assets sit in `infra/docker` (compose stacks), `tests/` (cross-app flows), `docs/`, and `scripts/` (automation like `admin-docker.sh`).

## Build, Test, and Development Commands
- `npm run admin:dev` serves the admin UI on `http://localhost:5173`; override with `PORT=5000 npm run admin:dev`.
- `npm run admin:build` and `npm run admin:preview` validate production bundles in `apps/admin/dist`.
- `npm test` runs the Jest suite across apps and libs; add `-- --coverage` for reports.
- In `infra/docker`, `docker compose up` starts the full stack (apps, ScyllaDB, MinIO, NATS); use `docker compose down -v` to reset state.

## Coding Style & Naming Conventions
- TypeScript strict mode is enforced; export interfaces for APIs and prefer `.tsx` for React views, `.ts` for supporting logic.
- Follow the existing two-space indentation, semicolons, and single quotes; run project formatters before pushing.
- Components use `PascalCase`, hooks/utilities use `camelCase`, and reserve `ALL_CAPS` for shared constants.
- Shared helpers live in `libs/*`; app folders should only host entry points and adapters.

## Testing Guidelines
- Jest + Testing Library (`jest.setup.ts`) is standard; place specs under `**/tests/**/*.test.ts(x)`.
- Uphold the 35% global coverage floor defined in `jest.config.cjs`; review thresholds before proposing changes.
- Write behavior-focused tests and stub external services with local fakes when necessary.

## Commit & Pull Request Guidelines
- Continue the Conventional Commits style found in history (`feat:`, `fix:`, `chore:`) with concise scopes.
- Keep commits revert-friendly and squash noisy branches before merging.
- Pull requests should add a change summary, linked issues, verification notes (tests, coverage, docker), and UI screenshots when relevant.

## Environment & Infrastructure Tips
- Never commit secrets; copy sample env files into untracked `.env` files and coordinate shared configuration with infra.
- Treat `infra/docker` as the deployment source of truth and update docs when services or ports change.
- Run scripts in `scripts/` with GNU `bash` (or WSL) to avoid platform-specific differences.
