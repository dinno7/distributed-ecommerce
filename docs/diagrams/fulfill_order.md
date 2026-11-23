# Payment, fulfillment, and retry

Each database transaction shown below runs through `TransactionManager.runTx`. Repository adapters and Products data access use the same transaction context for all operations within that boundary.

## Checkout and payment

```mermaid
sequenceDiagram
    actor Client
    participant Orders as Orders API and consumer
    participant DB as PostgreSQL
    participant Relay as Outbox relay
    participant MQ as x.topic
    participant Pay as Payments worker and mock gateway
    participant Audit as q.audit

    Relay->>MQ: evt.order.created
    MQ->>Pay: Deliver via q.payments
    MQ->>Audit: Deliver via evt.#
    Pay->>DB: Create payment and checkout URL, stage PaymentStarted, commit
    Pay->>MQ: Acknowledge

    loop Until the checkout URL is ready
        Client->>Orders: GET /orders/:id/payment
        Orders-->>Client: PENDING or AWAITING_CUSTOMER with URL
    end
    Client->>Pay: Open mock checkout URL
    Client->>Pay: POST mock callback with simulated result
    Pay->>DB: Settle once and stage payment outcome, then commit
    Pay-->>Client: Payment result

    Relay->>MQ: evt.payment.succeeded or evt.payment.failed
    MQ->>Orders: Deliver via q.orders.payment
    MQ->>Audit: Deliver via evt.#
    alt Payment succeeded
        Orders->>DB: Set FULFILLING, queue items and commands, commit
    else Payment declined or timed out
        Orders->>DB: Set PAYMENT_FAILED and items SKIPPED, stage OrderFailed, commit
    end
    Orders->>MQ: Acknowledge
```

[Checkout and callback API](../contracts.md#checkout-and-callback)

## Item fulfillment and retry

A paid order grants digital access, then retries an out-of-stock physical item.

```mermaid
sequenceDiagram
    actor Client
    participant API
    participant DB as PostgreSQL
    participant Relay as Outbox relay
    participant MQ as RabbitMQ
    participant Digital as Digital worker
    participant Physical as Physical worker

    Relay->>MQ: cmd.fulfill.digital and cmd.fulfill.physical, attempt 1
    MQ->>Digital: Deliver digital item
    Digital->>DB: Lock order and item, record grant, set item SUCCEEDED
    Digital->>DB: Keep order FULFILLING, stage events, and commit
    Digital->>MQ: Acknowledge
    MQ->>Physical: Deliver physical item
    Physical->>DB: Lock order and item, no stock reserved
    Physical->>DB: Set item FAILED and order FULFILLMENT_FAILED, stage events, and commit
    Physical->>MQ: Acknowledge

    Client->>API: POST /orders/:id/retry after restock
    API->>DB: Lock order, stage retry event and attempt 2 command, then commit
    API-->>Client: 202 FULFILLING

    Relay->>MQ: cmd.fulfill.physical, attempt 2
    MQ->>Physical: Deliver retry command
    Physical->>DB: Reserve stock and create shipment
    Physical->>DB: Set item SUCCEEDED and order COMPLETED, stage events, and commit
    Physical->>MQ: Acknowledge
```

Attempt 2 reuses the payment and leaves the digital grant in place. Late deliveries of attempt 1 are stale. [Payment failure and timeout](../design.md#process-payment)
