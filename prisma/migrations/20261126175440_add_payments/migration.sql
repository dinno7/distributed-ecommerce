CREATE TYPE "PaymentStatus" AS ENUM ('AWAITING_CUSTOMER', 'SUCCEEDED', 'FAILED');
CREATE TYPE "PaymentFailureCode" AS ENUM ('PAYMENT_DECLINED', 'PAYMENT_TIMED_OUT');

CREATE TABLE "payment" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "attempt" INTEGER NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "failure_code" "PaymentFailureCode",

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payment_attempt_check" CHECK ("attempt" >= 1),
    CONSTRAINT "payment_amount_minor_check" CHECK ("amount_minor" >= 0),
    CONSTRAINT "payment_failure_code_check" CHECK (("status" = 'FAILED') = ("failure_code" IS NOT NULL))
);

CREATE UNIQUE INDEX "payment_order_id_attempt_key" ON "payment"("order_id", "attempt");
CREATE UNIQUE INDEX "payment_payable_order_key" ON "payment"("order_id")
    WHERE "status" IN ('AWAITING_CUSTOMER', 'SUCCEEDED');
