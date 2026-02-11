/*
  Warnings:

  - You are about to drop the column `stripeFee` on the `payments` table. All the data in the column will be lost.
  - Added the required column `processingFee` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentProcessor" AS ENUM ('STRIPE', 'CHASE');

-- CreateEnum
CREATE TYPE "SupplementStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'HOLD_PLACED', 'HOLD_FAILED', 'CAPTURED', 'VOIDED');

-- CreateEnum
CREATE TYPE "CancellationRequestStatus" AS ENUM ('REQUESTED', 'PENDING_PROVIDER_VALIDATION', 'PROVIDER_CONFIRMED_NO_COST', 'PROVIDER_REPORTED_COSTS', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SUPPLEMENT_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPLEMENT_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPLEMENT_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'INSUFFICIENT_FUNDS';
ALTER TYPE "NotificationType" ADD VALUE 'CANCELLATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'CANCELLATION_VALIDATED';
ALTER TYPE "NotificationType" ADD VALUE 'SERVICE_PHOTOS_UPLOADED';
ALTER TYPE "NotificationType" ADD VALUE 'TERMS_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'RECEIPT_GENERATED';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripeFee",
ADD COLUMN     "cardType" TEXT,
ADD COLUMN     "chaseTransactionId" TEXT,
ADD COLUMN     "parentPaymentId" TEXT,
ADD COLUMN     "paymentProcessor" "PaymentProcessor" NOT NULL DEFAULT 'STRIPE',
ADD COLUMN     "paymentType" TEXT NOT NULL DEFAULT 'SERVICE',
ADD COLUMN     "processingFee" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "clientPresent" BOOLEAN,
ADD COLUMN     "fraudDisclaimerAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "serviceApprovalSignature" TEXT,
ADD COLUMN     "serviceCompletedByProvider" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "serviceCompletionNotes" TEXT,
ADD COLUMN     "serviceLocationType" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedIp" TEXT;

-- CreateTable
CREATE TABLE "payment_supplements" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "supplementNumber" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "requestedByProviderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "additionalAmount" DECIMAL(10,2) NOT NULL,
    "additionalParts" JSONB NOT NULL DEFAULT '[]',
    "additionalLabor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "reason" TEXT,
    "status" "SupplementStatus" NOT NULL DEFAULT 'REQUESTED',
    "approvedByCustomerAt" TIMESTAMP(3),
    "rejectedByCustomerAt" TIMESTAMP(3),
    "customerNote" TEXT,
    "stripePaymentIntentId" TEXT,
    "holdPlacedAt" TIMESTAMP(3),
    "holdFailedReason" TEXT,
    "holdAmount" DECIMAL(10,2),
    "capturedAt" TIMESTAMP(3),
    "proceedWithOriginal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "payment_supplements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_requests" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "requestedByCustomerId" TEXT NOT NULL,
    "reason" TEXT,
    "status" "CancellationRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerValidation" TEXT,
    "providerHasIncurredCosts" BOOLEAN,
    "providerReportedCosts" DECIMAL(10,2),
    "providerEvidencePhotos" JSONB NOT NULL DEFAULT '[]',
    "providerValidatedAt" TIMESTAMP(3),
    "cancellationFeePercent" DECIMAL(5,2),
    "cancellationFeeAmount" DECIMAL(10,2),
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipts" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receiptNumber" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerBusinessName" TEXT,
    "serviceDescription" TEXT NOT NULL,
    "vehicleInfo" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "processingFee" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "supplementsTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "paymentProcessor" "PaymentProcessor" NOT NULL,
    "paymentMethodInfo" TEXT NOT NULL,
    "termsAcceptedAt" TIMESTAMP(3),
    "fraudDisclaimerAcceptedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_supplements_supplementNumber_key" ON "payment_supplements"("supplementNumber");

-- CreateIndex
CREATE INDEX "payment_supplements_workOrderId_idx" ON "payment_supplements"("workOrderId");

-- CreateIndex
CREATE INDEX "payment_supplements_status_idx" ON "payment_supplements"("status");

-- CreateIndex
CREATE INDEX "cancellation_requests_workOrderId_idx" ON "cancellation_requests"("workOrderId");

-- CreateIndex
CREATE INDEX "cancellation_requests_status_idx" ON "cancellation_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_receiptNumber_key" ON "receipts"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "receipts_paymentId_key" ON "receipts"("paymentId");

-- CreateIndex
CREATE INDEX "receipts_paymentId_idx" ON "receipts"("paymentId");

-- AddForeignKey
ALTER TABLE "payment_supplements" ADD CONSTRAINT "payment_supplements_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
