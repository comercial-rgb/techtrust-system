-- AlterTable: Add businessDescription to ProviderProfile
ALTER TABLE "ProviderProfile" ADD COLUMN IF NOT EXISTS "businessDescription" TEXT;
