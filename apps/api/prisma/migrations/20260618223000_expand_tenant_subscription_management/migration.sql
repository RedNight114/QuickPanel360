ALTER TYPE "TenantSubscriptionStatus" ADD VALUE IF NOT EXISTS 'TRIAL';
ALTER TYPE "TenantSubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

ALTER TABLE "tenant_subscriptions"
  ADD COLUMN "nextRenewalAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "notes" TEXT;
