-- Phase 1 enum additions. Kept separate because PostgreSQL cannot use new enum
-- values in the same transaction where they are added.

ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'SALE_CASH_IN';
ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'RECEIVABLE_CASH_IN';
ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'THIRD_PARTY_CASH_OUT';
ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';
ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'CORRECTION_IN';
ALTER TYPE "CashMovementType" ADD VALUE IF NOT EXISTS 'CORRECTION_OUT';

ALTER TYPE "ReceivableStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
ALTER TYPE "ReceivableStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
