# Creating an order

## Store the order

The Nest HTTP interceptor looks up the request in the shared `idempotency_keys` table before calling Orders. A completed replay skips the use case.

```mermaid
sequenceDiagram
    actor Client
    participant HTTP as Nest HTTP interceptor
    participant Keys as idempotency_keys
    participant Orders as CreateOrderUC
    participant Product
    participant DB as Orders tables

    Client->>HTTP: POST /api/v1/orders with Idempotency-Key
    HTTP->>Keys: Acquire or read the key with its request fingerprint
    alt Completed match
        Keys-->>HTTP: Stored response
        HTTP-->>Client: Replay 201 with Idempotent-Replayed
    else Matching request in progress
        HTTP-->>Client: 409 IDEMPOTENCY_KEY_IN_USE with Retry-After
    else Key belongs to a different request
        HTTP-->>Client: 422 IDEMPOTENCY_KEY_REUSED
    else New lock acquired
        HTTP->>Orders: Call the handler with the validated request
        Orders->>DB: BEGIN
        Orders->>Product: Read product snapshots using the transaction
        Orders->>DB: Insert order and item snapshots
        Orders->>DB: Stage OrderCreated in orders_outbox
        Orders->>DB: COMMIT
        Orders-->>HTTP: Created order
        HTTP->>Keys: Store the response in a separate write
        HTTP-->>Client: 201 Created
    end
```

[Create-order transaction](../design.md#create-an-order-idempotently)

## Relay outbox messages

Orders, Payments, and Fulfillment each run this loop against their own outbox table.

```mermaid
sequenceDiagram
    participant Relay as Module relay
    participant DB as Module outbox
    participant Topic as x.main

    loop Poll due messages
        Relay->>DB: Claim up to 25 due rows using FOR UPDATE SKIP LOCKED
        DB-->>Relay: Commit claims with next attempt time 30 seconds ahead
        loop For each claimed message
            Relay->>Topic: Publish persistent, mandatory message
            alt Confirmed without a return
                Relay->>DB: Mark PUBLISHED in Orders or delete in Payment and Fulfillment
            else Return, negative confirm, or timeout
                Relay->>DB: Schedule another attempt in three seconds
            end
        end
    end
```

[Delivery and recovery](../design.md#delivery-and-recovery)
