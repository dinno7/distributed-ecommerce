# ADR-0005: Initialize the database in the app container

- **Status:** Accepted
- **Date:** 2026-11-27

## Context

The interview reviewer needs to start the app against a fresh database and exercise the API with demo data. NestJS starts outbox relays that query PostgreSQL during startup, so the schema must be ready before the app launches.

## Decision

Build one application image with Prisma, the migration files, the seed script, and the generated documentation. Compose starts the app after PostgreSQL and RabbitMQ are healthy. The app container runs `prisma migrate deploy`, then `prisma db seed`, then starts NestJS. Start the published image with `docker compose up -d`. To run the current checkout, build the tag Compose uses and start the app with pulls disabled.

```sh
docker build -t ghcr.io/dinno7/distributed-ecommerce:latest .
docker compose up -d --wait postgres rabbitmq
docker compose up -d --pull never app
```

## Alternatives considered

A separate migration service could run database setup independently. Running setup in the app container keeps the interview deployment to one application service.

## Consequences

The app waits for migrations and seeding to succeed before accepting requests. On restart, Prisma skips applied migrations and the seed script inserts missing demo rows while preserving edits to existing products and stock. The image includes the database tooling, and the database user needs permission to apply schema changes. This startup sequence assumes a single app instance for the interview deployment.

## Related files

The startup command is in `Dockerfile`, the service dependencies are in `compose.yml`, and the seed data is in `prisma/seed.ts`.
