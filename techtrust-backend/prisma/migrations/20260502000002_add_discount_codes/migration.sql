-- CreateTable: discount_codes
-- Promo/coupon codes applied at quote approval time
CREATE TABLE "discount_codes" (
    "id"             TEXT           NOT NULL,
    "createdAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "code"           TEXT           NOT NULL,
    "description"    TEXT,
    "type"           TEXT           NOT NULL,   -- 'PERCENTAGE' | 'FIXED'
    "value"          DECIMAL(10,2)  NOT NULL,
    "minOrderAmount" DECIMAL(10,2),
    "maxUses"        INTEGER,
    "usedCount"      INTEGER        NOT NULL DEFAULT 0,
    "expiresAt"      TIMESTAMP(3),
    "applicablePlans" TEXT[]        NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isActive"       BOOLEAN        NOT NULL DEFAULT true,

    CONSTRAINT "discount_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "discount_codes_code_key"     ON "discount_codes"("code");
CREATE INDEX        "discount_codes_code_idx"     ON "discount_codes"("code");
CREATE INDEX        "discount_codes_isActive_idx" ON "discount_codes"("isActive");
