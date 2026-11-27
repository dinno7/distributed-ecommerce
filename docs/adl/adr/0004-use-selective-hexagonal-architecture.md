# ADR-0004: Use hexagonal architecture for order processing

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Orders, payments, and fulfillment coordinate state changes, concurrency rules, and reliable message delivery. Catalog CRUD and supporting modules have simpler responsibilities within the scope of this task.

## Decision

- Use hexagonal architecture in Orders, Payments, and Fulfillment. HTTP controllers and RabbitMQ consumers call application use cases. Use cases apply domain rules and persist state through repository ports implemented by Prisma-backed infrastructure adapters.
- Keep Product and Audit simple. Product's controller calls a Prisma-backed service. Audit's controller and consumer use a concrete Prisma repository.
- Keep Prisma clients, generated database types, and SQL in infrastructure for the hexagonal workflow modules.
- Use `TransactionManager.run` for explicit transactions. `PrismaTransactionManager` starts the transaction and exposes it as an opaque `TransactionCtx`. Participating modules access their tables through their own adapters. State changes and their module-owned outbox records commit or roll back together.
- Handle HTTP request idempotency at the transport boundary with `@nestjs/idempotency`. Opted-in routes share the PostgreSQL `idempotency_keys` table through `PrismaIdempotencyStore`. The interceptor stores the response after the use case commits.

## Consequences

Workflow tests can exercise domain rules and use cases through test implementations of repository and transaction ports. PostgreSQL integration tests cover row locking, concurrent writes, and rollback. Foreign keys enforce integrity across the schema. Modules collaborate through public operations and RabbitMQ contracts. Physical fulfillment passes its transaction context to Product's stock reservation operation so the stock update and shipment commit together.

## Related files

- [Module layout](../../design.md#module-layout)
- [Transaction boundaries](../../design.md#transaction-boundaries)
- [Module diagram](../../diagrams/class.md)
