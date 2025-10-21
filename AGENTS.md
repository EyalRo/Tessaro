# Repository Guidelines

## Project Structure & Module Organization
Tessaro runs on Bun with a TypeScript backend and Marko-powered admin UI. Server logic lives in `src/server`; `index.ts` wires Bun's HTTP server, while `router.ts` dispatches to REST handlers in `src/server/routes`. Shared helpers (sessions, rendering) sit in `src/server/lib`, and `database.ts` is a thin client over our Fission HTTP functions — every read/write travels through Fission into MongoDB. Client assets are served from `src/client`: `main-app.html` is the public landing page, Marko templates reside under `src/client/src/pages/admin`, and static files belong in `src/client/public`. Use `src/shared` for modules that must run in both server and upcoming client bundles.

## Build, Test, and Development Commands
Install dependencies with Bun: `bun install`. Start the API + admin console locally using `bun run src/server/index.ts`; add `--watch` during iteration (`bun --watch run src/server/index.ts`) to reload on save. Run the Marko compiler ad hoc with `bunx marko build`. Execute the test suite via `bun test`.

## Coding Style & Naming Conventions
Use TypeScript with two-space indentation, `const` by default, and explicit return types on exported functions. Prefer `camelCase` for functions/variables, `PascalCase` for Marko components, and `SCREAMING_SNAKE_CASE` for environment constants. Strings are double-quoted, and semicolons are required. Keep API handlers pure, returning `Response` objects through `Response.json`. For Marko templates, isolate heavy logic in `<script>` blocks and keep HTML sections declarative.

## Testing Guidelines
Add Bun tests beside the code they cover (for example, `src/server/routes/users.test.ts`). Use descriptive `describe` blocks per route or lib module and favor focused assertions over snapshot tests. Seed data through `initializeDatabase()`, which primes Mongo via the Fission APIs; during tests, stub `fetch` to imitate those Fission endpoints rather than touching a live cluster. Aim for coverage on error paths, especially validation branches in the `routes` directory.

## Commit & Pull Request Guidelines
Write commit subjects in the imperative mood (`Add admin logout flow`), keep them under ~72 characters, and optionally append issue references such as `(#95)`. Bundle related Bun server and Marko changes in the same commit when they ship a cohesive feature. Pull requests should include: a short summary of intent, testing notes (e.g., `bun test`, manual admin flow checks), and screenshots when UI templates change. Link to relevant issues or documentation updates before requesting review.

## Environment & Security Notes
Local secrets live in `.env`; never commit cloud or production credentials. Configure the Fission gateway URL via `FISSION_BASE_URL` (defaults to `http://fission.dino.home`) so the server can reach the Mongo-backed functions. The default admin bootstrap email is `admin@tessaro.local`—update or rotate it before deploying outside development. When adding new configuration flags, thread them through Bun's `Bun.env` and document expected values here.
