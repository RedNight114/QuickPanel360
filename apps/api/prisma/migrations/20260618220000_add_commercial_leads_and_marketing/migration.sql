-- Add marketing fields to platform_plans
ALTER TABLE "platform_plans" ADD COLUMN "priceAnnual" DECIMAL(10,2);
ALTER TABLE "platform_plans" ADD COLUMN "publicVisible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "platform_plans" ADD COLUMN "marketingTitle" TEXT;
ALTER TABLE "platform_plans" ADD COLUMN "marketingDescription" TEXT;
ALTER TABLE "platform_plans" ADD COLUMN "isRecommended" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "platform_plans" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "platform_plans" ADD COLUMN "ctaLabel" TEXT;
ALTER TABLE "platform_plans" ADD COLUMN "offerLabel" TEXT;
ALTER TABLE "platform_plans" ADD COLUMN "offerEndsAt" TIMESTAMP(3);

CREATE INDEX "platform_plans_publicVisible_idx" ON "platform_plans"("publicVisible");

-- Create enum types
CREATE TYPE "CommercialLeadStatus" AS ENUM ('NEW', 'IN_REVIEW', 'WAITING_PAYMENT', 'APPROVED', 'REJECTED', 'ACCESS_SENT', 'ARCHIVED');
CREATE TYPE "CommercialLeadPaymentStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- Create commercial_leads table
CREATE TABLE "commercial_leads" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "companyName" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'ES',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'es',
    "requestedPlanId" TEXT,
    "estimatedUsers" INTEGER,
    "message" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'landing',
    "status" "CommercialLeadStatus" NOT NULL DEFAULT 'NEW',
    "paymentStatus" "CommercialLeadPaymentStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "assignedToId" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_leads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_leads_status_idx" ON "commercial_leads"("status");
CREATE INDEX "commercial_leads_email_idx" ON "commercial_leads"("email");
CREATE INDEX "commercial_leads_createdAt_idx" ON "commercial_leads"("createdAt");

ALTER TABLE "commercial_leads" ADD CONSTRAINT "commercial_leads_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "platform_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commercial_leads" ADD CONSTRAINT "commercial_leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commercial_leads" ADD CONSTRAINT "commercial_leads_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
