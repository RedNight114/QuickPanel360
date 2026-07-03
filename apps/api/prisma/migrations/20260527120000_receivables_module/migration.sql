CREATE TABLE IF NOT EXISTS "receivable_payments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "receivableId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "posSessionId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  "receivedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "receivable_payments_tenantId_idx" ON "receivable_payments"("tenantId");
CREATE INDEX IF NOT EXISTS "receivable_payments_receivableId_idx" ON "receivable_payments"("receivableId");
CREATE INDEX IF NOT EXISTS "receivable_payments_memberId_idx" ON "receivable_payments"("memberId");
CREATE INDEX IF NOT EXISTS "receivable_payments_posSessionId_idx" ON "receivable_payments"("posSessionId");
CREATE INDEX IF NOT EXISTS "receivable_payments_createdAt_idx" ON "receivable_payments"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivable_payments_tenantId_fkey'
  ) THEN
    ALTER TABLE "receivable_payments"
      ADD CONSTRAINT "receivable_payments_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivable_payments_receivableId_fkey'
  ) THEN
    ALTER TABLE "receivable_payments"
      ADD CONSTRAINT "receivable_payments_receivableId_fkey"
      FOREIGN KEY ("receivableId") REFERENCES "receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivable_payments_memberId_fkey'
  ) THEN
    ALTER TABLE "receivable_payments"
      ADD CONSTRAINT "receivable_payments_memberId_fkey"
      FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivable_payments_posSessionId_fkey'
  ) THEN
    ALTER TABLE "receivable_payments"
      ADD CONSTRAINT "receivable_payments_posSessionId_fkey"
      FOREIGN KEY ("posSessionId") REFERENCES "pos_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'receivable_payments_receivedById_fkey'
  ) THEN
    ALTER TABLE "receivable_payments"
      ADD CONSTRAINT "receivable_payments_receivedById_fkey"
      FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
