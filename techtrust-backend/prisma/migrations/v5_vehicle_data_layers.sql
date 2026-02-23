-- ============================================================
-- Migration: v5_vehicle_data_layers
-- Description: 4-Layer Vehicle Data Architecture
--   - Camada 0: NHTSA vPIC Enhanced (144 variables)
--   - Camada 1: VehicleDatabases.com (premium, future)
--   - Camada 2: PartsTech B2B (provider integration)
--   - Camada 3: Organic Catalog (internal)
--   + Mileage Reminder System
--   + Credit Monitor System
-- ============================================================

-- ─── 1. VEHICLE TABLE — Engine Details (NHTSA vPIC Extended) ───

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "engineCylinders" INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "displacementL" DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "displacementCC" DOUBLE PRECISION;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "engineHP" INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "engineConfiguration" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "turbo" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "electrificationLevel" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "engineDescription" TEXT;

-- Body Details
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "vehicleType" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "doors" INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "gvwr" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "manufacturer" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "plantCity" TEXT;

-- Fuel & Transmission Extended
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "fuelTypeSecondary" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "transmissionSpeeds" TEXT;

-- Safety (NHTSA vPIC)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "frontAirBags" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "sideAirBags" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "curtainAirBags" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "kneeAirBags" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "abs" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "esc" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "tractionControl" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "tpms" TEXT;

-- ADAS - Advanced Driver Assistance Systems (NHTSA vPIC)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "adaptiveCruiseControl" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "forwardCollisionWarning" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "blindSpotWarning" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "laneDepartureWarning" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "laneKeepingAssist" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "backupCamera" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "parkingAssist" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "rearCrossTrafficAlert" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "pedestrianAEB" TEXT;

-- vPIC decode quality
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "vpicCompleteness" INTEGER;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "vpicErrorCode" TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "vpicErrorText" TEXT;

-- Mileage Reminder
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "mileageReminderLastSentAt" TIMESTAMP(3);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS "mileageReminderStreak" INTEGER NOT NULL DEFAULT 0;


-- ─── 2. PROVIDER_PROFILES — PartsTech Integration ───

ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS "partsTechApiKey" TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS "partsTechAccountId" TEXT;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS "partsTechConnected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE provider_profiles ADD COLUMN IF NOT EXISTS "partsTechConnectedAt" TIMESTAMP(3);


-- ─── 3. USERS — Mileage Reminder Opt-Out + Last App Open ───

ALTER TABLE users ADD COLUMN IF NOT EXISTS "mileageReminderOptOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "lastAppOpenAt" TIMESTAMP(3);


-- ─── 4. NEW TABLE: quote_catalog_entries (Organic Catalog) ───

CREATE TABLE IF NOT EXISTS "quote_catalog_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleFingerprint" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "partNumber" TEXT,
    "brand" TEXT,
    "serviceType" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "minPrice" DOUBLE PRECISION NOT NULL,
    "maxPrice" DOUBLE PRECISION NOT NULL,
    "county" TEXT,
    "state" TEXT NOT NULL DEFAULT 'FL',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_catalog_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "quote_catalog_entries_vehicleFingerprint_partName_key"
    ON "quote_catalog_entries"("vehicleFingerprint", "partName");

CREATE INDEX IF NOT EXISTS "quote_catalog_entries_vehicleFingerprint_idx"
    ON "quote_catalog_entries"("vehicleFingerprint");

CREATE INDEX IF NOT EXISTS "quote_catalog_entries_partName_idx"
    ON "quote_catalog_entries"("partName");

CREATE INDEX IF NOT EXISTS "quote_catalog_entries_serviceType_idx"
    ON "quote_catalog_entries"("serviceType");


-- ─── 5. NEW TABLE: mileage_logs ───

CREATE TABLE IF NOT EXISTS "mileage_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vehicleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "previousMileage" INTEGER,

    CONSTRAINT "mileage_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "mileage_logs_vehicleId_idx"
    ON "mileage_logs"("vehicleId");

CREATE INDEX IF NOT EXISTS "mileage_logs_userId_idx"
    ON "mileage_logs"("userId");

CREATE INDEX IF NOT EXISTS "mileage_logs_createdAt_idx"
    ON "mileage_logs"("createdAt");


-- ─── 6. NEW TABLE: api_credit_logs (Credit Monitor) ───

CREATE TABLE IF NOT EXISTS "api_credit_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT NOT NULL,
    "planName" TEXT,
    "creditsTotal" INTEGER,
    "creditsLeft" INTEGER,
    "percentLeft" DOUBLE PRECISION,
    "dailyAverage" DOUBLE PRECISION,
    "daysRemaining" INTEGER,

    CONSTRAINT "api_credit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "api_credit_logs_provider_idx"
    ON "api_credit_logs"("provider");

CREATE INDEX IF NOT EXISTS "api_credit_logs_createdAt_idx"
    ON "api_credit_logs"("createdAt");


-- ─── 7. NEW TABLE: vin_decode_cache (vPIC Cache) ───

CREATE TABLE IF NOT EXISTS "vin_decode_cache" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vin" TEXT NOT NULL,
    "modelYear" INTEGER,
    "rawData" JSONB NOT NULL,
    "parsed" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'NHTSA_VPIC',
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vin_decode_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vin_decode_cache_vin_key"
    ON "vin_decode_cache"("vin");

CREATE INDEX IF NOT EXISTS "vin_decode_cache_vin_idx"
    ON "vin_decode_cache"("vin");

CREATE INDEX IF NOT EXISTS "vin_decode_cache_expiresAt_idx"
    ON "vin_decode_cache"("expiresAt");


-- ─── 8. Verify ───
-- Run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('quote_catalog_entries', 'mileage_logs', 'api_credit_logs', 'vin_decode_cache');
-- Expected: 4 rows
