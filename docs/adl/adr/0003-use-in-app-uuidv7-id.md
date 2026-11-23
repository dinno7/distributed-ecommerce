# ADR-0003: Use in app UUID V7 id for Primary Entity IDs

- **Status:** Accepted
- **Date:** 2026-11-22

## Context

Prisma's `@default(uuid())` generates UUID v4 (random), which causes random B-tree page insertions and index fragmentation on PostgreSQL tables with frequent writes (such as `orders`, `order_items`, `shipments`, and `outbox_messages`). Meanwhile, exposing auto-incrementing `bigint` IDs externally can leak row counts or sequence patterns, while `cuid()` / `cuid(2)` adds string width and lacks strict sequential B-tree locality.

## Decision

We will generate UUID v7 identifiers in the application/service layer and store them in native PostgreSQL `uuid` columns (`@db.Uuid` without `@default(uuid())`), while keeping `bigint` (`@default(autoincrement())`) for strictly sequential internal audit/event logs (`order_events.id`).

## Rationale

- **B-tree index locality:** UUID v7 includes a millisecond timestamp prefix, reducing page splits and improving index cache locality compared to UUID v4 or CUID2.
- **Native DB types & standards:** `@db.Uuid` uses PostgreSQL's native 128-bit `uuid` type (smaller and cleaner than string-based CUIDs) with standard RFC 9562 UUID tooling.
- **Simple, explicit control:** Generating IDs in application code avoids ORM/DB version quirks and lets services pass IDs cleanly into transactions, events, and outbox payloads.

## Alternatives considered

- **Prisma `@default(uuid())` (UUID v4):** Rejected due to random B-tree insertion patterns and weaker index locality under write load.
- **`cuid()` / `cuid(2)`:** Rejected because it stores as a wider string type and CUID2 is not designed for sequential sortability, offering no advantage here over UUID v7.
- **`bigint` autoincrement everywhere:** Rejected for external/primary entity IDs to avoid exposing sequential record counts; retained only for internal append-only `order_events.id`.

## Consequences

- **Easier:** Better B-tree insert locality for UUID primary keys and deterministic/explicit IDs during transactional order and outbox creation.
- **More difficult:** Callers/services must remember to supply a valid UUID v7 when creating records rather than relying on an automatic Prisma default.
