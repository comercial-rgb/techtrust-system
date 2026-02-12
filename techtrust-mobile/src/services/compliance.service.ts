/**
 * ============================================
 * COMPLIANCE SERVICE (Mobile)
 * ============================================
 * API calls for Provider Compliance, Technicians, Insurance & Verification
 */

import api from "./api";

// ============================================
// TYPES
// ============================================

export interface ComplianceItem {
  id: string;
  providerProfileId: string;
  type: string;
  status: string;
  requirementKey?: string; // Multi-state: links to dynamic catalog
  registrationNumber?: string;
  licenseNumber?: string;
  issuingAuthority?: string;
  expirationDate?: string;
  documentUploads: string[];
  lastVerifiedAt?: string;
  verifiedByUserId?: string;
  verificationMethod?: string;
  verificationNotes?: string;
  technicianId?: string;
  technician?: Technician;
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  providerProfileId: string;
  fullName: string;
  role: string;
  epa609CertNumber?: string;
  epa609CertType?: string;
  epa609CertExpiry?: string;
  epa609CertUploads: string[];
  epa609Status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InsurancePolicy {
  id: string;
  providerProfileId: string;
  type: string;
  hasCoverage: boolean;
  carrierName?: string;
  policyNumber?: string;
  expirationDate?: string;
  coverageAmount?: number;
  coiUploads: string[];
  status: string;
  lastVerifiedAt?: string;
  verifiedByUserId?: string;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceSummary {
  complianceItems: ComplianceItem[];
  insurancePolicies: InsurancePolicy[];
  technicians: Technician[];
  serviceGating: Record<string, { allowed: boolean; reason?: string }>;
  serviceEligibilities?: Array<{
    serviceType: string;
    eligible: boolean;
    reasonCodes: string[];
  }>;
  overallStatus: string;
  // Multi-state data
  jurisdiction?: {
    stateCode: string;
    stateName: string;
    countyName?: string;
    cityName?: string;
    insideCityLimits?: boolean;
    isActiveState: boolean;
  };
  requiredItems?: Array<{
    requirementKey: string;
    displayName: string;
    issuingAuthority?: string;
    scope: string;
    isMandatory: boolean;
  }>;
  disclaimersNeeded?: Array<{
    serviceType: string;
    disclaimerVersion?: any;
  }>;
}

export interface RiskAcceptanceCheck {
  accepted: boolean;
  lastAcceptedAt?: string;
  disclaimerVersion: string;
  disclaimerText?: string;
}

// ============================================
// COMPLIANCE API
// ============================================

export const getComplianceItems = async () => {
  const response = await api.get("/compliance");
  return response.data;
};

export const upsertComplianceItem = async (data: {
  type: string;
  registrationNumber?: string;
  expirationDate?: string;
  documentUploads?: string[];
  technicianId?: string;
}) => {
  const response = await api.post("/compliance", data);
  return response.data;
};

export const autoCreateComplianceItems = async () => {
  const response = await api.post("/compliance/auto-create");
  return response.data;
};

export const getComplianceSummary = async () => {
  const response = await api.get("/compliance/summary");
  return response.data;
};

// ============================================
// TECHNICIAN API
// ============================================

export const getTechnicians = async () => {
  const response = await api.get("/technicians");
  return response.data;
};

export const addTechnician = async (data: {
  fullName: string;
  role?: string;
  epa609CertNumber?: string;
  epa609CertType?: string;
  epa609CertExpiry?: string;
  epa609CertUploads?: string[];
}) => {
  const response = await api.post("/technicians", data);
  return response.data;
};

export const updateTechnician = async (
  id: string,
  data: {
    fullName?: string;
    role?: string;
    epa609CertNumber?: string;
    epa609CertType?: string;
    epa609CertExpiry?: string;
    epa609CertUploads?: string[];
  },
) => {
  const response = await api.put(`/technicians/${id}`, data);
  return response.data;
};

export const deactivateTechnician = async (id: string) => {
  const response = await api.delete(`/technicians/${id}`);
  return response.data;
};

// ============================================
// INSURANCE API
// ============================================

export const getInsurancePolicies = async () => {
  const response = await api.get("/insurance");
  return response.data;
};

export const upsertInsurancePolicy = async (data: {
  type: string;
  hasCoverage: boolean;
  carrierName?: string;
  policyNumber?: string;
  expirationDate?: string;
  coverageAmount?: number;
  coiUploads?: string[];
}) => {
  const response = await api.post("/insurance", data);
  return response.data;
};

export const batchUpsertInsurance = async (
  policies: Array<{
    type: string;
    hasCoverage: boolean;
    carrierName?: string;
    policyNumber?: string;
    expirationDate?: string;
    coverageAmount?: number;
    coiUploads?: string[];
  }>,
) => {
  const response = await api.post("/insurance/batch", { policies });
  return response.data;
};

// ============================================
// VERIFICATION / RISK ACCEPTANCE API
// ============================================

export const checkRiskAcceptance = async (
  providerId: string,
  serviceType: string,
): Promise<RiskAcceptanceCheck> => {
  const response = await api.get("/verification/risk-acceptance/check", {
    params: { providerId, serviceType },
  });
  return response.data.data;
};

export const acceptRiskDisclaimer = async (data: {
  providerId: string;
  serviceType: string;
  deviceInfo?: string;
}) => {
  const response = await api.post("/verification/risk-acceptance", data);
  return response.data;
};

// ============================================
// PROVIDER PUBLIC STATUS HELPERS
// ============================================

export const getProviderComplianceBadge = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return {
        label: "Verified",
        color: "#16a34a",
        icon: "shield-checkmark" as const,
        bgColor: "#f0fdf4",
      };
    case "PENDING":
      return {
        label: "Pending",
        color: "#d97706",
        icon: "time" as const,
        bgColor: "#fffbeb",
      };
    case "RESTRICTED":
      return {
        label: "Restricted",
        color: "#dc2626",
        icon: "warning" as const,
        bgColor: "#fef2f2",
      };
    case "NOT_ELIGIBLE":
      return {
        label: "Not Eligible",
        color: "#6b7280",
        icon: "close-circle" as const,
        bgColor: "#f9fafb",
      };
    default:
      return {
        label: "Unknown",
        color: "#6b7280",
        icon: "help-circle" as const,
        bgColor: "#f9fafb",
      };
  }
};

