import { InsurancePolicyStatus, InsurancePolicyType } from "@prisma/client";

type InsurancePolicyLike = {
  type: InsurancePolicyType | string;
  hasCoverage?: boolean | null;
  status?: InsurancePolicyStatus | string | null;
  expirationDate?: Date | string | null;
};

type ProviderInsuranceProfile = {
  businessType?: string | null;
  businessTypeCat?: string | null;
  servicesOffered?: unknown;
  vehicleTypesServed?: unknown;
  insurancePolicies?: InsurancePolicyLike[];
};

type RequirementRule = {
  type: InsurancePolicyType;
  label: string;
  level: "REQUIRED" | "RECOMMENDED";
  appliesTo: string[];
  reason: string;
};

const ALL_PROVIDERS: RequirementRule[] = [
  {
    type: "GENERAL_LIABILITY",
    label: "General Liability",
    level: "REQUIRED",
    appliesTo: ["all providers"],
    reason: "Baseline protection for bodily injury, property damage, and premises/operations claims.",
  },
  {
    type: "WORKERS_COMP",
    label: "Workers' Compensation",
    level: "RECOMMENDED",
    appliesTo: ["providers with employees"],
    reason: "Expected when the business has employees or payroll exposure.",
  },
  {
    type: "UMBRELLA_EXCESS",
    label: "Umbrella / Excess Liability",
    level: "RECOMMENDED",
    appliesTo: ["higher value jobs"],
    reason: "Adds additional liability limits above primary policies.",
  },
];

const REPAIR_OR_BODY: RequirementRule[] = [
  {
    type: "GARAGE_LIABILITY",
    label: "Garage Liability",
    level: "REQUIRED",
    appliesTo: ["mechanic", "repair shop", "body work"],
    reason: "Common garage operations coverage for auto service businesses.",
  },
  {
    type: "GARAGEKEEPERS",
    label: "Garagekeepers",
    level: "REQUIRED",
    appliesTo: ["customer vehicles in care, custody, or control"],
    reason: "Protects customer vehicles while stored, diagnosed, repaired, or test-driven by the provider.",
  },
];

const MOBILE_OR_LIGHT: RequirementRule[] = [
  {
    type: "COMMERCIAL_AUTO",
    label: "Commercial Auto",
    level: "RECOMMENDED",
    appliesTo: ["mobile mechanics", "light services", "roadside"],
    reason: "Recommended when a business vehicle is used to travel to customers.",
  },
];

const TOWING: RequirementRule[] = [
  {
    type: "COMMERCIAL_AUTO",
    label: "Commercial Auto",
    level: "REQUIRED",
    appliesTo: ["towing", "roadside towing"],
    reason: "Towing operations need commercial vehicle liability coverage.",
  },
  {
    type: "ON_HOOK",
    label: "On-Hook / Towing",
    level: "REQUIRED",
    appliesTo: ["vehicles being towed"],
    reason: "Protects customer vehicles while attached to or transported by the tow vehicle.",
  },
];

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function hasAny(values: string[], needles: string[]): boolean {
  const normalized = values.map((v) => v.toUpperCase());
  return needles.some((needle) => normalized.includes(needle));
}

function isExpired(date?: Date | string | null): boolean {
  return Boolean(date && new Date(date).getTime() < Date.now());
}

function policyStatus(policy?: InsurancePolicyLike) {
  if (!policy) return "MISSING";
  if (isExpired(policy.expirationDate)) return "EXPIRED";
  if (policy.status === "INS_VERIFIED") return "VERIFIED";
  if (policy.hasCoverage || policy.status === "INS_PROVIDED_UNVERIFIED") {
    return "PROVIDED_UNVERIFIED";
  }
  return "MISSING";
}

export function getInsuranceRequirementRules(profile: ProviderInsuranceProfile): RequirementRule[] {
  const businessType = String(profile.businessType || "").toUpperCase();
  const businessTypeCat = String(profile.businessTypeCat || "").toUpperCase();
  const services = asStringArray(profile.servicesOffered);

  const rules = [...ALL_PROVIDERS];

  const repairOrBody =
    businessType.includes("REPAIR") ||
    businessType.includes("MECHANIC") ||
    businessType.includes("BODY") ||
    businessTypeCat === "REPAIR_SHOP" ||
    hasAny(services, [
      "GENERAL_REPAIR",
      "ENGINE",
      "TRANSMISSION",
      "BRAKES",
      "SUSPENSION",
      "ELECTRICAL_BASIC",
      "AC_SERVICE",
      "BODY_WORK",
      "PAINT",
      "COLLISION",
    ]);

  if (repairOrBody) rules.push(...REPAIR_OR_BODY);

  const mobileOrLight = hasAny(services, [
    "OIL_CHANGE",
    "BATTERY",
    "TIRES",
    "LOCKOUT",
    "ROADSIDE_ASSIST",
    "INSPECTION",
    "DIAGNOSTICS",
    "DETAILING",
  ]);
  if (mobileOrLight) rules.push(...MOBILE_OR_LIGHT);

  if (hasAny(services, ["TOWING"])) rules.push(...TOWING);

  const deduped = new Map<InsurancePolicyType, RequirementRule>();
  for (const rule of rules) {
    const existing = deduped.get(rule.type);
    if (!existing || existing.level === "RECOMMENDED" && rule.level === "REQUIRED") {
      deduped.set(rule.type, rule);
    }
  }

  return Array.from(deduped.values());
}

export function buildInsuranceRequirementChecklist(profile: ProviderInsuranceProfile) {
  const policies = profile.insurancePolicies || [];
  const rules = getInsuranceRequirementRules(profile);

  return rules.map((rule) => {
    const policy = policies.find((p) => p.type === rule.type);
    const status = policyStatus(policy);

    return {
      ...rule,
      status,
      complete: status === "VERIFIED" || status === "PROVIDED_UNVERIFIED",
      verified: status === "VERIFIED",
      customerVisibleBadge:
        status === "VERIFIED"
          ? "Verified insurance"
          : status === "PROVIDED_UNVERIFIED"
            ? "Insurance provided"
            : rule.level === "REQUIRED"
              ? "Required insurance missing"
              : "Recommended insurance missing",
    };
  });
}
