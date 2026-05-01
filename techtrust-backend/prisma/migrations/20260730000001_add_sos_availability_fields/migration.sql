-- Add SOS availability and rate card fields to provider_profiles
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "availabilityStatus" TEXT NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN IF NOT EXISTS "lastOnlineAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sosRateCard" JSONB NOT NULL DEFAULT '{}';
