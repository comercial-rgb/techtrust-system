-- AlterTable quotes: add FDACS estimate fields
ALTER TABLE "quotes" ADD COLUMN     "appointmentId" TEXT,
ADD COLUMN     "customerResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerResponsibilityAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "diagnosticFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "diagnosticFeeWaived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimateNumber" TEXT,
ADD COLUMN     "estimateType" "EstimateType" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "originalEstimateId" TEXT;

-- AlterTable service_requests: customer responsibility
ALTER TABLE "service_requests" ADD COLUMN     "customerResponsibilityAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerResponsibilityAcceptedAt" TIMESTAMP(3);

-- CreateTable appointments
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "appointmentNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "serviceRequestId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT,
    "estimatedDuration" TEXT,
    "serviceDescription" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'DIAGNOSTIC',
    "locationType" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "diagnosticFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "travelFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "feeWaivedOnService" BOOLEAN NOT NULL DEFAULT true,
    "stripePaymentIntentId" TEXT,
    "paymentMethodVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "providerCheckedInAt" TIMESTAMP(3),
    "customerConfirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "customerNotes" TEXT,
    "providerNotes" TEXT,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable estimate_shares
CREATE TABLE "estimate_shares" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shareNumber" TEXT NOT NULL,
    "originalEstimateId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "shareType" TEXT NOT NULL,
    "targetProviderIds" JSONB NOT NULL DEFAULT '[]',
    "cityFilter" TEXT,
    "stateFilter" TEXT,
    "radiusKm" INTEGER,
    "shareOriginalProviderName" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "competingEstimatesCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "estimate_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable repair_invoices
CREATE TABLE "repair_invoices" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerContact" TEXT,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerBusinessName" TEXT,
    "fdacsRegistrationNumber" TEXT,
    "vehicleInfo" TEXT NOT NULL,
    "odometerReading" INTEGER,
    "originalPartsCost" DECIMAL(10,2) NOT NULL,
    "originalLaborCost" DECIMAL(10,2) NOT NULL,
    "originalTravelFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "originalTaxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "originalTotal" DECIMAL(10,2) NOT NULL,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "approvedSupplements" JSONB NOT NULL DEFAULT '[]',
    "rejectedSupplements" JSONB NOT NULL DEFAULT '[]',
    "supplementsTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalPartsCost" DECIMAL(10,2) NOT NULL,
    "finalLaborCost" DECIMAL(10,2) NOT NULL,
    "finalTotal" DECIMAL(10,2) NOT NULL,
    "servicePerformed" TEXT,
    "warrantyStatement" TEXT,
    "warrantyMonths" INTEGER,
    "warrantyMileage" INTEGER,
    "diagnosticFee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "diagnosticFeeWaived" BOOLEAN NOT NULL DEFAULT false,
    "status" "RepairInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerAcceptedAt" TIMESTAMP(3),
    "customerSignature" TEXT,
    "completedAt" TIMESTAMP(3),
    "pdfUrl" TEXT,
    CONSTRAINT "repair_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex appointments
CREATE UNIQUE INDEX "appointments_appointmentNumber_key" ON "appointments"("appointmentNumber");
CREATE INDEX "appointments_customerId_idx" ON "appointments"("customerId");
CREATE INDEX "appointments_providerId_idx" ON "appointments"("providerId");
CREATE INDEX "appointments_vehicleId_idx" ON "appointments"("vehicleId");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE INDEX "appointments_scheduledDate_idx" ON "appointments"("scheduledDate");

-- CreateIndex estimate_shares
CREATE UNIQUE INDEX "estimate_shares_shareNumber_key" ON "estimate_shares"("shareNumber");
CREATE INDEX "estimate_shares_originalEstimateId_idx" ON "estimate_shares"("originalEstimateId");
CREATE INDEX "estimate_shares_customerId_idx" ON "estimate_shares"("customerId");
CREATE INDEX "estimate_shares_shareType_idx" ON "estimate_shares"("shareType");
CREATE INDEX "estimate_shares_isActive_idx" ON "estimate_shares"("isActive");

-- CreateIndex repair_invoices
CREATE UNIQUE INDEX "repair_invoices_invoiceNumber_key" ON "repair_invoices"("invoiceNumber");
CREATE UNIQUE INDEX "repair_invoices_quoteId_key" ON "repair_invoices"("quoteId");
CREATE UNIQUE INDEX "repair_invoices_workOrderId_key" ON "repair_invoices"("workOrderId");
CREATE INDEX "repair_invoices_quoteId_idx" ON "repair_invoices"("quoteId");
CREATE INDEX "repair_invoices_workOrderId_idx" ON "repair_invoices"("workOrderId");
CREATE INDEX "repair_invoices_customerId_idx" ON "repair_invoices"("customerId");
CREATE INDEX "repair_invoices_providerId_idx" ON "repair_invoices"("providerId");
CREATE INDEX "repair_invoices_status_idx" ON "repair_invoices"("status");
CREATE INDEX "repair_invoices_invoiceNumber_idx" ON "repair_invoices"("invoiceNumber");

-- CreateIndex quotes
CREATE UNIQUE INDEX "quotes_estimateNumber_key" ON "quotes"("estimateNumber");
CREATE INDEX "quotes_estimateNumber_idx" ON "quotes"("estimateNumber");

-- AddForeignKey quotes
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_originalEstimateId_fkey" FOREIGN KEY ("originalEstimateId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey appointments
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey estimate_shares
ALTER TABLE "estimate_shares" ADD CONSTRAINT "estimate_shares_originalEstimateId_fkey" FOREIGN KEY ("originalEstimateId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey repair_invoices
ALTER TABLE "repair_invoices" ADD CONSTRAINT "repair_invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_invoices" ADD CONSTRAINT "repair_invoices_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
