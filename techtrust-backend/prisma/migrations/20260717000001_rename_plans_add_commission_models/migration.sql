-- ============================================
-- Migration: Rename subscription plans + add commission models
-- FREE/BASIC/PREMIUM/ENTERPRISE → FREE/STARTER/PRO/ENTERPRISE
-- Add: ProviderLevel enum, ServiceBalance, VehicleAddOn, provider commission fields
-- ============================================

-- 1. Create ProviderLevel enum
CREATE TYPE "ProviderLevel" AS ENUM ('ENTRY', 'INTERMEDIATE', 'ADVANCED', 'PREMIUM_TIER');

-- 2. Rename subscription plan enum values (BASIC→STARTER, PREMIUM→PRO)
-- Must update existing rows first, then alter the enum
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'PRO';

-- Update existing subscriptions from old to new plan names
UPDATE "subscriptions" SET "plan" = 'STARTER' WHERE "plan" = 'BASIC';
UPDATE "subscriptions" SET "plan" = 'PRO' WHERE "plan" = 'PREMIUM';

-- Update subscription plan templates
UPDATE "subscription_plan_templates" SET "planKey" = 'starter' WHERE "planKey" = 'basic';
UPDATE "subscription_plan_templates" SET "planKey" = 'pro' WHERE "planKey" = 'premium';

-- 3. Add provider commission fields to provider_profiles
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "providerLevel" "ProviderLevel" NOT NULL DEFAULT 'ENTRY';
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 15;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "levelCalculatedAt" TIMESTAMP(3);

-- 4. Create service_balances table
CREATE TABLE IF NOT EXISTS "service_balances" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL DEFAULT 0,
    "usedCredits" INTEGER NOT NULL DEFAULT 0,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_balances_pkey" PRIMARY KEY ("id")
);

-- 5. Create vehicle_add_ons table
CREATE TABLE IF NOT EXISTS "vehicle_add_ons" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(10,2) NOT NULL DEFAULT 6.99,
    "stripeSubscriptionItemId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_add_ons_pkey" PRIMARY KEY ("id")
);

-- 6. Create indexes
CREATE INDEX IF NOT EXISTS "service_balances_userId_idx" ON "service_balances"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "service_balances_subscriptionId_serviceType_key" ON "service_balances"("subscriptionId", "serviceType");

CREATE INDEX IF NOT EXISTS "vehicle_add_ons_userId_idx" ON "vehicle_add_ons"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_add_ons_subscriptionId_vehicleId_key" ON "vehicle_add_ons"("subscriptionId", "vehicleId");

-- 7. Add foreign keys
ALTER TABLE "service_balances" ADD CONSTRAINT "service_balances_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_balances" ADD CONSTRAINT "service_balances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vehicle_add_ons" ADD CONSTRAINT "vehicle_add_ons_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_add_ons" ADD CONSTRAINT "vehicle_add_ons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_add_ons" ADD CONSTRAINT "vehicle_add_ons_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
