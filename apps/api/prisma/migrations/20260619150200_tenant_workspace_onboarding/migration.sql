-- CreateEnum
CREATE TYPE "TenantLifecycleStage" AS ENUM ('LEAD', 'NEW_SIGNUP', 'ONBOARDING', 'ACTIVE_STABLE', 'ACTIVE_AT_RISK', 'SUSPENDED', 'CHURNED');

-- CreateEnum
CREATE TYPE "TenantRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "OnboardingTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleStage" "TenantLifecycleStage" NOT NULL DEFAULT 'NEW_SIGNUP',
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStartedAt" TIMESTAMP(3),
ADD COLUMN     "platformNotes" TEXT,
ADD COLUMN     "riskLevel" "TenantRiskLevel" NOT NULL DEFAULT 'LOW';

-- CreateTable
CREATE TABLE "tenant_contacts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_onboarding_tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "OnboardingTaskStatus" NOT NULL DEFAULT 'PENDING',
    "owner" TEXT,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_onboarding_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_contacts_tenantId_idx" ON "tenant_contacts"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_contacts_isPrimary_idx" ON "tenant_contacts"("isPrimary");

-- CreateIndex
CREATE INDEX "tenant_onboarding_tasks_tenantId_idx" ON "tenant_onboarding_tasks"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_onboarding_tasks_status_idx" ON "tenant_onboarding_tasks"("status");

-- CreateIndex
CREATE INDEX "tenant_onboarding_tasks_tenantId_sortOrder_idx" ON "tenant_onboarding_tasks"("tenantId", "sortOrder");

-- CreateIndex
CREATE INDEX "tenants_lifecycleStage_idx" ON "tenants"("lifecycleStage");

-- CreateIndex
CREATE INDEX "tenants_riskLevel_idx" ON "tenants"("riskLevel");

-- AddForeignKey
ALTER TABLE "tenant_contacts" ADD CONSTRAINT "tenant_contacts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_onboarding_tasks" ADD CONSTRAINT "tenant_onboarding_tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
