-- The order ID remains in the original event payload. Audit preserves the original timestamps.
ALTER TABLE audit_logs DROP COLUMN order_id, DROP COLUMN occurred_at;
