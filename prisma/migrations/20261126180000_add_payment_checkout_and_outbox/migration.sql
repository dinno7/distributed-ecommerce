ALTER TABLE "payment" ADD COLUMN "gateway_name" TEXT NOT NULL DEFAULT 'mock',
ADD COLUMN "checkout_url" TEXT;

CREATE TABLE "payment_outbox" (
    "id" UUID NOT NULL,
    "exchange_name" TEXT NOT NULL,
    "routing_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "payment_outbox_next_attempt_at_id_idx" ON "payment_outbox"("next_attempt_at", "id");
