CREATE TYPE "NotificationType" AS ENUM (
  'INVENTORY_LOW',
  'INVENTORY_OUT',
  'SCALE_TOLERANCE_EXCEEDED',
  'POSITIVE_WASTE_HIGH',
  'NEGATIVE_DIFFERENCE',
  'CASH_DIFFERENCE',
  'CASH_OPEN_TOO_LONG',
  'MEMBER_BIRTHDAY',
  'MEMBER_PENDING_CONTRIBUTION',
  'SECURITY_ALERT',
  'EMERGENCY_ACTIVE',
  'SYSTEM'
);

CREATE TYPE "NotificationPriority" AS ENUM (
  'INFO',
  'WARNING',
  'IMPORTANT',
  'CRITICAL'
);

CREATE TYPE "NotificationStatus" AS ENUM (
  'UNREAD',
  'READ',
  'IN_REVIEW',
  'RESOLVED',
  'ARCHIVED'
);

CREATE TABLE "internal_notifications" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "NotificationType" NOT NULL,
  "priority" "NotificationPriority" NOT NULL DEFAULT 'INFO',
  "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "readAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "internal_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "internal_notifications_tenantId_idx" ON "internal_notifications"("tenantId");
CREATE INDEX "internal_notifications_userId_idx" ON "internal_notifications"("userId");
CREATE INDEX "internal_notifications_type_idx" ON "internal_notifications"("type");
CREATE INDEX "internal_notifications_priority_idx" ON "internal_notifications"("priority");
CREATE INDEX "internal_notifications_status_idx" ON "internal_notifications"("status");
CREATE INDEX "internal_notifications_entityType_entityId_idx" ON "internal_notifications"("entityType", "entityId");
CREATE INDEX "internal_notifications_createdAt_idx" ON "internal_notifications"("createdAt");

ALTER TABLE "internal_notifications"
ADD CONSTRAINT "internal_notifications_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "internal_notifications"
ADD CONSTRAINT "internal_notifications_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
