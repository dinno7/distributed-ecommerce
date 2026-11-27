# Entity relationship diagram

## MVP model

This diagram uses PostgreSQL table and column names from the Prisma schema and migrations. Lines show database foreign keys. The ownership table also lists the records whose relationships are carried in message payloads or snapshots.

```mermaid
erDiagram
    products ||--o| inventories : has
    orders ||--o{ order_items : contains
    orders ||--o{ payment : has
    orders ||--o{ orders_outbox : stages
    order_items ||--o{ fulfillment_attempts : claims
    order_items ||--o| digital_grants : grants
    order_items ||--o| shipments : ships

    products {
        uuid id PK
        text name
        ProductType type
        bigint unit_price_minor
        int subscription_days "nullable"
        jsonb digital_metadata "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    inventories {
        uuid product_id PK, FK
        int available
        timestamptz updated_at
    }
    orders {
        uuid id PK
        uuid user_id "customerId in the API"
        OrderStatus status
        int payment_attempt_no
        bigint total_minor
        char currency
        timestamptz created_at
        timestamptz updated_at
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id "catalog ID kept in the snapshot"
        ProductType product_type
        int subscription_days "nullable"
        int quantity
        bigint unit_price_minor
        OrderItemStatus status
        int attempts
        text claimed_by "legacy field"
        timestamptz lease_expires_at "legacy field"
        text last_error "nullable"
        timestamptz created_at
        timestamptz updated_at
    }
    payment {
        uuid id PK
        uuid order_id FK
        int attempt
        bigint amount_minor
        PaymentStatus status
        PaymentFailureCode failure_code "nullable"
        text gateway_name
        text checkout_url "nullable"
    }
    fulfillment_attempts {
        uuid order_item_id PK, FK
        int attempt_no PK
        text error_code "nullable"
    }
    digital_grants {
        uuid order_item_id PK, FK
        uuid customer_id
        uuid product_id
        int quantity
        timestamptz created_at
    }
    subscriptions {
        uuid customer_id PK
        uuid product_id PK
        timestamptz expires_at
    }
    shipments {
        uuid id PK
        uuid order_item_id FK, UK
        int quantity
        timestamptz created_at
    }
    orders_outbox {
        uuid id PK
        uuid order_id FK
        text exchange_name
        text routing_key
        jsonb payload
        OutboxStatus status
        int attempts
        timestamptz next_attempt_at
        timestamptz created_at
        timestamptz published_at
    }
    payment_outbox {
        uuid id PK
        text exchange_name
        text routing_key
        jsonb payload
        timestamptz next_attempt_at
        timestamptz created_at
    }
    fulfillment_outbox {
        uuid id PK
        text exchange_name
        text routing_key
        jsonb payload
        timestamptz next_attempt_at
        timestamptz created_at
    }
    idempotency_keys {
        text key_hash PK
        text key
        text fingerprint
        text owner "nullable"
        json response "nullable"
        bigint expires_at "epoch milliseconds"
    }
    audit_logs {
        text id PK
        text exchange
        text routingKey
        text messageId UK "nullable AMQP message ID"
        text correlationId "nullable"
        jsonb payload
        jsonb headers "nullable"
        timestamp publishedAt "nullable"
        timestamp createdAt
    }
```

| Owner | Tables |
| --- | --- |
| Product | `products`, `inventories` |
| Orders | `orders`, `order_items`, `orders_outbox` |
| Payment | `payment`, `payment_outbox` |
| Fulfillment | `fulfillment_attempts`, `digital_grants`, `subscriptions`, `shipments`, `fulfillment_outbox` |
| Audit | `audit_logs` |
| HTTP idempotency | `idempotency_keys` |

The caller supplies a customer UUID. Each order item snapshots the product type, unit price, and subscription duration. Product IDs on order items, digital grants, and subscriptions are logical references. Deleting a product cascades to inventory. Existing orders retain their snapshots. Money is represented as nonnegative `BIGINT` minor units and serialized as decimal strings. IRR is stored on orders and supplied by the payment and product money model.

## Constraints and indexes

| Area | Rule and purpose |
| --- | --- |
| Inventory | The product ID is the inventory primary key. A database check enforces `available >= 0`. Product's conditional update reserves stock in the shipment transaction. |
| Order items | API validation requires distinct products and quantities of 1–100. A database check requires a positive subscription-day snapshot when present. Indexes on `order_id` and `product_id` support lookups. Current fulfillment claims use `fulfillment_attempts`. The item lease columns and their index remain in the schema. |
| Payment | The unique `(order_id, attempt)` key identifies each attempt and supports querying the latest one. A partial unique index on `order_id` for `AWAITING_CUSTOMER` and `SUCCEEDED` permits one active or successful attempt. Database checks require a positive attempt, a nonnegative amount, and a failure code exactly when the status is `FAILED`. |
| Fulfillment | The `(order_item_id, attempt_no)` primary key deduplicates commands and attempt numbers must be positive. Grants and shipments are unique per order item and check for positive quantities. The subscription key `(customer_id, product_id)` supports atomic expiry extensions. |
| Outboxes | Orders indexes status and next attempt time, as well as order ID, and keeps published rows. Payment and Fulfillment index `(next_attempt_at, id)` and delete confirmed rows. An outbox row ID becomes the AMQP message ID. |
| HTTP idempotency | The `key_hash` primary key selects one active request per key. The expiry index supports cleanup, and an expired row can be reused on the next request with the same key. |
| Audit | The unique optional `messageId` deduplicates identified deliveries. Indexes cover exchange and routing key, correlation ID, and ingestion time. Order, payment, and item IDs are in the payload. |
| Order listing | Indexes cover `(created_at DESC, id DESC)`, `(status, created_at DESC, id DESC)`, `status`, and `(user_id, created_at DESC)`. |

[Order and item states](../design.md#states) · [Transaction boundaries](../design.md#transaction-boundaries) · [RabbitMQ event fields](../contracts.md#events)
