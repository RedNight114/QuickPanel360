ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "tenants" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "tenantId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "oldValue" JSONB,
  "newValue" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "platform_audit_logs_actorUserId_idx" ON "platform_audit_logs"("actorUserId");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_tenantId_idx" ON "platform_audit_logs"("tenantId");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_action_idx" ON "platform_audit_logs"("action");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_createdAt_idx" ON "platform_audit_logs"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_audit_logs_actorUserId_fkey'
  ) THEN
    ALTER TABLE "platform_audit_logs"
      ADD CONSTRAINT "platform_audit_logs_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'platform_audit_logs_tenantId_fkey'
  ) THEN
    ALTER TABLE "platform_audit_logs"
      ADD CONSTRAINT "platform_audit_logs_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
