-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key_hash" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "owner" TEXT,
    "response" JSON,
    "expires_at" BIGINT NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key_hash")
);

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");
