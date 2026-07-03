-- Add signature and discrepancy reason fields to pos_sessions
ALTER TABLE "pos_sessions" ADD COLUMN "closingSignature" TEXT;
ALTER TABLE "pos_sessions" ADD COLUMN "discrepancyReason" TEXT;
