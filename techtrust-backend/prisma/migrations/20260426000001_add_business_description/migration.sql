-- AlterTable: Add businessDescription to provider_profiles
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "businessDescription" TEXT;
