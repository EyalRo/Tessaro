# Admin TUI

The Tessaro Admin TUI is a terminal user interface for managing user accounts via the API server. It is built with the [Charm](https://charm.land/) ecosystem (Bubble Tea, Bubbles, and Lip Gloss).

## Features

- Browse users provided by the API server
- Create new users from an inline form
- Delete existing users with confirmation prompts
- Keyboard driven navigation with realtime feedback

## Running locally

```bash
go run ./cmd/admin-tui
```

The application reads the API base URL from the `USERS_API_URL` environment variable. When unset it falls back to `USERS_API_BASE_URL` and finally to `http://localhost:8080`. If the configured URL points at `http://api-server:8080` (the in-cluster DNS name used by Docker Compose) the client will automatically retry against `http://localhost:8080`, which is where the Compose-hosted API server is exposed.

## Docker

A Dockerfile is provided so the TUI can be run alongside the rest of the stack:

```bash
docker compose run --rm admin-tui
```

The Compose service is configured to point at the in-cluster API server (`http://api-server:8080`).

When running under Docker make sure to allocate an interactive terminal (Compose does this automatically when run with `run`).
