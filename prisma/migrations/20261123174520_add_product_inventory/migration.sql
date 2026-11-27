-- CreateTable
CREATE TABLE "inventories" (
    "product_id" uuid NOT NULL,
    "available" integer NOT NULL DEFAULT 0,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "inventories_pkey" PRIMARY KEY ("product_id")
);

-- AddForeignKey
ALTER TABLE "inventories"
    ADD CONSTRAINT "inventories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

