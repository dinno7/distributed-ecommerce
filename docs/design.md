# System design

One NestJS codebase runs the HTTP API, module-owned PostgreSQL outbox relays, and RabbitMQ consumers. The payment worker and the digital, subscription, and physical processors have distinct responsibilities and queues. Worker replicas can consume each queue independently. See the [module diagram](diagrams/class.md) and [data model](diagrams/erd.md).

The demo seeds the product catalog, accepts a caller-supplied customer UUID, and assumes trusted callers. Payment, access grants, subscription extensions, and shipment creation are simulated locally. Completed effects and the successful payment are retained on partial failure. Cancellation, refunds, and stock release are outside the lifecycle.

## Module layout

`AppModule` wires the feature and infrastructure modules together.

| Module | Folder | Structure | Owns |
| --- | --- | --- | --- |
| `ProductModule` | `src/modules/product` | Three layers | Catalog creation, listing, lookup, and deletion, plus product snapshots, inventory, and stock reservation. |
| `OrderModule` | `src/modules/order` | Hexagonal | Orders, items, fulfillment retries, and the `orders_outbox` relay. |
| `PaymentModule` | `src/modules/payment` | Hexagonal | Initial and retry checkouts, the mock gateway callback, payment attempts, and the `payment_outbox` relay. |
| `FulfillmentModule` | `src/modules/fulfillment` | Hexagonal | Digital grants, subscriptions, shipments, attempt claims, and `fulfillment_outbox`. |
| `AuditModule` | `src/modules/audit` | Three layers | Consumes `q.audit` and owns the `audit_logs` message history. |
| `AppController` | `src/app.controller.ts` | HTTP | Version-neutral `GET /api/ping`. |
| `PersistenceModule` | `src/common/infra/persistence` | Infrastructure | PostgreSQL connection via `PrismaService` and the `TransactionManager` binding to `PrismaTransactionManager`. |
| `IdempotencyModule` | `@nestjs/idempotency` | HTTP infrastructure | The Nest interceptor uses the local `PrismaIdempotencyStore` in `src/common/idempotency` for order creation and fulfillment retries. |
| `MessagingModule` | `src/common/messaging` | Infrastructure | RabbitMQ connection, queue setup, consumer registration, and confirmed publishing. |

In the hexagonal modules, controllers and consumers call use cases, which apply domain rules and depend on ports for persistence. Prisma adapters implement those ports. Product's controller calls `ProductService`, which uses Prisma directly for catalog and inventory operations. Audit's controller and consumer use a concrete Prisma repository.

Each module owns its writes. PostgreSQL foreign keys link order items, payment attempts, grants, shipments, and inventory where shown in the [data model](diagrams/erd.md). Orders, Payments, and Fulfillment exchange commands and events through RabbitMQ. Orders gets catalog snapshots through Product's public query. Fulfillment calls Product's public reservation operation for physical items. HTTP responses combine results from module queries. [Module diagram](diagrams/class.md) · [Architecture decision](adl/adr/0004-use-selective-hexagonal-architecture.md)

## States

| Trigger | Order state after commit | Payment or item changes |
| --- | --- | --- |
| Create order | `PENDING_PAYMENT` | Items start as `PENDING` at attempt 0. Checkout setup is pending. |
| Checkout ready | `PENDING_PAYMENT` | Payment is `AWAITING_CUSTOMER` with a checkout URL. |
| Gateway callback settles payment | Unchanged until delivery | Payment becomes `SUCCEEDED` or `FAILED`. |
| Orders handles `PaymentFailed` | `PAYMENT_FAILED` | Items become `SKIPPED`. |
| Orders handles `PaymentStarted` for a newer attempt | `PENDING_PAYMENT` | Items return to `PENDING` at fulfillment attempt 0. |
| Orders handles `PaymentSucceeded` | `FULFILLING` | Items become `QUEUED` at attempt 1. |
| Orders records an outcome while another item is queued | `FULFILLING` | The item becomes `SUCCEEDED` or `FAILED`. |
| Orders records the last outcome and all items succeeded | `COMPLETED` | All items are `SUCCEEDED`. |
| Orders records the last outcome and at least one item failed | `FULFILLMENT_FAILED` | Keep the successful payment and effects. |
| An eligible retry is accepted | `FULFILLING` | Selected items become `QUEUED` at their next attempt. |

`QUEUED` lasts until Orders applies the matching outcome. Fulfillment claims work with a unique attempt row in its effect transaction. A crash before commit rolls back the claim and the effect, so the message can be retried.

## Audit history

