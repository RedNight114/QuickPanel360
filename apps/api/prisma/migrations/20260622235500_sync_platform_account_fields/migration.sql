-- Sync platform account management fields
-- Applied manually to resolve schema drift

-- CreateEnum
CREATE TYPE "PlatformAccountHealth" AS ENUM ('STABLE', 'FOLLOW_UP', 'AT_RISK', 'BLOCKED');
CREATE TYPE "PlatformCollectionStatus" AS ENUM ('OPEN', 'CONTACTED', 'PROMISE', 'DISPUTED', 'CLOSED');
CREATE TYPE "PlatformAccountActivityType" AS ENUM ('NOTE', 'CONTACT', 'COLLECTION', 'PAYMENT', 'PROMISE', 'STATUS_CHANGE', 'RENEWAL');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN "accountHealth" "PlatformAccountHealth" NOT NULL DEFAULT 'STABLE',
ADD COLUMN "accountOwnerId" TEXT,
ADD COLUMN "nextReviewAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "tenant_collection_cases" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "status" "PlatformCollectionStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastContactAt" TIMESTAMP(3),
    "nextActionAt" TIMESTAMP(3),
    "promiseDate" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenant_collection_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_account_activities" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "PlatformAccountActivityType" NOT NULL DEFAULT 'NOTE',
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenant_account_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_collection_cases_tenantId_key" ON "tenant_collection_cases"("tenantId");
CREATE INDEX "tenant_collection_cases_status_idx" ON "tenant_collection_cases"("status");
CREATE INDEX "tenant_collection_cases_assignedToId_idx" ON "tenant_collection_cases"("assignedToId");
CREATE INDEX "tenant_collection_cases_nextActionAt_idx" ON "tenant_collection_cases"("nextActionAt");
CREATE INDEX "tenant_account_activities_tenantId_idx" ON "tenant_account_activities"("tenantId");
CREATE INDEX "tenant_account_activities_actorUserId_idx" ON "tenant_account_activities"("actorUserId");
CREATE INDEX "tenant_account_activities_type_idx" ON "tenant_account_activities"("type");
CREATE INDEX "tenant_account_activities_createdAt_idx" ON "tenant_account_activities"("createdAt");
CREATE INDEX "tenant_account_activities_tenantId_createdAt_idx" ON "tenant_account_activities"("tenantId", "createdAt" DESC);
CREATE INDEX "tenants_accountHealth_idx" ON "tenants"("accountHealth");
CREATE INDEX "tenants_accountOwnerId_idx" ON "tenants"("accountOwnerId");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_accountOwnerId_fkey" FOREIGN KEY ("accountOwnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_collection_cases" ADD CONSTRAINT "tenant_collection_cases_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_collection_cases" ADD CONSTRAINT "tenant_collection_cases_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tenant_account_activities" ADD CONSTRAINT "tenant_account_activities_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tenant_account_activities" ADD CONSTRAINT "tenant_account_activities_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
