-- AlterTable
ALTER TABLE "provider_profiles" ADD COLUMN     "fdacsRegistrationNumber" TEXT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "odometerReading" INTEGER;

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN     "fdacsNumber" TEXT,
ADD COLUMN     "lineItems" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "odometerReading" INTEGER,
ADD COLUMN     "servicePerformed" TEXT,
ADD COLUMN     "warrantyStatement" TEXT;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "servicePerformedDescription" TEXT;
