-- AlterTable: Add sales tax fields to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesTaxAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesTaxRate" DECIMAL(5,4) DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesTaxableAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesTaxCounty" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "salesTaxState" TEXT DEFAULT 'FL';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "stripeTaxCalculationId" TEXT;

-- AlterTable: Add sales tax fields to receipts
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "salesTaxAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "salesTaxRate" DECIMAL(5,4) DEFAULT 0;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "salesTaxableAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "salesTaxCounty" TEXT;
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "salesTaxState" TEXT DEFAULT 'FL';
