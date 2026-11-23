# Creating an order

## Store the order

The PostgreSQL calls represent work delegated through repository ports and Products data access. `TransactionManager.runTx` supplies the single transaction context used for the request claim, product reads, order writes, and outbox entry.

```mermaid
sequenceDiagram
    actor Client
    participant API
    participant DB as PostgreSQL

    Client->>API: POST /orders with X-Idempotency-Key
    API->>API: Validate and hash the normalized request
    API->>DB: BEGIN and INSERT order_request ON CONFLICT DO NOTHING

    alt Key already exists
        API->>DB: Read the request in a new statement
        DB-->>API: Order ID and request hash
        alt Same request hash
            API->>DB: COMMIT
            API-->>Client: Replay 201 with original order ID and PENDING_PAYMENT
        else Different request hash
            API->>DB: ROLLBACK
            API-->>Client: 409 IDEMPOTENCY_KEY_CONFLICT
        end
    else Key claimed
        API->>DB: Read product data
        alt Products and quantities are valid
            API->>DB: Insert order and item snapshots
            API->>DB: Stage evt.order.created in outbox
            API->>DB: COMMIT
            API-->>Client: 201 with order ID and PENDING_PAYMENT
        else Invalid product or quantity
            API->>DB: ROLLBACK
            API-->>Client: 400
        end
    end
```

[Create-order transaction](../design.md#create-an-order-idempotently)

## Relay outbox messages

The relay uses `TransactionManager.runTx` and the outbox persistence adapter to claim and update a row in one transaction.

```mermaid
sequenceDiagram
    participant Relay as Outbox relay
    participant DB as PostgreSQL
    participant Topic as x.topic

    loop Poll due messages
        Relay->>DB: BEGIN, select one due unpublished row FOR UPDATE SKIP LOCKED
        alt No row
            Relay->>DB: COMMIT
            Note over Relay: Back off before the next poll
        else Row claimed
            DB-->>Relay: Message and stable message ID
            Relay->>Topic: Publish persistent, mandatory message
            alt Confirmed without a return
                Relay->>DB: Set published_at and COMMIT
            else Return, negative confirm, or timeout
                Relay->>DB: Delay next publication and COMMIT
            end
        end
    end
```

[Delivery and recovery](../design.md#delivery-and-recovery)
