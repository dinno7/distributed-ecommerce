-- CreateEnum
CREATE TYPE "ProductType" AS ENUM (
    'PHYSICAL',
    'DIGITAL',
    'SUBSCRIPTION'
);

-- CreateTable
CREATE TABLE "products" (
    "id" uuid NOT NULL,
    "name" text NOT NULL,
    "type" "ProductType" NOT NULL,
    "unit_price_minor" bigint NOT NULL,
    "subscription_days" integer,
    "digital_metadata" jsonb,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
