-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "accentColor" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "locale" TEXT NOT NULL DEFAULT 'es-ES',
    "timezone" TEXT NOT NULL DEFAULT 'Atlantic/Canary',
    "allowCreditSales" BOOLEAN NOT NULL DEFAULT true,
    "requireCreditReason" BOOLEAN NOT NULL DEFAULT true,
    "allowSpecialSales" BOOLEAN NOT NULL DEFAULT false,
    "requireCashCloseConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "autoGenerateMemberNumber" BOOLEAN NOT NULL DEFAULT false,
    "memberNumberPrefix" TEXT,
    "minimumMemberAge" INTEGER,
    "showSecurityBadges" BOOLEAN NOT NULL DEFAULT true,
    "requireAccessLink" BOOLEAN NOT NULL DEFAULT true,
    "allowCashDiscrepancyClose" BOOLEAN NOT NULL DEFAULT true,
    "requireCashDiscrepancyReason" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenantId_key" ON "tenant_settings"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
