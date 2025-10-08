# Repository Guidelines

## Project Structure & Module Organization
- `services/admin-app/app`: React admin UI served by Vite; feature folders live in `src/` (components, layouts, hooks) with styles in `index.scss`.
- `services/api-server`: Deno 2 service using a lightweight Hono clone; HTTP handlers live in `main.ts`/`users.ts`, shared helpers under `lib/`, and storage adapters under `storage/`.
- `services/storage-service/functions`: Node utilities for MinIO access, exported through `src/index.ts` for reuse by serverless workers.
- `shared/libs`: Cross-service TypeScript packages (`api-client`, `auth`) surfaced via barrel `index.ts` files to keep consumer imports stable.
- `docker-compose.yml` builds the UI, API, and admin TUI containers, wiring the API to local SQLite + Deno KV volumes.

## Build, Test, and Development Commands
- Admin app: install once with `npm install`; use `npm run dev` for Vite, `npm run build` for type-check + bundle, and `npm run preview` to validate the production output.
- API server: `deno task dev` watches the Deno server with `--allow-read/--allow-write`; run `deno task lint` and `deno task fmt` before committing, and `deno task test` for integration tests.
- Full stack: `docker compose up --build` provisions the UI/API stack and mounts `services/api-server/data` so SQLite (`admin.sqlite`) and Deno KV (`kv.sqlite`) persist.

## Coding Style & Naming Conventions
- Stick to TypeScript; use 2-space indentation and rely on auto-formatters (`deno fmt`, project Prettier).
- React components, contexts, and layouts use `PascalCase`; hooks start with `useX`; utility modules are `kebab-case.ts` and re-exported via barrels.
- API models mirror database columns (`snake_case`) but normalize responses to the shared `UserProfile` shape with ISO timestamps.

## Storage & Testing Guidelines
- Deno KV tracks lightweight metrics (`metrics/users/*`)—touch its helpers in `storage/kv.ts` when adding counters or metadata.
- Denodb + SQLite powers user management; schema lives in `storage/denodb.ts` with table migrations handled via `db.sync()`. Keep breaking schema changes behind explicit migration scripts.
- Write API tests alongside handlers as `.test.ts` files; when SQLite is required, point tests at `DENO_KV_PATH=:memory:` and `SQLITE_PATH=:memory:` to isolate state. Record manual QA steps (create/edit/delete user) in PR descriptions until Vitest/Deno tests cover flows.

## Commit & Pull Request Guidelines
- Follow recent history: short imperative subjects with optional `type:` prefix and linked tickets (e.g. `feat: add kv metrics (#123)`).
- PRs should explain storage impacts, environment variable additions (`SQLITE_PATH`, `DENO_KV_PATH`), and include screenshots for UI shifts.
- Request reviews from affected service owners (UI, API, shared libs) and reference updated docs when introducing new storage behaviors or conventions.
