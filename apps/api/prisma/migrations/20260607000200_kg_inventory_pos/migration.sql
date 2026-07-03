ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'KG';

DO $$
BEGIN
  CREATE TYPE "SaleItemPricingMode" AS ENUM ('BY_UNIT', 'BY_WEIGHT', 'BY_AMOUNT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sale_items"
  ADD COLUMN IF NOT EXISTS "pricingMode" "SaleItemPricingMode" NOT NULL DEFAULT 'BY_UNIT',
  ADD COLUMN IF NOT EXISTS "requestedAmount" DECIMAL(10, 2);

ALTER TABLE "sale_items"
  ALTER COLUMN "quantity" TYPE DECIMAL(12, 6);

ALTER TABLE "inventory_movements"
  ALTER COLUMN "quantity" TYPE DECIMAL(12, 6),
  ALTER COLUMN "previousQuantity" TYPE DECIMAL(12, 6),
  ALTER COLUMN "newQuantity" TYPE DECIMAL(12, 6);
