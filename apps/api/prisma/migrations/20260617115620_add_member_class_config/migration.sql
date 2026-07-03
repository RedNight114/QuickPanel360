-- DropForeignKey
ALTER TABLE "receivables" DROP CONSTRAINT "receivables_saleId_fkey";

-- AlterTable
ALTER TABLE "member_class_benefits" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "tenant_settings" ADD COLUMN     "requireMemberPhoto" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "member_class_config" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "memberClass" "MemberClass" NOT NULL DEFAULT 'STANDARD',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "suggestedBonification" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "birthdayBonification" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "requirePhoto" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_class_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "member_class_config_tenantId_idx" ON "member_class_config"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "member_class_config_tenantId_memberClass_key" ON "member_class_config"("tenantId", "memberClass");

-- AddForeignKey
ALTER TABLE "member_class_config" ADD CONSTRAINT "member_class_config_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant_settings"("tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
