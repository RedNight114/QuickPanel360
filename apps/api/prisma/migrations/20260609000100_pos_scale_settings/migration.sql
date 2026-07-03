-- CreateEnum
CREATE TYPE "ScaleToleranceAction" AS ENUM ('BLOCK', 'REQUIRE_MANAGER_CONFIRMATION', 'ALLOW_WITH_WARNING');

-- AlterTable
ALTER TABLE "tenant_settings"
ADD COLUMN "scaleVerificationEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "requireScaleVerification" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "maxWastePerLineGrams" DECIMAL(10,3) NOT NULL DEFAULT 0.05,
ADD COLUMN "maxWastePercent" DECIMAL(6,2) NOT NULL DEFAULT 5,
ADD COLUMN "scaleToleranceAction" "ScaleToleranceAction" NOT NULL DEFAULT 'BLOCK',
ADD COLUMN "allowUnderWeight" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scalePrecisionGrams" DECIMAL(10,3) NOT NULL DEFAULT 0.01,
ADD COLUMN "autoRegisterScaleWaste" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "scaleWasteReason" TEXT NOT NULL DEFAULT 'Diferencia por peso real en báscula',
ADD COLUMN "showScaleStepOnMobile" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sale_items"
ADD COLUMN "actualWeight" DECIMAL(12,6),
ADD COLUMN "weightDifference" DECIMAL(12,6),
ADD COLUMN "wasteQuantity" DECIMAL(12,6),
ADD COLUMN "scaleVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scaleVerifiedAt" TIMESTAMP(3),
ADD COLUMN "scaleVerifiedById" TEXT,
ADD COLUMN "scaleToleranceExceeded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "scaleOverrideReason" TEXT,
ADD COLUMN "scaleOverrideById" TEXT;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_scaleVerifiedById_fkey" FOREIGN KEY ("scaleVerifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_scaleOverrideById_fkey" FOREIGN KEY ("scaleOverrideById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
