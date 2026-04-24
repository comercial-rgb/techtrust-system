ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "zelleEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "zellePhone" TEXT,
  ADD COLUMN IF NOT EXISTS "bankTransferLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "payoutInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "marketplaceFacilitatorTaxAcknowledged" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "cityBusinessTaxReceiptNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "countyBusinessTaxReceiptNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "businessTaxReceiptStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
  ADD COLUMN IF NOT EXISTS "insuranceDisclosureAcceptedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "insuranceDisclosureDeclinedAt" TIMESTAMP(3);
