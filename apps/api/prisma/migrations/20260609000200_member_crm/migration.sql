-- Member CRM upgrade: flexible profile, classes and tenant benefits.
DO $$ BEGIN
  CREATE TYPE "MemberClass" AS ENUM ('STANDARD', 'PREFERRED', 'VIP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "members" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "members" ALTER COLUMN "lastName" DROP NOT NULL;

ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "displayName" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "profileNotes" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "photoStorageKey" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "memberClass" "MemberClass" NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "preferredContactMethod" TEXT;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "marketingConsent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "lastVisitAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "member_class_benefits" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "memberClass" "MemberClass" NOT NULL,
  "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "birthdayBenefitEnabled" BOOLEAN NOT NULL DEFAULT false,
  "birthdayDiscountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "birthdayGiftNote" TEXT,
  "allowSpecialCreditLimit" BOOLEAN NOT NULL DEFAULT false,
  "creditLimitAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_class_benefits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "member_class_benefits_tenantId_memberClass_key" ON "member_class_benefits"("tenantId", "memberClass");
CREATE INDEX IF NOT EXISTS "member_class_benefits_tenantId_idx" ON "member_class_benefits"("tenantId");
CREATE INDEX IF NOT EXISTS "members_memberClass_idx" ON "members"("memberClass");

DO $$ BEGIN
  ALTER TABLE "member_class_benefits"
    ADD CONSTRAINT "member_class_benefits_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
