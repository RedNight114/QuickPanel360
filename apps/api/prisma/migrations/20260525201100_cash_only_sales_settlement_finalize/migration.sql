-- Phase 1: cash-only settlement model.

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "creditReason" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "specialReason" TEXT;

ALTER TABLE "sales" ALTER COLUMN "saleType" DROP DEFAULT;
ALTER TYPE "SaleType" RENAME TO "SaleType_old";
CREATE TYPE "SaleType" AS ENUM ('STANDARD', 'CREDIT', 'PARTIAL_CREDIT', 'SPECIAL');
ALTER TABLE "sales"
  ALTER COLUMN "saleType" TYPE "SaleType"
  USING (
    CASE "saleType"::text
      WHEN 'CASH' THEN 'STANDARD'
      WHEN 'PARTIAL' THEN 'PARTIAL_CREDIT'
      ELSE "saleType"::text
    END
  )::"SaleType";
ALTER TABLE "sales" ALTER COLUMN "saleType" SET DEFAULT 'STANDARD';
DROP TYPE "SaleType_old";

ALTER TABLE "sales" ALTER COLUMN "settlementStatus" DROP DEFAULT;
ALTER TYPE "SettlementStatus" RENAME TO "SettlementStatus_old";
CREATE TYPE "SettlementStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'PENDING', 'CANCELLED', 'REFUNDED');
ALTER TABLE "sales"
  ALTER COLUMN "settlementStatus" TYPE "SettlementStatus"
  USING (
    CASE "settlementStatus"::text
      WHEN 'PARTIAL' THEN 'PARTIALLY_PAID'
      ELSE "settlementStatus"::text
    END
  )::"SettlementStatus";
ALTER TABLE "sales" ALTER COLUMN "settlementStatus" SET DEFAULT 'PAID';
DROP TYPE "SettlementStatus_old";

UPDATE "cash_movements"
SET "type" = 'SALE_CASH_IN'
WHERE "type" = 'CASH_IN'
  AND "saleId" IS NOT NULL;

ALTER TABLE "receivables" RENAME COLUMN "amountOriginal" TO "originalAmount";
ALTER TABLE "receivables" RENAME COLUMN "amountPending" TO "outstandingAmount";
ALTER TABLE "receivables" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "receivables" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "receivables" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE "receivables" ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE "receivables" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;

UPDATE "receivables" r
SET
  "createdById" = s."soldById",
  "reason" = COALESCE(s."creditReason", r."reason")
FROM "sales" s
WHERE r."saleId" = s."id"
  AND r."createdById" IS NULL;

ALTER TABLE "receivables" ALTER COLUMN "createdById" SET NOT NULL;
ALTER TABLE "receivables" ALTER COLUMN "saleId" DROP NOT NULL;
ALTER TABLE "receivables" DROP COLUMN IF EXISTS "settledAt";

CREATE INDEX IF NOT EXISTS "sales_approvedById_idx" ON "sales"("approvedById");
CREATE INDEX IF NOT EXISTS "receivables_saleId_idx" ON "receivables"("saleId");

ALTER TABLE "sales"
  ADD CONSTRAINT "sales_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "receivables"
  ADD CONSTRAINT "receivables_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "receivables"
  ADD CONSTRAINT "receivables_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill from historical CASH payments if missing.
UPDATE "sales" s
SET
  "amountPaid" = COALESCE(p."cashPaid", s."amountPaid"),
  "amountPending" = GREATEST(s."total" - COALESCE(p."cashPaid", s."amountPaid"), 0),
  "settlementStatus" = CASE
    WHEN COALESCE(p."cashPaid", s."amountPaid") <= 0 THEN 'PENDING'::"SettlementStatus"
    WHEN COALESCE(p."cashPaid", s."amountPaid") < s."total" THEN 'PARTIALLY_PAID'::"SettlementStatus"
    ELSE 'PAID'::"SettlementStatus"
  END,
  "saleType" = CASE
    WHEN COALESCE(p."cashPaid", s."amountPaid") <= 0 THEN 'CREDIT'::"SaleType"
    WHEN COALESCE(p."cashPaid", s."amountPaid") < s."total" THEN 'PARTIAL_CREDIT'::"SaleType"
    ELSE 'STANDARD'::"SaleType"
  END
FROM (
  SELECT "saleId", SUM("amount") AS "cashPaid"
  FROM "payments"
  WHERE "method" = 'CASH' AND "status" = 'COMPLETED'
  GROUP BY "saleId"
) p
WHERE s."id" = p."saleId";

INSERT INTO "cash_movements" (
  "id",
  "tenantId",
  "posSessionId",
  "saleId",
  "type",
  "amount",
  "reason",
  "createdById",
  "createdAt"
)
SELECT
  gen_random_uuid()::text,
  s."tenantId",
  s."posSessionId",
  s."id",
  'SALE_CASH_IN'::"CashMovementType",
  p."amount",
  'Backfill cobro efectivo venta ' || s."id",
  s."soldById",
  p."createdAt"
FROM "payments" p
JOIN "sales" s ON s."id" = p."saleId"
WHERE p."method" = 'CASH'
  AND p."status" = 'COMPLETED'
  AND NOT EXISTS (
    SELECT 1
    FROM "cash_movements" cm
    WHERE cm."saleId" = s."id"
      AND cm."type" = 'SALE_CASH_IN'
  );

INSERT INTO "receivables" (
  "id",
  "tenantId",
  "saleId",
  "memberId",
  "originalAmount",
  "paidAmount",
  "outstandingAmount",
  "status",
  "reason",
  "createdById",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  s."tenantId",
  s."id",
  s."memberId",
  s."amountPending",
  0,
  s."amountPending",
  'OPEN'::"ReceivableStatus",
  s."creditReason",
  s."soldById",
  s."createdAt",
  CURRENT_TIMESTAMP
FROM "sales" s
WHERE s."amountPending" > 0
  AND NOT EXISTS (
    SELECT 1 FROM "receivables" r WHERE r."saleId" = s."id"
  );
