-- Member Portal Phase 1

CREATE TYPE "PointTransactionType" AS ENUM ('EARNED', 'REDEEMED', 'ADJUSTED', 'EXPIRED');

CREATE TABLE "member_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_point_balances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "lifetimePoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_point_balances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_point_transactions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "PointTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_point_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_app_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "catalogEnabled" BOOLEAN NOT NULL DEFAULT true,
    "showProductValues" BOOLEAN NOT NULL DEFAULT false,
    "showApproxAvailability" BOOLEAN NOT NULL DEFAULT false,
    "pointsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "allowProfileEdit" BOOLEAN NOT NULL DEFAULT true,
    "digitalCardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "member_app_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_sessions_tokenHash_key" ON "member_sessions"("tokenHash");
CREATE INDEX "member_sessions_tenantId_memberId_idx" ON "member_sessions"("tenantId", "memberId");
CREATE INDEX "member_sessions_tokenHash_idx" ON "member_sessions"("tokenHash");

CREATE UNIQUE INDEX "member_point_balances_tenantId_memberId_key" ON "member_point_balances"("tenantId", "memberId");

CREATE INDEX "member_point_transactions_tenantId_memberId_createdAt_idx" ON "member_point_transactions"("tenantId", "memberId", "createdAt" DESC);

CREATE UNIQUE INDEX "member_app_settings_tenantId_key" ON "member_app_settings"("tenantId");

ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_sessions" ADD CONSTRAINT "member_sessions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_point_balances" ADD CONSTRAINT "member_point_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_point_balances" ADD CONSTRAINT "member_point_balances_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_point_transactions" ADD CONSTRAINT "member_point_transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_point_transactions" ADD CONSTRAINT "member_point_transactions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member_app_settings" ADD CONSTRAINT "member_app_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
