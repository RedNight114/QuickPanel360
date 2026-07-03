ALTER TABLE "emergency_locks"
ADD COLUMN IF NOT EXISTS "resolutionReason" TEXT;
