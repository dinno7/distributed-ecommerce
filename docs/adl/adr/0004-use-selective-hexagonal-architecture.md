# ADR-0004: Use hexagonal architecture for order processing

- **Status:** Accepted
- **Date:** 2026-11-23

## Context

Orders, payments, and fulfillment coordinate state changes, concurrency rules, and reliable message delivery. Catalog CRUD and supporting modules have simpler responsibilities within the scope of this task.

## Decision

- Use hexagonal architecture in Orders, Payments, and Fulfillment. HTTP controllers and RabbitMQ consumers call application use cases. Use cases apply domain rules and persist state through repository ports implemented by Prisma-backed infrastructure adapters.
- Use a three-layer design for Product and other simple modules such as Audit and Health. Transport calls the application service, and the service delegates database work to a concrete data-access component. Product CRUD uses this structure without a repository interface or implementation.
- Keep Prisma clients, generated database types, and SQL in infrastructure. This boundary applies to application services, use cases, and domain code in both module styles.
- Use `TransactionManager.runTx` for explicit transaction boundaries. Application code passes the same opaque `TransactionCtx` to every participating repository or data-access operation. `PrismaTransactionManager` starts the database transaction, and infrastructure uses its transaction-scoped client for queries. State changes and their outbox records commit or roll back together.

## Consequences

Workflow tests can exercise domain rules and use cases through test implementations of repository and transaction ports. PostgreSQL integration tests cover adapter behavior such as row locking, concurrent writes, and rollback. Simple modules keep a direct controller, service, and data-access flow. Transactional callers must pass the context across module boundaries, including catalog reads and inventory reservations.

## Related files

- [Module layout](../../design.md#module-layout)
- [Transaction boundaries](../../design.md#transaction-boundaries)
- [Class diagram](../../diagrams/class.md)
