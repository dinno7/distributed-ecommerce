# ADR-0002: Use Prisma as data layer

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

The project is a time-boxed interview task built with NestJS, Prisma, and PostgreSQL, requiring multi-step database writes (such as creating orders, items, and outbox entries for events and commands) inside atomic transactions. Introducing full data-layer decoupling via generic repository interfaces and a custom Unit of Work (UoW) abstraction adds significant boilerplate and indirection without proportional value for a small scope.

## Decision

We will use Prisma directly for data persistence and Prisma's transaction support (`prisma.$transaction`) for atomic operations, rather than building abstract repository interfaces and a Unit of Work layer across the entire data layer.

## Rationale

- **Scope & speed:** Avoids mapping overhead and extra abstractions during a focused interview implementation.
- **Native transaction ergonomics:** Prisma transactions work cleanly with relational queries and outbox/idempotency writes in one place.
- **Low switching risk:** In a short-lived assessment app, replacing the ORM is not a realistic driver.

## Alternatives considered

- **Full Repository Pattern + Unit of Work:** Provides strict persistence abstraction and testability without a DB, but requires substantial boilerplate, entity-to-record mappers, and transaction context plumbing that slows delivery.

## Consequences

- **Easier:** Faster implementation, fewer files/interfaces to maintain, and straightforward transactional writes across related tables.
- **More difficult:** Swapping out Prisma later or unit-testing data-heavy services without a database requires mocking Prisma or using an integration test database.

## Related files

- [Transaction boundaries](../../design.md#transaction-boundaries)
