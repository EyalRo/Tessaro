# syntax=docker/dockerfile:1.4

FROM golang:1.21 AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /admin-tui ./cmd/admin-tui

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /admin-tui /usr/local/bin/admin-tui

ENV USERS_API_URL="http://api-server:8080"

ENTRYPOINT ["/usr/local/bin/admin-tui"]
