-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "baseLatitude" DECIMAL(10,8),
ADD COLUMN     "baseLongitude" DECIMAL(11,8),
ADD COLUMN     "extraFeePerKm" DECIMAL(6,2) NOT NULL DEFAULT 0,
ADD COLUMN     "freeKm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "mobileService" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "roadsideAssistance" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "distanceKm" DECIMAL(7,2),
ADD COLUMN     "travelFee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "locationType" TEXT,
ADD COLUMN     "serviceLatitude" DECIMAL(10,8),
ADD COLUMN     "serviceLongitude" DECIMAL(11,8);

-- CreateTable
CREATE TABLE "coverage_zones" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "polygonCoordinates" JSONB,

    CONSTRAINT "coverage_zones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coverage_zones_providerId_idx" ON "coverage_zones"("providerId");

-- CreateIndex
CREATE INDEX "coverage_zones_active_idx" ON "coverage_zones"("active");
