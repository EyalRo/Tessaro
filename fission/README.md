# Tessaro Fission Functions

This directory hosts the Fission specs and source files for Tessaro's serverless endpoints. **All Tessaro persistence flows through these functions** — the Bun server delegates every read/write to Fission, which in turn persists to MongoDB.

The currently deployed functions include:

- `/tessaro/users` – a Python handler that fronts the `users` collection in MongoDB and services the platform/user APIs.
- `/random-int` – the sample Marko console helper that returns a random integer (legacy demo; safe to remove when no longer needed).

## Environments and secrets

- **Fission router:** reachable at `http://fission.dino.home`.
- **Users function environment:** `tessaro-users-python` (`fission/python-env` runtime, `fission/python-builder` for packaging).
- **Random integer environment:** `random-int-python` (identical runtime/builder pairing).
- The `mongodb-auth` secret (keys: `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`) must exist; the function reads the credentials from the mounted secret and falls back to environment variables.

### Mongo connection overrides

| Variable | Default | Description |
| --- | --- | --- |
| `MONGO_HOSTS` | `mongo.dino.home` | Comma-separated host[:port] list used in the connection URI. |
| `MONGO_DATABASE` | `tessaro` | Database that stores Tessaro user documents. |
| `MONGO_USERS_COLLECTION` | `users` | Collection queried by the function. |
| `MONGO_AUTH_SOURCE` | `admin` | Database used for authentication. |
| `MONGO_OPTIONS` | _(unset)_ | Additional URI query parameters appended to the connection string. |

## Apply workflow

The functions are definition-only (no build step). To refresh the deployment after modifying any source under `fission/`, run:

```bash
fission spec validate
fission spec apply --wait
```

The apply step builds the Python packages (using `requirements.txt` when present) and reconciles the environments, packages, functions, and HTTP triggers declared in `fission/specs/`.

## Function sources

| Path | Purpose |
| --- | --- |
| `users/main.py` | Mongo-backed handler for `/tessaro/users` (list, count via `?summary=count`, read by ID/email, and the mutation routes consumed by the Bun server). |
| `users/vendor/` | Vendored copy of `pymongo` used by the users function. |
| `random-int/main.py` | Sample Python function for `/random-int`. |
| `specs/*.yaml` | Declarative definitions for Fission environments, packages, functions, and HTTP triggers. Extend these specs as additional Tessaro data domains move into Fission. |

## Notes for future work

- The Bun data layer (`src/server/database.ts`) now expects companion routes for organizations, services, metrics, sessions, and credentials. Mirror those contracts when adding new Fission functions so the server continues to operate exclusively through MongoDB.
- When iterating locally, stub `fetch` in tests instead of pointing at a live cluster. Keep the stub responses aligned with the production Fission contracts to avoid drift.
