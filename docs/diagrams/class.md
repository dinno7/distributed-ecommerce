# Module diagram

Solid arrows show synchronous calls through module-owned interfaces. Dashed arrows show RabbitMQ publishing and consumption.

```mermaid
classDiagram
    direction TB

    OrderModule --> ProductModule : reads product snapshots
    OrderModule --> FulfillmentModule : reads shipments
    OrderModule --> PaymentModule : reads latest payment
    FulfillmentModule --> ProductModule : reserves stock

    OrderModule .. MessagingModule : publishes and consumes
    PaymentModule .. MessagingModule : publishes and consumes
    FulfillmentModule .. MessagingModule : publishes and consumes
    MessagingModule ..> AuditModule : copies commands and events
```

Orders publishes item commands and applies outcomes. Product owns the stock update, which commits with the shipment and Fulfillment's outcome. Orders, Payment, and Fulfillment each relay their own outbox.

[Module layout](../design.md#module-layout) · [Transaction boundaries](../design.md#transaction-boundaries) · [Sequence diagrams](fulfill_order.md) · [Data model](erd.md#mvp-model)