Audit consumes `q.audit` independently and appends copies of commands and events to `audit_logs`. Order, item, and payment IDs stay in the message payloads. [Task requirement](TASK.md#6-event-history)

Audit deduplicates deliveries that have an AMQP message ID and acknowledges after the insert. `GET /api/v1/audit` returns stored records. `GET /api/v1/audit/stream` emits newly inserted records through an in-process stream on the app instance that handled the insert. [Audit response format](contracts.md#order-history)

## Transaction boundaries

Use cases open explicit transactions through `TransactionManager.run`. `PrismaTransactionManager` exposes the transaction as an opaque `TransactionCtx`. Physical fulfillment passes that context to Product's reservation operation so the stock update, shipment, and Fulfillment outbox commit together. ProductService executes the inventory update within that transaction. Infrastructure uses parameterized SQL for row locks and atomic updates.

When the callback resolves, the manager commits before returning its result. A thrown error rolls back the transaction. Send a successful HTTP response or acknowledge a processed RabbitMQ delivery only after commit.

The transaction manager uses the database's default isolation level, normally PostgreSQL `READ COMMITTED`. Orders locks the order row before changing existing items. Payment locks its attempt rows. Fulfillment uses a unique claim and atomic effect writes. Each workflow commits related state changes and outbox writes together.

### Create an order idempotently

`POST /api/v1/orders` and `POST /api/v1/orders/:id/retry` require an `Idempotency-Key` through `@Idempotent({ required: true })`. The Nest HTTP interceptor fingerprints the method, URL, and JSON body. It claims the key in the shared `idempotency_keys` table through `PrismaIdempotencyStore` before calling the handler. The trusted-caller demo uses `scope: false`, so callers share a key namespace. A completed match replays the stored response with `Idempotent-Replayed: true`. A matching request already in progress returns `409 IDEMPOTENCY_KEY_IN_USE`. A different request using an active key returns `422 IDEMPOTENCY_KEY_REUSED`.

An atomic insert or takeover of an expired key claims the request. The interceptor renews the 60-second lock while the handler runs, subject to its maximum lock hold.

```text
claim key in idempotency_keys using key_hash and the request fingerprint
if a matching response exists: replay it
run(tx =>
    read products and check current stock
    calculate totals and insert the order and its item snapshots
    stage OrderCreated in orders_outbox
)
store the replay response against the key owner
```

The replay response expires after 24 hours by default. The response write follows the business transaction. If the process stops between the order commit and that write, a retry can create another order once the lock expires. [Create-order sequence](diagrams/create_order.md)

### Process payment

**Prepare checkout.** `q.payment.process` consumes `evt.order.created` with the order ID and total. The consumer inserts attempt 1 as `AWAITING_CUSTOMER` with a null checkout URL, or reuses the row for the same `(order_id, attempt)`. After that transaction, it asks the mock gateway for a URL. A second transaction locks the attempt, sets the URL if still needed, and stages `PaymentStarted` in `payment_outbox`. Acknowledge after preparation finishes. The client polls `GET /api/v1/payments?orderId=<uuid>` for the checkout state. [Payment API](contracts.md#checkout-and-callback)

**Settle payment.** Lock the attempt named by the callback. If it is `AWAITING_CUSTOMER` with a checkout URL, store the outcome and any failure code and stage `PaymentSucceeded` or `PaymentFailed` in `payment_outbox`. Return after commit. An identical callback returns the stored result. A conflicting callback returns `409 PAYMENT_ALREADY_FINAL`.

**Retry a failed payment.** Payments locks the attempt named by the request and checks that it failed. It uses the order ID stored on the attempt to find its successor. Reuse attempt `n + 1` if it exists or insert it with the same amount and a new ID. After that transaction commits, run the shared checkout preparation step and return the successor ID. A retry can resume preparation for an existing successor. The row lock and unique attempt key make concurrent retries converge on the same successor. [Retry API](contracts.md#retry-payment)

**Apply payment events.** `q.orders.payment` consumes `PaymentStarted`, `PaymentSucceeded`, and `PaymentFailed`. Lock the order and process events only in `PENDING_PAYMENT` or `PAYMENT_FAILED`. Ignore older attempts. For the recorded attempt, apply an outcome only while `PENDING_PAYMENT`. For a newer attempt, record its number and apply whichever event arrives first. A late `PaymentStarted` for the recorded attempt leaves its outcome intact.

On start, set the order and items to `PENDING_PAYMENT` and `PENDING`. On success, verify the event amount and currency against the order, set `FULFILLING`, queue the items at fulfillment attempt 1, and stage their commands in `orders_outbox`. On failure, set `PAYMENT_FAILED`, skip the items, and stage `OrderFailed` in `orders_outbox`. Commit the attempt number, state changes, and outbox rows before acknowledging. [Checkout sequence](diagrams/fulfill_order.md#checkout-and-payment)

### Claim and finish an item safely

Orders sends the item snapshot with each command. Fulfillment claims the attempt and records the outcome in one transaction. For physical items it also calls Product to reserve stock in that transaction.

```text
run(tx =>
    insert fulfillment_attempts(order_item_id, attempt_no) ON CONFLICT DO NOTHING
    if the claim already exists: return
    stage the processor's started event in fulfillment_outbox
    apply the effect using the command snapshot
    record any error code on the attempt
    stage the processor's outcome and any shipment event
)
acknowledge the RabbitMQ delivery after commit
```

Concurrent deliveries of the same attempt contend on the unique key. A committed claim means its outcome is in the outbox or already published. Orders issues a higher attempt only after applying the predecessor's failed outcome. Redelivery of the predecessor finds its committed claim.

- **Digital.** Insert an access grant for the customer and product, keyed by the order item ID.
- **Subscription.** Upsert the row keyed by customer and product. On conflict, extend the expiry atomically from the later of the current expiry and the database clock. Use the duration snapshot times the item quantity. The item claim prevents a duplicate delivery from extending it twice, and the upsert handles concurrent extensions from separate orders. A missing snapshot or a duration that would exceed the supported expiry is recorded as a failure.
- **Physical.** Fulfillment calls Product's `reserveStock(productId, quantity, tx)` operation. Product runs the conditional update below and reports whether stock was reserved. Fulfillment creates the shipment and stages `ShipmentCreated` in that transaction. If the update affects zero rows, an inventory lookup distinguishes `OUT_OF_STOCK` from `INVENTORY_UNAVAILABLE`. Order creation checks current stock without reserving it, so several orders can pass the check before any one of them reserves the last units.

```sql
UPDATE inventories
SET available = available - :quantity, updated_at = now()
WHERE product_id = :product_id
  AND available >= :quantity;
```

### Apply the fulfillment outcome to the order

Orders consumes success and failure events for all three product types and applies each outcome in its own transaction.

```text
run(tx =>
    lock order FOR UPDATE
    if order is not FULFILLING: return
    if no QUEUED item matches the item ID, attempt, and product type: return
    write the item's outcome and failure code
    if any item is QUEUED: keep FULFILLING
    else if any item is FAILED: set FULFILLMENT_FAILED and stage OrderFailed in orders_outbox
    else if all items are SUCCEEDED: set COMPLETED and stage OrderCompleted in orders_outbox
)
acknowledge the RabbitMQ delivery after commit
```

The order lock serializes outcomes for the same order so the last-item check sees earlier commits. A duplicate result or a result for an older attempt cannot change the item.

### Retry a failed item or order

Under the order lock, require `FULFILLMENT_FAILED` and select the requested failed item or all eligible failed items. Only failed items with `OUT_OF_STOCK` and an incrementable attempt count are eligible. The retry runs another conditional reservation. An operator can replenish the existing inventory row in PostgreSQL before retrying. Set those items to `QUEUED`, increment attempts, clear failure codes, and move the order to `FULFILLING`. Stage `evt.order.retry_scheduled` and commands with the same item snapshots in `orders_outbox`. A concurrent retry with a different key gets a conflict while the order is fulfilling. [Retry API](contracts.md#retry-fulfillment) · [Fulfillment sequence](diagrams/fulfill_order.md)

## Delivery and recovery

- **Relay.** Each module polls every 500 ms and claims up to 25 due rows with `FOR UPDATE SKIP LOCKED`. The claim commits before publishing and moves `next_attempt_at` forward 30 seconds. The relay publishes persistent, mandatory messages with a five-second confirm timeout. After a confirm with no return, Orders marks its row `PUBLISHED`. Payment and Fulfillment delete their rows. On failure, the relay schedules a retry in three seconds. A crash between publish and marking or deleting the row can replay the same message ID. [Relay sequence](diagrams/create_order.md#relay-outbox-messages)
- **Workflow consumers.** RabbitMQ prefetch is 10. A successful handler acknowledges after commit, including duplicate or stale work that requires no write. Transient exceptions trigger delayed redelivery with a configured range of 5–60 seconds and a delivery limit of 3. Invalid messages are rejected for dead-lettering immediately. Business failures such as `OUT_OF_STOCK` are committed as outcomes and acknowledged. [RabbitMQ quorum queues](https://www.rabbitmq.com/docs/quorum-queues)
- **Dead letters.** Workflow queues route dead letters to `x.dlx` and their individual `.dlq` queues. The checkout queue `q.payment.process` omits `reject-publish` for compatibility with its existing declaration. With default overflow it falls back to at-most-once dead lettering. The audit consumer requeues on handler errors. [RabbitMQ dead-letter requirements](https://www.rabbitmq.com/docs/quorum-queues#at-least-once-dead-lettering)
- **Outages.** Startup waits for RabbitMQ initialization. During a broker outage after startup, the relays retain pending outbox work and can retry publishing when the broker returns. Database errors fail affected requests or deliveries. `GET /api/ping` only checks whether the HTTP process responds.

## Deployment and scope

Compose runs the app on port 7000 alongside PostgreSQL and RabbitMQ, with the published ports bound to localhost. It starts the app after both dependency health checks pass. The image starts by applying migrations and seeding the demo catalog. [Container startup decision](adl/adr/0005-initialize-database-in-app-container.md)

The [original task](TASK.md) also asks for Redis caching, distributed locks, rate limiting, and health checks. The current app uses direct PostgreSQL reads for the catalog and database-backed claims and row locks for concurrency. Redis, HTTP rate limiting, and an application readiness endpoint are unimplemented.
