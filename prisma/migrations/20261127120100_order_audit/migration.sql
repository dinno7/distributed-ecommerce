BEGIN;

ALTER TABLE audit_logs ADD COLUMN order_id uuid, ADD COLUMN occurred_at timestamptz;
UPDATE audit_logs SET occurred_at = COALESCE("publishedAt", "createdAt") AT TIME ZONE 'UTC';
UPDATE audit_logs SET order_id = (payload->>'orderId')::uuid
WHERE "routingKey" LIKE 'evt.%'
  AND payload->>'orderId' ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$';
ALTER TABLE audit_logs ALTER COLUMN occurred_at SET NOT NULL, ALTER COLUMN occurred_at SET DEFAULT now();
CREATE INDEX audit_logs_order_timeline_idx ON audit_logs (order_id, occurred_at, COALESCE("messageId", id));

UPDATE order_items SET status = 'SUCCEEDED' WHERE status = 'COMPLETED';

-- Recover the latest settled payments from before the Orders subscription existed.
WITH latest AS (
  SELECT DISTINCT ON (p.order_id) p.*, o.currency
  FROM payment AS p JOIN orders AS o ON o.id = p.order_id
  WHERE o.status = 'PENDING_PAYMENT' AND o.payment_attempt_no = 0
  ORDER BY p.order_id, p.attempt DESC
), replay AS (
  SELECT p.*, CASE p.status
    WHEN 'SUCCEEDED' THEN 'evt.payment.succeeded'
    WHEN 'FAILED' THEN 'evt.payment.failed'
    ELSE 'evt.payment.started'
  END AS route
  FROM latest AS p WHERE p.status <> 'AWAITING_CUSTOMER' OR p.checkout_url IS NOT NULL
)
INSERT INTO payment_outbox (id, exchange_name, routing_key, payload, created_at)
SELECT COALESCE(log."messageId"::uuid, gen_random_uuid()), 'x.main', p.route,
  jsonb_strip_nulls(jsonb_build_object(
    'orderId', p.order_id, 'paymentId', p.id, 'attemptNo', p.attempt,
    'amountMinor', CASE WHEN p.status = 'SUCCEEDED' THEN p.amount_minor::text END,
    'currency', CASE WHEN p.status = 'SUCCEEDED' THEN p.currency END,
    'errorCode', p.failure_code,
    'reason', CASE p.failure_code WHEN 'PAYMENT_DECLINED' THEN 'Payment declined'
      WHEN 'PAYMENT_TIMED_OUT' THEN 'Payment timed out' END
  )), COALESCE(log.occurred_at, now())
FROM replay AS p
LEFT JOIN LATERAL (
  SELECT a."messageId", a.occurred_at FROM audit_logs AS a
  WHERE a.order_id = p.order_id AND a."routingKey" = p.route AND a.payload->>'paymentId' = p.id::text
    AND a."messageId" ~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  ORDER BY a.occurred_at LIMIT 1
) AS log ON true
WHERE NOT EXISTS (
  SELECT 1 FROM payment_outbox AS pending
  WHERE pending.routing_key = p.route AND pending.payload->>'paymentId' = p.id::text
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
