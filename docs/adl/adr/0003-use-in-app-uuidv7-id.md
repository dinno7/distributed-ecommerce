# ADR-0003: Use UUIDv7 for workflow IDs

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Prisma's `@default(uuid())` generates UUID v4 (random), which causes random B-tree page insertions and index fragmentation on PostgreSQL tables with frequent writes (such as `orders`, `order_items`, `shipments`, and outbox tables). Meanwhile, exposing auto-incrementing `bigint` IDs externally can leak row counts or sequence patterns, while `cuid()` / `cuid(2)` adds string width and lacks strict sequential B-tree locality.

## Decision

Generate UUIDv7 in application code for orders, order items, payment attempts, shipments, and outbox messages. Store them in native PostgreSQL `uuid` columns. Catalog product creation uses UUIDv4, and the seed uses fixed IDs. The audit consumer generates UUIDv4 for `audit_logs.id`, which is stored as text.

## Rationale

- **B-tree index locality:** UUID v7 includes a millisecond timestamp prefix, reducing page splits and improving index cache locality compared to UUID v4 or CUID2.
- **Native DB types & standards:** `@db.Uuid` uses PostgreSQL's native 128-bit `uuid` type (smaller and cleaner than string-based CUIDs) with standard RFC 9562 UUID tooling.
- **Simple, explicit control:** Generating IDs in application code avoids ORM/DB version quirks and lets services pass IDs cleanly into transactions, events, and outbox payloads.

## Alternatives considered

- **Prisma `@default(uuid())` (UUID v4):** Rejected due to random B-tree insertion patterns and weaker index locality under write load.
- **`cuid()` / `cuid(2)`:** Rejected because it stores as a wider string type and CUID2 is not designed for sequential sortability, offering no advantage here over UUID v7.
- **`bigint` autoincrement everywhere:** Rejected for primary entity IDs to avoid exposing sequential record counts.

## Consequences

- **Easier:** Better B-tree insert locality for UUID primary keys and deterministic/explicit IDs during transactional order and outbox creation.
- **More difficult:** Workflow code supplies each new UUIDv7 explicitly when creating a record.
