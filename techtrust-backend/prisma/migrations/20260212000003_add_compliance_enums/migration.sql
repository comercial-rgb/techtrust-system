-- Migration: Add Provider Compliance & Insurance enums
-- Must be in separate transaction for PostgreSQL enum creation

-- Entity Type
CREATE TYPE "EntityType" AS ENUM ('LLC', 'CORP', 'SOLE_PROP', 'PARTNERSHIP', 'OTHER_ENTITY');

-- Service Offered
CREATE TYPE "ServiceOffered" AS ENUM ('GENERAL_REPAIR', 'MAINTENANCE_LIGHT', 'DIAGNOSTICS', 'TIRES', 'BATTERY', 'BRAKES', 'ELECTRICAL_BASIC', 'AC_SERVICE', 'TOWING', 'ROADSIDE_ASSIST');

-- Provider Public Status
CREATE TYPE "ProviderPublicStatus" AS ENUM ('VERIFIED', 'PENDING', 'RESTRICTED', 'NOT_ELIGIBLE');

-- Compliance Type
CREATE TYPE "ComplianceType" AS ENUM ('FDACS_MOTOR_VEHICLE_REPAIR', 'LOCAL_BTR_CITY', 'LOCAL_BTR_COUNTY', 'EPA_609_TECHNICIAN');

-- Compliance Status
CREATE TYPE "ComplianceStatus" AS ENUM ('NOT_PROVIDED', 'PROVIDED_UNVERIFIED', 'VERIFIED', 'COMPLIANCE_PENDING', 'EXPIRED', 'NOT_APPLICABLE');

-- Technician Role
CREATE TYPE "TechnicianRole" AS ENUM ('TECH', 'LEAD_TECH', 'MANAGER', 'OTHER_ROLE');

-- Insurance Policy Type
CREATE TYPE "InsurancePolicyType" AS ENUM ('GENERAL_LIABILITY', 'GARAGE_LIABILITY', 'GARAGEKEEPERS', 'COMMERCIAL_AUTO', 'ON_HOOK', 'WORKERS_COMP', 'UMBRELLA_EXCESS');

-- Insurance Policy Status
CREATE TYPE "InsurancePolicyStatus" AS ENUM ('INS_NOT_PROVIDED', 'INS_PROVIDED_UNVERIFIED', 'INS_VERIFIED', 'INS_EXPIRED');

-- Verification Method
CREATE TYPE "VerificationMethod" AS ENUM ('MANUAL_REVIEW', 'SELF_ATTESTATION', 'THIRD_PARTY');

-- Verification Entity Type
CREATE TYPE "VerificationEntityType" AS ENUM ('COMPLIANCE_ITEM', 'INSURANCE_POLICY', 'TECHNICIAN_CERT');
