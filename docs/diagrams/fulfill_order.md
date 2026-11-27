# Payment, fulfillment, and retry

Use cases run transactions through `TransactionManager.run`. For physical items, Fulfillment passes the transaction context to Product's reservation operation. Each module relays messages from its own outbox.

## Checkout and payment

```mermaid
sequenceDiagram
    actor Client
    participant Orders as Orders API and consumer
    participant DB as PostgreSQL
    participant OrderRelay as Orders relay
    participant PaymentRelay as Payments relay
    participant MQ as x.main
    participant Pay as Payments
    OrderRelay->>MQ: Publish evt.order.created from orders_outbox
    MQ->>Pay: Deliver via q.payment.process
    Pay->>DB: Insert or reuse attempt 1 and commit
    Pay->>Pay: Generate the mock checkout URL
    Pay->>DB: Save checkout URL and stage PaymentStarted
    DB-->>Pay: Commit checkout and payment_outbox
    Pay->>MQ: Acknowledge

    loop Until the checkout URL is ready
        Client->>Pay: GET /api/v1/payments?orderId=uuid
        Pay-->>Client: 404, PENDING, or AWAITING_CUSTOMER with URL
    end
    loop Settle the initial checkout or a retry
        PaymentRelay->>MQ: Publish PaymentStarted from payment_outbox
        MQ->>Orders: Deliver via q.orders.payment
        Orders->>DB: Record newer attempt, restore pending state, commit
        Orders->>MQ: Acknowledge

        Client->>Pay: POST /api/v1/payments/:paymentId/callback
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
            Client->>Pay: POST /api/v1/payments/:paymentId/retry
            Pay->>DB: Lock failed attempt, insert or reuse successor, and commit
            Pay->>Pay: Prepare checkout if needed
            Pay->>DB: Save checkout URL and commit PaymentStarted
            Pay-->>Client: 201 with new payment ID
        end
    end
```

Payments uses its attempt rows to recognize retries and redeliveries. Orders uses the attempt number to handle duplicate or out-of-order payment events, including an outcome that arrives before `PaymentStarted`. [Retry API](../contracts.md#retry-payment) · [Payment transaction rules](../design.md#process-payment)

## Item fulfillment and retry

A paid order grants digital access, then retries an out-of-stock physical item. Publish arrows represent each module's outbox relay after commit.

```mermaid
sequenceDiagram
    actor Client
    participant Orders
    participant MQ as RabbitMQ
    participant Fulfillment
    participant Product

    Orders->>MQ: Publish digital and physical commands with item snapshots
    MQ->>Fulfillment: Deliver digital attempt 1
    Fulfillment->>Fulfillment: Commit claim, grant, and success event
    Fulfillment->>MQ: Acknowledge and relay success
    MQ->>Orders: Deliver digital success
    Orders->>Orders: Commit item SUCCEEDED and keep order FULFILLING

    MQ->>Fulfillment: Deliver physical attempt 1
    Fulfillment->>Product: Reserve stock in shipment transaction
    Product-->>Fulfillment: Out of stock
    Fulfillment->>Fulfillment: Commit claim and OUT_OF_STOCK event
    Fulfillment->>MQ: Acknowledge and relay failure
    MQ->>Orders: Deliver physical failure
    Orders->>Orders: Commit item FAILED and order FULFILLMENT_FAILED

    Note over Product: Operator replenishes the inventory row
    Client->>Orders: POST /api/v1/orders/:id/retry with Idempotency-Key
    Orders->>Orders: Commit item QUEUED and stage attempt 2 command
    Orders-->>Client: 202 FULFILLING
    Orders->>MQ: Publish physical command for attempt 2
    MQ->>Fulfillment: Deliver physical attempt 2
    Fulfillment->>Product: Reserve stock in shipment transaction
    Product-->>Fulfillment: Stock reserved
    Fulfillment->>Fulfillment: Commit claim, stock decrement, shipment, and events
    Fulfillment->>MQ: Acknowledge and relay success
    MQ->>Orders: Deliver physical success
    Orders->>Orders: Commit item SUCCEEDED and order COMPLETED
```

The retry reuses the payment and leaves the digital grant in place. Fulfillment deduplicates commands by item ID and attempt. Orders applies outcomes only to the matching queued attempt. [Fulfillment transaction](../design.md#claim-and-finish-an-item-safely) · [Order outcome transaction](../design.md#apply-the-fulfillment-outcome-to-the-order)
