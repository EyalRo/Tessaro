# Tessaro API Server

## Quick Start

```bash
cd services/api-server
DENO_KV_PATH=./data/kv.sqlite SQLITE_PATH=./data/admin.sqlite deno task dev
```

## Useful Tasks

- `deno task start` – run the API once with the required permissions.
- `deno task dev` – watch mode for local development.
- `deno task fmt` / `deno task lint` – apply formatting and lint checks.
- `deno task test` – execute API tests (set `SQLITE_PATH=:memory:` for isolated
  runs).

## Environment

- `SQLITE_PATH` (default `./data/admin.sqlite`) controls the Denodb + SQLite
  database location.
- `DENO_KV_PATH` (default `./data/kv.sqlite`) stores Deno KV metrics.
- `PORT` defaults to `8000` when unset.
