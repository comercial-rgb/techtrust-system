-- AlterTable
ALTER TABLE "special_offers" ADD COLUMN     "fuelTypes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "serviceType" TEXT,
ADD COLUMN     "vehicleTypes" JSONB NOT NULL DEFAULT '[]';

-- CreateIndex
CREATE INDEX "special_offers_serviceType_idx" ON "special_offers"("serviceType");
