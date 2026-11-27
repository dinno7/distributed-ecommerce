-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "routingKey" TEXT NOT NULL,
    "messageId" TEXT,
    "correlationId" TEXT,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_messageId_key" ON "audit_logs"("messageId");

-- CreateIndex
CREATE INDEX "audit_logs_exchange_routingKey_idx" ON "audit_logs"("exchange", "routingKey");

-- CreateIndex
CREATE INDEX "audit_logs_correlationId_idx" ON "audit_logs"("correlationId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
