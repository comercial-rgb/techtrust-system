-- DropIndex
DROP INDEX "vehicles_userId_plateNumber_key";

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "bodyType" TEXT,
ADD COLUMN     "engineType" TEXT,
ADD COLUMN     "fuelType" TEXT,
ADD COLUMN     "plateState" TEXT,
ADD COLUMN     "trim" TEXT,
ADD COLUMN     "vinDecoded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vinDecodedAt" TIMESTAMP(3),
ALTER COLUMN "plateNumber" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "vehicles_vin_idx" ON "vehicles"("vin");
