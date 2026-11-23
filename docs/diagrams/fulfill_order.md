# Payment, fulfillment, and retry

Each database transaction shown below runs through `TransactionManager.runTx`. Repository adapters and product data access use the same transaction context for all operations within that boundary.

## Checkout and payment

```mermaid
sequenceDiagram
    actor Client
    participant Orders as Orders API and consumer
    participant DB as PostgreSQL
    participant OrderRelay as Orders relay
    participant PaymentRelay as Payments relay
    participant MQ as x.topic
    participant Pay as Payments
    OrderRelay->>MQ: Publish evt.order.created from order_outbox
    MQ->>Pay: Deliver via q.payments.process
    Pay->>DB: Create attempt 1 and stage PaymentStarted in payment_outbox
    DB-->>Pay: Commit
    Pay->>MQ: Acknowledge

    loop Until the checkout URL is ready
        Client->>Orders: GET /orders/:id/payment
        Orders-->>Client: PENDING or AWAITING_CUSTOMER with URL
    end
    loop Settle the initial checkout or a retry
        PaymentRelay->>MQ: Publish PaymentStarted from payment_outbox
        MQ->>Orders: Deliver via q.orders.payment
        Orders->>DB: Record newer attempt, restore pending state, commit
        Orders->>MQ: Acknowledge

        Client->>Pay: POST mock callback for this payment ID
        Pay->>DB: Settle the attempt and stage outcome in payment_outbox
        DB-->>Pay: Commit
        Pay-->>Client: Payment result

        PaymentRelay->>MQ: Publish payment outcome from payment_outbox
        MQ->>Orders: Deliver via q.orders.payment
        alt Latest attempt succeeded
            Orders->>DB: Set FULFILLING, queue items and commands, commit
        else Latest attempt declined or timed out
            Orders->>DB: Set PAYMENT_FAILED and items SKIPPED, stage OrderFailed, commit
        end
        Orders->>MQ: Acknowledge

        opt Customer retries the failed attempt
            Client->>Pay: POST /orders/:id/payment/retry with failedPaymentId
            Pay->>DB: Lock failed attempt, insert successor and stage PaymentStarted
            DB-->>Pay: Commit payment and payment_outbox
            Pay-->>Client: 201 with new payment ID
        end
    end
```

Payments uses its attempt rows to recognize retries and redeliveries. Orders uses the attempt number to handle duplicate or out-of-order payment events, including an outcome that arrives before `PaymentStarted`. [Retry API](../contracts.md#retry-payment) · [Payment transaction rules](../design.md#process-payment)

## Item fulfillment and retry

A paid order grants digital access, then retries an out-of-stock physical item.

```mermaid
sequenceDiagram
    actor Client
    participant API
    participant DB as PostgreSQL
    participant Relay as Orders relay
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
