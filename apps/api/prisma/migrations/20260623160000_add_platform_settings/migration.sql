-- Platform settings singleton table
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "platformName" TEXT NOT NULL DEFAULT 'QuickPanel360',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "supportEmail" TEXT NOT NULL DEFAULT '',
    "logoUrl" TEXT NOT NULL DEFAULT '',
    "defaultLocale" TEXT NOT NULL DEFAULT 'es',
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "notifyNewLead" BOOLEAN NOT NULL DEFAULT true,
    "notifyEmergency" BOOLEAN NOT NULL DEFAULT true,
    "notifyPaymentOverdue" BOOLEAN NOT NULL DEFAULT true,
    "notifyTrialExpiring" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewTenant" BOOLEAN NOT NULL DEFAULT true,
    "notifySuspension" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT false,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "requireStrongPasswords" BOOLEAN NOT NULL DEFAULT true,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "defaultCurrency" TEXT NOT NULL DEFAULT 'CR',
    "platformLegalName" TEXT NOT NULL DEFAULT '',
    "platformTaxId" TEXT NOT NULL DEFAULT '',
    "platformAddress" TEXT NOT NULL DEFAULT '',
    "platformCity" TEXT NOT NULL DEFAULT '',
    "platformCountry" TEXT NOT NULL DEFAULT 'ES',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Insert default singleton row
INSERT INTO "platform_settings" ("id", "updatedAt") VALUES ('singleton', NOW());
