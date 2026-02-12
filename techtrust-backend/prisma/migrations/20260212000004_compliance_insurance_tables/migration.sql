-- Migration: Provider Compliance & Insurance tables + ProviderProfile updates

-- =============================================
-- 1. Update provider_profiles table
-- =============================================
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "legalName" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "dbaName" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "ein" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "entityType" "EntityType";
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "contactName" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "county" TEXT;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "insideCityLimits" BOOLEAN;
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "servicesOffered" JSONB DEFAULT '[]';
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "providerPublicStatus" "ProviderPublicStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "provider_profiles" ADD COLUMN IF NOT EXISTS "providerInternalNotes" TEXT;

-- Set default state to FL if not already
ALTER TABLE "provider_profiles" ALTER COLUMN "state" SET DEFAULT 'FL';

-- Index for new status field
CREATE INDEX IF NOT EXISTS "provider_profiles_providerPublicStatus_idx" ON "provider_profiles"("providerPublicStatus");

-- =============================================
-- 2. Create compliance_items table
-- =============================================
CREATE TABLE IF NOT EXISTS "compliance_items" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "type" "ComplianceType" NOT NULL,
    "status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "licenseNumber" TEXT,
    "issuingAuthority" TEXT,
    "issueDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "documentUploads" JSONB DEFAULT '[]',
    "lastVerifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verificationMethod" "VerificationMethod",
    "verificationNotes" TEXT,
    "technicianId" TEXT,

    CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "compliance_items_providerProfileId_type_technicianId_key" ON "compliance_items"("providerProfileId", "type", "technicianId");
CREATE INDEX IF NOT EXISTS "compliance_items_providerProfileId_idx" ON "compliance_items"("providerProfileId");
CREATE INDEX IF NOT EXISTS "compliance_items_type_idx" ON "compliance_items"("type");
CREATE INDEX IF NOT EXISTS "compliance_items_status_idx" ON "compliance_items"("status");
CREATE INDEX IF NOT EXISTS "compliance_items_expirationDate_idx" ON "compliance_items"("expirationDate");

ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 3. Create technicians table
-- =============================================
CREATE TABLE IF NOT EXISTS "technicians" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "role" "TechnicianRole" NOT NULL DEFAULT 'TECH',
    "epa609Status" "ComplianceStatus" NOT NULL DEFAULT 'NOT_PROVIDED',
    "epa609CertNumber" TEXT,
    "epa609IssuingOrg" TEXT,
    "epa609IssueDate" TIMESTAMP(3),
    "epa609ExpirationDate" TIMESTAMP(3),
    "epa609Uploads" JSONB DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "technicians_providerProfileId_idx" ON "technicians"("providerProfileId");
CREATE INDEX IF NOT EXISTS "technicians_epa609Status_idx" ON "technicians"("epa609Status");

ALTER TABLE "technicians" ADD CONSTRAINT "technicians_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK from compliance_items to technicians (for EPA_609 items)
ALTER TABLE "compliance_items" ADD CONSTRAINT "compliance_items_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- 4. Create insurance_policies table
-- =============================================
CREATE TABLE IF NOT EXISTS "insurance_policies" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "providerProfileId" TEXT NOT NULL,
    "type" "InsurancePolicyType" NOT NULL,
    "hasCoverage" BOOLEAN NOT NULL DEFAULT false,
    "status" "InsurancePolicyStatus" NOT NULL DEFAULT 'INS_NOT_PROVIDED',
    "carrierName" TEXT,
    "policyNumber" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "coverageLimit" TEXT,
    "deductible" TEXT,
    "coiUploads" JSONB DEFAULT '[]',
    "lastVerifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verificationNotes" TEXT,

    CONSTRAINT "insurance_policies_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "insurance_policies_providerProfileId_type_key" ON "insurance_policies"("providerProfileId", "type");
CREATE INDEX IF NOT EXISTS "insurance_policies_providerProfileId_idx" ON "insurance_policies"("providerProfileId");
CREATE INDEX IF NOT EXISTS "insurance_policies_type_idx" ON "insurance_policies"("type");
CREATE INDEX IF NOT EXISTS "insurance_policies_status_idx" ON "insurance_policies"("status");
CREATE INDEX IF NOT EXISTS "insurance_policies_expirationDate_idx" ON "insurance_policies"("expirationDate");

ALTER TABLE "insurance_policies" ADD CONSTRAINT "insurance_policies_providerProfileId_fkey" FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 5. Create user_risk_acceptance_logs table
-- =============================================
CREATE TABLE IF NOT EXISTS "user_risk_acceptance_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "disclaimerVersion" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" TEXT,
    "disclaimerTextShown" TEXT NOT NULL,

    CONSTRAINT "user_risk_acceptance_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "user_risk_acceptance_logs_userId_idx" ON "user_risk_acceptance_logs"("userId");
CREATE INDEX IF NOT EXISTS "user_risk_acceptance_logs_providerId_idx" ON "user_risk_acceptance_logs"("providerId");
CREATE INDEX IF NOT EXISTS "user_risk_acceptance_logs_createdAt_idx" ON "user_risk_acceptance_logs"("createdAt");

ALTER TABLE "user_risk_acceptance_logs" ADD CONSTRAINT "user_risk_acceptance_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 6. Create verification_logs table
-- =============================================
CREATE TABLE IF NOT EXISTS "verification_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" "VerificationEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "verifiedByUserId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "verification_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "verification_logs_entityType_entityId_idx" ON "verification_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "verification_logs_verifiedByUserId_idx" ON "verification_logs"("verifiedByUserId");
CREATE INDEX IF NOT EXISTS "verification_logs_createdAt_idx" ON "verification_logs"("createdAt");
