BEGIN;

ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "OrderStatus" ADD VALUE 'FULFILLING';
ALTER TYPE "OrderStatus" ADD VALUE 'FULFILLMENT_FAILED';
ALTER TYPE "OrderItemStatus" ADD VALUE 'SKIPPED';
ALTER TYPE "OrderItemStatus" ADD VALUE 'SUCCEEDED';

ALTER TABLE orders ADD COLUMN payment_attempt_no integer NOT NULL DEFAULT 0;
ALTER TABLE order_items ADD COLUMN subscription_days integer CHECK (subscription_days > 0);
UPDATE order_items AS i
SET subscription_days = p.subscription_days
FROM products AS p
WHERE i.product_id = p.id AND i.product_type = 'SUBSCRIPTION' AND p.subscription_days > 0;
ALTER TABLE inventories ADD CONSTRAINT inventories_available_nonnegative CHECK (available >= 0);
CREATE INDEX orders_created_at_id_idx ON orders (created_at DESC, id DESC);
CREATE INDEX orders_status_created_at_id_idx ON orders (status, created_at DESC, id DESC);

CREATE TABLE fulfillment_attempts (
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE CASCADE ON UPDATE CASCADE,
  attempt_no integer NOT NULL CHECK (attempt_no > 0),
  error_code text,
  PRIMARY KEY (order_item_id, attempt_no)
);

CREATE TABLE digital_grants (
  order_item_id uuid PRIMARY KEY REFERENCES order_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  customer_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  customer_id uuid NOT NULL,
  product_id uuid NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE shipments (
  id uuid PRIMARY KEY,
  order_item_id uuid NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX shipments_order_item_id_key ON shipments (order_item_id);

CREATE TABLE fulfillment_outbox (
  id uuid PRIMARY KEY,
  exchange_name text NOT NULL,
  routing_key text NOT NULL,
  payload jsonb NOT NULL,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX fulfillment_outbox_next_attempt_at_id_idx ON fulfillment_outbox (next_attempt_at, id);

COMMIT;
