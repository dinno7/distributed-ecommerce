# Summary

# Distributed Order Processing System

- [Introduction](./INDEX.md)
- [Task](./TASK.md)
- [Design](./design.md)
- [Contracts](./contracts.md)

# Diagrams

- [Module Diagram](diagrams/class.md)
- [Entity Relationship Diagram](diagrams/erd.md)
- [Creating Order](diagrams/create_order.md)
- [Payment, Fulfillment, and Retry](diagrams/fulfill_order.md)

# Decision

- [Architecture Decision Log](adl/INDEX.md)
  - [ADR template](adl/template.md)
  - [Use 3-Layer NestJS Architecture (superseded)](adl/adr/0001-use-3-layer-architecture.md)
  - [Use Prisma as Data Layer (superseded)](adl/adr/0002-use-prisma-as-data-layer.md)
  - [Use UUIDv7 for Workflow IDs](adl/adr/0003-use-in-app-uuidv7-id.md)
  - [Use Hexagonal Architecture for Order Processing](adl/adr/0004-use-selective-hexagonal-architecture.md)
  - [Initialize the database in the app container](adl/adr/0005-initialize-database-in-app-container.md)
  - [Use in-process ports between modules](adl/adr/0006-use-in-process-ports-between-modules.md)
