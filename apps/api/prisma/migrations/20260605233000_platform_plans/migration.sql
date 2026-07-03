CREATE TYPE "PlatformPlanStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "TenantSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'PAST_DUE');

CREATE TABLE "platform_plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "priceMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "maxUsers" INTEGER,
  "maxProducts" INTEGER,
  "features" JSONB,
  "status" "PlatformPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_subscriptions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planId" TEXT,
  "status" "TenantSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "trialEndsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_plans_code_key" ON "platform_plans"("code");
CREATE INDEX "platform_plans_status_idx" ON "platform_plans"("status");
CREATE UNIQUE INDEX "tenant_subscriptions_tenantId_key" ON "tenant_subscriptions"("tenantId");
CREATE INDEX "tenant_subscriptions_planId_idx" ON "tenant_subscriptions"("planId");
CREATE INDEX "tenant_subscriptions_status_idx" ON "tenant_subscriptions"("status");

ALTER TABLE "tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscriptions_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_subscriptions"
  ADD CONSTRAINT "tenant_subscriptions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
