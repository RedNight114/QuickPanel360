-- AlterTable
ALTER TABLE "commercial_leads" ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "convertedTenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "commercial_leads_convertedTenantId_key" ON "commercial_leads"("convertedTenantId");

-- AddForeignKey
ALTER TABLE "commercial_leads" ADD CONSTRAINT "commercial_leads_convertedTenantId_fkey" FOREIGN KEY ("convertedTenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

