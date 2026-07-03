DO $$ BEGIN
  CREATE TYPE "ThirdPartyType" AS ENUM ('SUPPLIER', 'SERVICE_PROVIDER', 'COLLABORATOR', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ThirdPartyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ThirdPartyPaymentCategory" AS ENUM ('SUPPLIER_PAYMENT', 'SERVICE_PAYMENT', 'COLLABORATOR_PAYMENT', 'CASH_WITHDRAWAL', 'EXPENSE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ThirdPartyPaymentStatus" AS ENUM ('PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "third_parties" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ThirdPartyType" NOT NULL DEFAULT 'OTHER',
  "documentNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "status" "ThirdPartyStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "third_parties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "third_party_payments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "thirdPartyId" TEXT,
  "posSessionId" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "category" "ThirdPartyPaymentCategory" NOT NULL DEFAULT 'OTHER',
  "status" "ThirdPartyPaymentStatus" NOT NULL DEFAULT 'PAID',
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "paidById" TEXT NOT NULL,
  "cancelledById" TEXT,
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "cashMovementId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "third_party_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "third_party_payments_cashMovementId_key" ON "third_party_payments"("cashMovementId");
CREATE INDEX IF NOT EXISTS "third_parties_tenantId_idx" ON "third_parties"("tenantId");
CREATE INDEX IF NOT EXISTS "third_parties_status_idx" ON "third_parties"("status");
CREATE INDEX IF NOT EXISTS "third_parties_type_idx" ON "third_parties"("type");
CREATE INDEX IF NOT EXISTS "third_party_payments_tenantId_idx" ON "third_party_payments"("tenantId");
CREATE INDEX IF NOT EXISTS "third_party_payments_thirdPartyId_idx" ON "third_party_payments"("thirdPartyId");
CREATE INDEX IF NOT EXISTS "third_party_payments_posSessionId_idx" ON "third_party_payments"("posSessionId");
CREATE INDEX IF NOT EXISTS "third_party_payments_status_idx" ON "third_party_payments"("status");
CREATE INDEX IF NOT EXISTS "third_party_payments_category_idx" ON "third_party_payments"("category");
CREATE INDEX IF NOT EXISTS "third_party_payments_createdAt_idx" ON "third_party_payments"("createdAt");

DO $$ BEGIN
  ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_parties" ADD CONSTRAINT "third_parties_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_thirdPartyId_fkey" FOREIGN KEY ("thirdPartyId") REFERENCES "third_parties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_posSessionId_fkey" FOREIGN KEY ("posSessionId") REFERENCES "pos_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "third_party_payments" ADD CONSTRAINT "third_party_payments_cashMovementId_fkey" FOREIGN KEY ("cashMovementId") REFERENCES "cash_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