export const getInsuranceStatusLabel = (status: string) => {
  switch (status) {
    case "INS_VERIFIED":
      return { label: "Verified", color: "#16a34a" };
    case "INS_PROVIDED_UNVERIFIED":
      return { label: "Under Review", color: "#d97706" };
    case "INS_NOT_PROVIDED":
      return { label: "Not Provided", color: "#6b7280" };
    case "INS_EXPIRED":
      return { label: "Expired", color: "#dc2626" };
    default:
      return { label: status, color: "#6b7280" };
  }
};

export const getComplianceStatusLabel = (status: string) => {
  switch (status) {
    case "VERIFIED":
      return { label: "Verified", color: "#16a34a" };
    case "PROVIDED_UNVERIFIED":
      return { label: "Under Review", color: "#d97706" };
    case "COMPLIANCE_PENDING":
      return { label: "Pending", color: "#d97706" };
    case "NOT_APPLICABLE":
      return { label: "N/A", color: "#6b7280" };
    case "EXPIRED":
      return { label: "Expired", color: "#dc2626" };
    default:
      return { label: status, color: "#6b7280" };
  }
};

export const INSURANCE_TYPE_LABELS: Record<string, string> = {
  GENERAL_LIABILITY: "General Liability",
  GARAGE_LIABILITY: "Garage Liability",
  GARAGE_KEEPERS: "Garage Keeper's",
  COMMERCIAL_AUTO: "Commercial Auto",
  ON_HOOK: "On-Hook / Towing",
  WORKERS_COMP: "Workers' Compensation",
  PROFESSIONAL_LIABILITY: "Professional / E&O",
};

export const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  FDACS_MOTOR_VEHICLE_REPAIR: "FDACS Motor Vehicle Repair",
  STATE_SHOP_REGISTRATION: "State Repair Shop Registration",
  CITY_BTR: "City Business Tax Receipt",
  LOCAL_BTR_CITY: "City Business Tax Receipt",
  COUNTY_BTR: "County Business Tax Receipt",
  LOCAL_BTR_COUNTY: "County Business Tax Receipt",
  EPA_609_TECHNICIAN: "EPA 609 Certification",
};

/**
 * Get a display label for a compliance item.
 * Prefers the dynamic displayName from the catalog (via requiredItems)
 * and falls back to the static map.
 */
export const getComplianceDisplayName = (
  item: ComplianceItem,
  requiredItems?: Array<{ requirementKey: string; displayName: string }>
): string => {
  // First try to find from the dynamic catalog
  if (item.requirementKey && requiredItems) {
    const catalogItem = requiredItems.find(
      (r) => r.requirementKey === item.requirementKey
    );
    if (catalogItem) return catalogItem.displayName;
  }
  // Fall back to static labels
  return (
    COMPLIANCE_TYPE_LABELS[item.type] ||
    item.issuingAuthority ||
    item.type
  );
};

// ============================================
// MULTI-STATE API
// ============================================

/** Get list of active marketplace states */
export const getActiveStates = async (): Promise<
  Array<{ stateCode: string; stateName: string }>
> => {
  const response = await api.get("/multi-state/states/active");
  return response.data?.data?.states || [];
};

/** Get state profile details */
export const getStateProfile = async (stateCode: string) => {
  const response = await api.get(
    `/multi-state/state-profiles/${stateCode}`
  );
  return response.data?.data?.profile;
};

/** Resolve requirements for current provider (via rule engine) */
export const resolveProviderRequirements = async (
  providerProfileId: string
) => {
  const response = await api.post(
    `/multi-state/rule-engine/resolve/${providerProfileId}`
  );
  return response.data?.data;
};

/** Recalculate eligibility for current provider */
export const recalculateEligibility = async (
  providerProfileId: string
) => {
  const response = await api.post(
    `/multi-state/rule-engine/eligibility/${providerProfileId}`
  );
  return response.data?.data;
};
