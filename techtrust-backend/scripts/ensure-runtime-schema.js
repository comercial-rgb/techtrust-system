const { PrismaClient } = require("@prisma/client");

// Use connection_limit=1 — this script only needs one connection for DDL
const dbUrl = process.env.DATABASE_URL || '';
const scriptUrl = dbUrl + (dbUrl.includes('?') ? '&' : '?') + 'connection_limit=1';
const prisma = new PrismaClient({ datasources: { db: { url: scriptUrl } } });

async function main() {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "BusinessType" AS ENUM ('REPAIR_SHOP', 'CAR_WASH', 'AUTO_PARTS', 'BOTH');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ProviderPublicStatus" AS ENUM ('VERIFIED', 'PENDING', 'RESTRICTED', 'NOT_ELIGIBLE');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "ProviderLevel" AS ENUM ('ENTRY', 'INTERMEDIATE', 'ADVANCED', 'PREMIUM_TIER');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "EntityType" AS ENUM ('LLC', 'CORP', 'SOLE_PROP', 'PARTNERSHIP', 'OTHER_ENTITY');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "address" TEXT,
      ADD COLUMN IF NOT EXISTS "city" TEXT,
      ADD COLUMN IF NOT EXISTS "state" TEXT,
      ADD COLUMN IF NOT EXISTS "zipCode" TEXT,
      ADD COLUMN IF NOT EXISTS "addressesJson" JSONB,
      ADD COLUMN IF NOT EXISTS "preferencesJson" JSONB;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "provider_profiles"
      ADD COLUMN IF NOT EXISTS "legalName" TEXT,
      ADD COLUMN IF NOT EXISTS "dbaName" TEXT,
      ADD COLUMN IF NOT EXISTS "ein" TEXT,
      ADD COLUMN IF NOT EXISTS "entityType" "EntityType",
      ADD COLUMN IF NOT EXISTS "businessTypeCat" "BusinessType" NOT NULL DEFAULT 'REPAIR_SHOP',
      ADD COLUMN IF NOT EXISTS "sunbizDocumentNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "businessIdentityStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
      ADD COLUMN IF NOT EXISTS "businessIdentityVerifiedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "fdacsRegistrationNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "contactName" TEXT,
      ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
      ADD COLUMN IF NOT EXISTS "county" TEXT,
      ADD COLUMN IF NOT EXISTS "insideCityLimits" BOOLEAN,
      ADD COLUMN IF NOT EXISTS "baseLatitude" DECIMAL(10,8),
      ADD COLUMN IF NOT EXISTS "baseLongitude" DECIMAL(11,8),
      ADD COLUMN IF NOT EXISTS "servicesOffered" JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "vehicleTypesServed" JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "sellsParts" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "partsTechApiKey" TEXT,
      ADD COLUMN IF NOT EXISTS "partsTechAccountId" TEXT,
      ADD COLUMN IF NOT EXISTS "partsTechConnected" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "partsTechConnectedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "mobileService" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "roadsideAssistance" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "freeKm" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "extraFeePerKm" DECIMAL(6,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "businessDescription" TEXT,
      ADD COLUMN IF NOT EXISTS "payoutMethod" TEXT NOT NULL DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS "zelleEmail" TEXT,
      ADD COLUMN IF NOT EXISTS "zellePhone" TEXT,
      ADD COLUMN IF NOT EXISTS "bankTransferLabel" TEXT,
      ADD COLUMN IF NOT EXISTS "bankAccountType" TEXT,
      ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "bankRoutingNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "payoutInstructions" TEXT,
      ADD COLUMN IF NOT EXISTS "marketplaceFacilitatorTaxAcknowledged" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "cityBusinessTaxReceiptNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "countyBusinessTaxReceiptNumber" TEXT,
      ADD COLUMN IF NOT EXISTS "businessTaxReceiptStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
      ADD COLUMN IF NOT EXISTS "insuranceDisclosureAcceptedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "insuranceDisclosureDeclinedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "providerPublicStatus" "ProviderPublicStatus" NOT NULL DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "providerInternalNotes" TEXT,
      ADD COLUMN IF NOT EXISTS "reputationPoints" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "noShowCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT,
      ADD COLUMN IF NOT EXISTS "providerLevel" "ProviderLevel" NOT NULL DEFAULT 'ENTRY',
      ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 15,
      ADD COLUMN IF NOT EXISTS "levelCalculatedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "serviceCounties" JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
      ADD COLUMN IF NOT EXISTS "lastOnlineAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "sosRateCard" JSONB NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "travelChargeType" TEXT NOT NULL DEFAULT 'ONE_WAY';
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "service_requests"
      ADD COLUMN IF NOT EXISTS "sosStatus" TEXT,
      ADD COLUMN IF NOT EXISTS "sosOfferedPrice" DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS "sosAcceptedByProviderId" TEXT,
      ADD COLUMN IF NOT EXISTS "sosAcceptedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "sosConfirmDeadline" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "sosConfirmedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "sosNoProviderAt" TIMESTAMP(3);
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "provider_profiles_providerPublicStatus_idx"
    ON "provider_profiles"("providerPublicStatus");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "provider_profiles_availabilityStatus_idx"
    ON "provider_profiles"("availabilityStatus");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "service_requests_sosStatus_idx"
    ON "service_requests"("sosStatus") WHERE "sosStatus" IS NOT NULL;
  `);

  console.log("Runtime schema guard applied.");
}

main()
  .catch((error) => {
    // All DDL in this script uses IF NOT EXISTS / exception guards — it is safe
    // to skip on connection failure (schema was already applied in a previous deploy).
    // Log as warning and continue so the server can start.
    console.warn("Runtime schema guard skipped (DB unavailable):", error.message);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
