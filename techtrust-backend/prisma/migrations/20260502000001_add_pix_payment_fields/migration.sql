-- ============================================================
-- Migration: add_pix_payment_fields
-- PIX support for Brazilian users traveling in the USA.
-- Payments are made in BRL and converted to USD at checkout.
-- ============================================================

-- PaymentMethod: PIX key type + user country restriction
ALTER TABLE "payment_methods"
  ADD COLUMN IF NOT EXISTS "pixKeyType"   TEXT,
  ADD COLUMN IF NOT EXISTS "userCountry"  TEXT NOT NULL DEFAULT 'US';

-- Payment: PIX-specific fields (BRL→USD conversion trail)
ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "pixAmountBrl"    DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "pixExchangeRate" DECIMAL(10,6),
  ADD COLUMN IF NOT EXISTS "pixPaymentId"    TEXT,
  ADD COLUMN IF NOT EXISTS "pixQrCode"       TEXT,
  ADD COLUMN IF NOT EXISTS "pixCopyPaste"    TEXT,
  ADD COLUMN IF NOT EXISTS "pixExpiresAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pixPaidAt"       TIMESTAMP(3);

-- Allow cardType to carry 'pix' value (column already exists as TEXT)
-- No schema change needed; existing constraint is open-ended.

-- Index for fast PIX payment lookup by external gateway ID
CREATE INDEX IF NOT EXISTS "payments_pixPaymentId_idx" ON "payments"("pixPaymentId");
