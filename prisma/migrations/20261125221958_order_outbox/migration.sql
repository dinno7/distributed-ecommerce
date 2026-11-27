-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "orders_outbox" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "routing_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_outbox_status_next_attempt_at_idx" ON "orders_outbox"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "orders_outbox_order_id_idx" ON "orders_outbox"("order_id");

-- AddForeignKey
ALTER TABLE "orders_outbox" ADD CONSTRAINT "orders_outbox_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
