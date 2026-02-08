-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "holderName" TEXT,
ADD COLUMN     "pixKey" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'credit',
ALTER COLUMN "stripePaymentMethodId" DROP NOT NULL;
