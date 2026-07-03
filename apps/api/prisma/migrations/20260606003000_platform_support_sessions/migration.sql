CREATE TYPE "PlatformSupportSessionStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "platform_support_sessions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "closedById" TEXT,
  "reason" TEXT NOT NULL,
  "status" "PlatformSupportSessionStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_support_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_support_sessions_tenantId_idx" ON "platform_support_sessions"("tenantId");
CREATE INDEX "platform_support_sessions_openedById_idx" ON "platform_support_sessions"("openedById");
CREATE INDEX "platform_support_sessions_status_idx" ON "platform_support_sessions"("status");
CREATE INDEX "platform_support_sessions_openedAt_idx" ON "platform_support_sessions"("openedAt");

ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "platform_support_sessions" ADD CONSTRAINT "platform_support_sessions_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
