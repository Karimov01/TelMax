ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'TRANSFER';
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'OTHER';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS idempotency_key varchar(80);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name varchar(160);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_phone varchar(30);
CREATE UNIQUE INDEX IF NOT EXISTS sales_idempotency_uidx ON sales (idempotency_key);
