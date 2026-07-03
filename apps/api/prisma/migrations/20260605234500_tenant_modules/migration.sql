CREATE TYPE "PlatformModuleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "TenantModuleStatus" AS ENUM ('ENABLED', 'DISABLED');

CREATE TABLE "platform_module_definitions" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'Operativa',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "PlatformModuleStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_module_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_modules" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "status" "TenantModuleStatus" NOT NULL DEFAULT 'ENABLED',
  "enabledAt" TIMESTAMP(3),
  "disabledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "tenant_modules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_module_definitions_key_key" ON "platform_module_definitions"("key");
CREATE INDEX "platform_module_definitions_status_idx" ON "platform_module_definitions"("status");
CREATE INDEX "platform_module_definitions_category_idx" ON "platform_module_definitions"("category");
CREATE UNIQUE INDEX "tenant_modules_tenantId_moduleId_key" ON "tenant_modules"("tenantId", "moduleId");
CREATE INDEX "tenant_modules_tenantId_idx" ON "tenant_modules"("tenantId");
CREATE INDEX "tenant_modules_moduleId_idx" ON "tenant_modules"("moduleId");
CREATE INDEX "tenant_modules_status_idx" ON "tenant_modules"("status");

ALTER TABLE "tenant_modules"
  ADD CONSTRAINT "tenant_modules_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_modules"
  ADD CONSTRAINT "tenant_modules_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "platform_module_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
