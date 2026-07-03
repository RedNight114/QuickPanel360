CREATE TYPE "PlatformInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');
CREATE TYPE "PlatformPaymentStatus" AS ENUM ('PAID', 'REFUNDED');

CREATE TABLE "platform_invoices" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "status" "PlatformInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_payments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "invoiceId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "method" TEXT,
  "reference" TEXT,
  "status" "PlatformPaymentStatus" NOT NULL DEFAULT 'PAID',
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_invoices_number_key" ON "platform_invoices"("number");
CREATE INDEX "platform_invoices_tenantId_idx" ON "platform_invoices"("tenantId");
CREATE INDEX "platform_invoices_status_idx" ON "platform_invoices"("status");
CREATE INDEX "platform_invoices_issuedAt_idx" ON "platform_invoices"("issuedAt");
CREATE INDEX "platform_payments_tenantId_idx" ON "platform_payments"("tenantId");
CREATE INDEX "platform_payments_invoiceId_idx" ON "platform_payments"("invoiceId");
CREATE INDEX "platform_payments_status_idx" ON "platform_payments"("status");
CREATE INDEX "platform_payments_paidAt_idx" ON "platform_payments"("paidAt");

ALTER TABLE "platform_invoices" ADD CONSTRAINT "platform_invoices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_payments" ADD CONSTRAINT "platform_payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "platform_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
