-- Push subscriptions for member portal
CREATE TABLE "member_push_subscriptions" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "tenantId"  TEXT NOT NULL,
  "memberId"  TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "member_push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "member_push_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "member_push_subscriptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "member_push_subscriptions_endpoint_key" ON "member_push_subscriptions"("endpoint");
CREATE INDEX "member_push_subscriptions_memberId_idx" ON "member_push_subscriptions"("memberId");

-- Push subscriptions for admin panel users
CREATE TABLE "admin_push_subscriptions" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId"    TEXT NOT NULL,
  "tenantId"  TEXT NOT NULL,
  "endpoint"  TEXT NOT NULL,
  "p256dh"    TEXT NOT NULL,
  "auth"      TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_push_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "admin_push_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "admin_push_subscriptions_endpoint_key" ON "admin_push_subscriptions"("endpoint");
CREATE INDEX "admin_push_subscriptions_userId_idx" ON "admin_push_subscriptions"("userId");
