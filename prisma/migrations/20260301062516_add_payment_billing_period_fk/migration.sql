-- Manual migration: enforce Payment -> BillingPeriod link and block writes to closed periods.

-- 1) Add column if missing (safe to rerun)
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "billingPeriodId" TEXT;

-- 2) Backfill billingPeriodId from paidAt year/month -> BillingPeriod(year, month)
-- Ensure the relevant billing periods exist (create missing ones)
-- NOTE: This requires pgcrypto for gen_random_uuid(). If you don't have it, we’ll adjust.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

INSERT INTO "BillingPeriod" (id, year, month, "createdAt", "isClosed")
SELECT gen_random_uuid()::text, t.y, t.m, now(), false
FROM (
  SELECT DISTINCT
    EXTRACT(YEAR FROM p."paidAt")::int AS y,
    EXTRACT(MONTH FROM p."paidAt")::int AS m
  FROM "Payment" p
) t
WHERE NOT EXISTS (
  SELECT 1 FROM "BillingPeriod" bp WHERE bp.year = t.y AND bp.month = t.m
);

UPDATE "Payment" p
SET "billingPeriodId" = bp.id
FROM "BillingPeriod" bp
WHERE bp.year  = EXTRACT(YEAR  FROM p."paidAt")::int
  AND bp.month = EXTRACT(MONTH FROM p."paidAt")::int
  AND p."billingPeriodId" IS NULL;

-- 3) Enforce NOT NULL (only after backfill)
ALTER TABLE "Payment"
  ALTER COLUMN "billingPeriodId" SET NOT NULL;

-- 4) FK constraint (safe to rerun)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Payment_billingPeriodId_fkey'
  ) THEN
    ALTER TABLE "Payment"
      ADD CONSTRAINT "Payment_billingPeriodId_fkey"
      FOREIGN KEY ("billingPeriodId") REFERENCES "BillingPeriod"(id)
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- 5) Index for joins
CREATE INDEX IF NOT EXISTS "Payment_billingPeriodId_idx" ON "Payment" ("billingPeriodId");

-- 6) Trigger: block INSERT/UPDATE on Payment when BillingPeriod.isClosed is true
CREATE OR REPLACE FUNCTION afos_block_payment_when_period_closed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  closed boolean;
BEGIN
  SELECT "isClosed" INTO closed
  FROM "BillingPeriod"
  WHERE id = NEW."billingPeriodId";

  IF closed IS TRUE THEN
    RAISE EXCEPTION 'Billing period is closed' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_payment_write_closed_period ON "Payment";

CREATE TRIGGER trg_block_payment_write_closed_period
BEFORE INSERT OR UPDATE ON "Payment"
FOR EACH ROW
EXECUTE FUNCTION afos_block_payment_when_period_closed();
