-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('CASH', 'CREDIT', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PAID', 'PARTIAL', 'PENDING');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PAID', 'CANCELLED');

-- AlterTable
ALTER TABLE "cash_movements" ADD COLUMN     "saleId" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amountPending" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "saleType" "SaleType" NOT NULL DEFAULT 'CASH',
ADD COLUMN     "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PAID';

-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amountOriginal" DECIMAL(10,2) NOT NULL,
    "amountPending" DECIMAL(10,2) NOT NULL,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "receivables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receivables_saleId_key" ON "receivables"("saleId");

-- CreateIndex
CREATE INDEX "receivables_tenantId_idx" ON "receivables"("tenantId");

-- CreateIndex
CREATE INDEX "receivables_memberId_idx" ON "receivables"("memberId");

-- CreateIndex
CREATE INDEX "receivables_status_idx" ON "receivables"("status");

-- CreateIndex
CREATE INDEX "receivables_createdAt_idx" ON "receivables"("createdAt");

-- CreateIndex
CREATE INDEX "cash_movements_saleId_idx" ON "cash_movements"("saleId");

-- CreateIndex
CREATE INDEX "sales_settlementStatus_idx" ON "sales"("settlementStatus");

-- CreateIndex
CREATE INDEX "sales_saleType_idx" ON "sales"("saleType");

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
