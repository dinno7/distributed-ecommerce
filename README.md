# distributed ecommerce system

The distributed ecommerce system is an e-commerce backend that processes orders containing physical products, digital goods, and subscriptions. The NestJS app runs the HTTP API, mock checkout, and background workers. PostgreSQL stores orders and transactional outboxes, and RabbitMQ carries payment and fulfillment messages between modules.

After a successful payment, the fulfillment workers reserve stock and create shipments for physical items, record access grants for digital items, and activate or extend subscriptions. If one item fails, completed items stay fulfilled. The audit API exposes stored events and a live stream.

The demo assumes trusted callers and simulates payment and fulfillment locally.

## Run with Docker Compose

1. Install Git and start Docker Desktop, or use Docker Engine with the Compose plugin on Linux. Run `docker info` and `docker compose version` to check both are available. The first run needs internet access to download the container images. [Docker Compose installation guide](https://docs.docker.com/compose/install/)

2. Clone the repository and enter it.

   ```bash
   git clone https://github.com/dinno7/distributed-ecommerce.git
   cd distributed-ecommerce
   ```

3. Start the stack. Compose is configured to pull `ghcr.io/dinno7/distribute-ecommerce:latest` from GitHub Container Registry. Compose provides the demo configuration on a fresh checkout, so you can start without creating a `.env` file. Make sure local ports `7000`, `5432`, `5672`, and `15672` are free.

   ```bash
   docker compose up -d
   ```

   To build the image from your checkout, uncomment `pull_policy: build` and the entire `build:` block under `services.app` in `compose.yml`, then run `docker compose up -d --build`. Use this option if the registry returns `manifest unknown`.

   The app container applies Prisma migrations and seeds the demo catalog before starting the API.

4. Open the health endpoint. When `data.status` is `ok`, the app can reach PostgreSQL and RabbitMQ. If the endpoint is still unavailable, check `docker compose ps` and `docker compose logs --tail=100 app postgres rabbitmq` for startup errors. [Health endpoint](http://localhost:7000/api/health)

5. Open the app in your browser.

   - Watch audit events as they happen at [`/`](http://localhost:7000/). Follow the [mixed order walkthrough](#try-a-mixed-order) to generate events.
   - Read the project documentation at [`/docs/`](http://localhost:7000/docs/).
   - Browse API endpoints and request examples at [`/apidocs/`](http://localhost:7000/apidocs/).

6. When finished, run `docker compose down` from the same directory. This removes the containers and keeps the database and broker data for the next run.

## Run from source

Use Node.js 24 and pnpm 12, as in the Docker image. Start just the dependencies with `docker compose up -d --wait postgres rabbitmq`. If you already started the full stack, run `docker compose stop app` to free port 7000.

Set these values in `.env` for the default local Compose services. If you set different service credentials in Compose, use those in the connection URLs.

```dotenv
PORT=7000
DATABASE_URL=postgresql://dinno:1234@127.0.0.1:5432/distributed-ecommerce
RABBITMQ_URL=amqp://guest:guest@127.0.0.1:5672
```

```bash
pnpm install --frozen-lockfile
pnpm exec prisma generate --config prisma7.config.ts
pnpm exec prisma migrate deploy --config prisma7.config.ts
pnpm exec prisma db seed --config prisma7.config.ts
pnpm start:dev
```

## Try a mixed order

Check that `curl -fsS http://localhost:7000/api/ping` returns `pong` in `data`. The seed adds a keyboard, an e-book, and a monthly subscription, so you can try all three fulfillment paths in one order.

```bash
curl -fsS http://localhost:7000/api/v1/orders \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: mixed-order-demo-1' \
  -d '{
    "customerId": "550e8400-e29b-41d4-a716-446655440000",
    "items": [
      {"productId": "019338a0-0000-7000-8000-000000000001", "quantity": 1},
      {"productId": "019338a0-0000-7000-8000-000000000002", "quantity": 1},
      {"productId": "019338a0-0000-7000-8000-000000000003", "quantity": 1}
    ]
  }'
```

Copy `data.id` into `ORDER_ID`. Repeat the payment lookup until `data.checkoutUrl` is set. Use a fresh `Idempotency-Key` each time you want to create another order.

```bash
ORDER_ID='paste-order-id-here'
curl -fsS "http://localhost:7000/api/v1/payments?orderId=$ORDER_ID"
```

Submit `SUCCESS` using `data.paymentId`, then check the order again until it reaches `COMPLETED`. Order details include item statuses, the latest payment, and shipments.

```bash
PAYMENT_ID='paste-payment-id-here'
curl -fsS "http://localhost:7000/api/v1/payments/$PAYMENT_ID/callback" \
  -H 'Content-Type: application/json' \
  -d '{"result":"SUCCESS"}'
curl -fsS "http://localhost:7000/api/v1/orders/$ORDER_ID"
```

Use `GET /api/v1/audit` for event history or `curl -N http://localhost:7000/api/v1/audit/stream` for live events. More requests, including catalog management and payment retries, are in the [Bruno collection](docs/api/).

## Tests

Generate Prisma Client first using the source setup above. The end-to-end smoke test connects to RabbitMQ on `localhost:5672`. Run it against a local broker with no app traffic.

```bash
pnpm test
pnpm test:e2e
pnpm test:cov
```

- The idempotency store integration suite runs when `TEST_DATABASE_URL` is set. Use a PostgreSQL database where the test user can create schemas. The suite applies the idempotency migration in a temporary schema and drops the schema afterward.
- The fulfillment suite runs when `FULFILLMENT_TEST_DATABASE_URL` and `FULFILLMENT_TEST_RABBITMQ_URL` are exported. Use an isolated PostgreSQL database and a dedicated RabbitMQ virtual host. The suite creates products and orders and runs the real workers.

```bash
DATABASE_URL="$FULFILLMENT_TEST_DATABASE_URL" pnpm exec prisma migrate deploy --config prisma7.config.ts
pnpm test:e2e --runInBand fulfillment.e2e-spec.ts
```

## Fulfillment recovery

- **Out of stock.** Add stock to the product's existing row in `inventories`, then send `POST /api/v1/orders/:id/retry` with a fresh `Idempotency-Key`. Send `{}` to retry all eligible items or `{"itemId":"<order-item-id>"}` to retry one. The original payment and completed items are preserved.
- **Dead-lettered work.** After fixing the cause, republish the delivery to RabbitMQ's `x.main` exchange with its original routing key, body, and message ID. Acknowledge the dead-letter copy after RabbitMQ confirms the republish. Orders and Fulfillment use persisted workflow state to deduplicate the delivery.
- **Upgrading to the fulfillment workflow.** Stop older app instances before applying the migrations. The migration restages eligible payment events for existing orders still pending payment. Start the new app to declare the queue bindings and resume delivery.

See the [project documentation](docs/INDEX.md) and the [fulfillment sequence diagram](docs/diagrams/fulfill_order.md) for design details and diagrams.
