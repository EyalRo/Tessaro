# Tessaro Fission Functions

This directory hosts the Fission specs and source files for Tessaro's serverless endpoints. Two functions are currently deployed:

- `/tessaro/users` – a Python function that serves a static roster used by the admin UI while the MongoDB-backed implementation is rebuilt.
- `/random-int` – the sample Marko console helper that returns a random integer.

## Environments and secrets

- **Fission router:** reachable at `http://fission.dino.home`.
- **Users function environment:** `tessaro-users-python` (`fission/python-env` runtime, `fission/python-builder` for packaging).
- **Random integer environment:** `random-int-python` (identical runtime/builder pairing).
- The legacy `mongodb-auth` secret is still referenced by the specs so existing deployments retain permission to mount it, although the static users handler does not currently consume it. Remove the secret reference once the durable datastore flow is restored.

## Apply workflow

The functions are definition-only (no build step). To refresh the deployment after editing any source under `fission/`, run:

```bash
fission spec validate
fission spec apply --wait
```

The apply step will create/update the environments, packages, functions, and HTTP triggers declared in `fission/specs/`.

## Function sources

| Path | Purpose |
| --- | --- |
| `users/main.py` | Static GET handler for `/tessaro/users`. Returns two placeholder users and supports lookups by `/tessaro/users/:id`. Mutating routes currently respond `503 Service Unavailable`. |
| `random-int/main.py` | Sample Python function for `/random-int`. |
| `specs/*.yaml` | Declarative definitions for all Fission environments, packages, functions, and HTTP triggers. |

## Notes for future work

- `src/server/routes/users.ts` now proxies only the list/read operations to Fission. Creation, update, and deletion are temporarily disabled while the Mongo persistence layer is redesigned.
- When the durable backend is ready, replace the static payload in `users/main.py`, drop the hardcoded protection in the Bun routes, and reintroduce integration tests for the mutation paths.
