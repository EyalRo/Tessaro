# Tessaro Fission Functions

This directory hosts the Fission specs and source files for Tessaro's serverless endpoints. Two functions are currently deployed:

- `/tessaro/users` – a Python function that reads the `users` collection from MongoDB and exposes the list/read APIs consumed by the admin UI.
- `/random-int` – the sample Marko console helper that returns a random integer.

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
| `users/main.py` | Mongo-backed GET handler for `/tessaro/users` (list, count via `?summary=count`, and `/tessaro/users/:id`). Mutating routes currently return `503 Service Unavailable` until the write path is restored. |
| `users/vendor/` | Vendored copy of `pymongo` used by the users function. |
| `random-int/main.py` | Sample Python function for `/random-int`. |
| `specs/*.yaml` | Declarative definitions for Fission environments, packages, functions, and HTTP triggers. |

## Notes for future work

- `src/server/routes/users.ts` proxies only the list/read operations to Fission. Creation, update, and deletion remain disabled while the write flow is rebuilt.
- Once server-side writes are ready, extend the Python handler (or replace it with a Node function) to forward create/update/delete operations to MongoDB and remove the temporary `503` guards in the Bun routes.
