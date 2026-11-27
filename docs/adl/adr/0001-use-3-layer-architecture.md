# ADR-0001: Use 3-Layer NestJS Architecture With Selective Decoupling

- **Status:** Superseded by [ADR-0004](0004-use-selective-hexagonal-architecture.md)
- **Date:** 2026-11-22

## Context

The original proposal called for HTTP endpoints (`POST /orders`, `GET /orders`, `POST /orders/:id/retry`, `/health`, etc.) and asynchronous events and commands over RabbitMQ (`evt.*`, `cmd.*`) alongside Redis and PostgreSQL. Over-applying strict hexagonal/clean architecture boundaries across every module can create unnecessary indirection for standard CRUD and orchestration flows. The [current architecture](../../design.md) describes the implemented services and routes.

## Decision

We will structure the application around the standard 3-layer NestJS pattern (transport/controllers/consumers, service/application logic, and Prisma data access) by default, while selectively decoupling specific areas where clear benefits exist.

## Rationale

- **Fits NestJS conventions:** Aligns naturally with modules, controllers, providers, and dependency injection expected in a NestJS codebase.
- **Targeted rigor:** Keeps complexity low on straightforward endpoints while isolating tricky external or asynchronous concerns.

## Alternatives considered

- **Strict Hexagonal Architecture Everywhere:** Enforces ports/adapters and pure domain models across every feature, which increases boilerplate for simple read/query paths and interview scope.

## Consequences

- **Easier:** Clear, familiar code navigation for reviewers and faster feature delivery across standard endpoints and workers.
- **More difficult:** Without strict boundaries everywhere, engineers must consciously keep business rules out of controllers and isolate side effects in designated services/adapters.
