type ProviderDisclosureProfile = {
  businessType?: string | null;
  businessTypeCat?: string | null;
  servicesOffered?: unknown;
  insuranceVerified?: boolean | null;
  insuranceDisclosureAcceptedAt?: Date | string | null;
  insuranceDisclosureDeclinedAt?: Date | string | null;
  fdacsRegistrationNumber?: string | null;
  cityBusinessTaxReceiptNumber?: string | null;
  countyBusinessTaxReceiptNumber?: string | null;
  businessTaxReceiptStatus?: string | null;
  marketplaceFacilitatorTaxAcknowledged?: boolean | null;
  stripeOnboardingCompleted?: boolean | null;
  payoutMethod?: string | null;
  insurancePolicies?: Array<{
    hasCoverage?: boolean | null;
    status?: string | null;
    type?: string | null;
    carrierName?: string | null;
    expirationDate?: Date | string | null;
  }>;
  complianceItems?: Array<{
    type?: string | null;
    status?: string | null;
    licenseNumber?: string | null;
  }>;
};

function hasDeclaredInsurance(profile: ProviderDisclosureProfile): boolean {
  if (profile.insuranceVerified) return true;
  return (profile.insurancePolicies || []).some((policy) => {
    const status = String(policy.status || "");
    return Boolean(policy.hasCoverage) || status.includes("PROVIDED") || status.includes("VERIFIED");
  });
}

function hasLocalBtr(profile: ProviderDisclosureProfile): boolean {
  if (profile.cityBusinessTaxReceiptNumber || profile.countyBusinessTaxReceiptNumber) {
    return true;
  }

  return (profile.complianceItems || []).some((item) => {
    const type = String(item.type || "");
    const status = String(item.status || "");
    return (
      (type === "LOCAL_BTR_CITY" || type === "LOCAL_BTR_COUNTY") &&
      (Boolean(item.licenseNumber) || status.includes("PROVIDED") || status.includes("VERIFIED"))
    );
  });
}

export function buildProviderDisclosure(profile: ProviderDisclosureProfile) {
  const insuranceDeclared = hasDeclaredInsurance(profile);
  const localBtrDeclared = hasLocalBtr(profile);
  const fdacsDeclared = Boolean(profile.fdacsRegistrationNumber) ||
    (profile.complianceItems || []).some((item) => {
      const type = String(item.type || "");
      const status = String(item.status || "");
      return (
        (type === "FDACS_MOTOR_VEHICLE_REPAIR" || type === "STATE_SHOP_REGISTRATION") &&
        (Boolean(item.licenseNumber) || status.includes("PROVIDED") || status.includes("VERIFIED"))
      );
    });

  const payoutMethod = profile.stripeOnboardingCompleted
    ? "STRIPE_CONNECT"
    : profile.payoutMethod || "MANUAL";

  return {
    payout: {
      method: payoutMethod,
      stripeConnectCompleted: Boolean(profile.stripeOnboardingCompleted),
      manualPayoutEnabled: payoutMethod !== "STRIPE_CONNECT",
      message:
        payoutMethod === "STRIPE_CONNECT"
          ? "Provider receives payouts through Stripe Connect."
          : "Provider payouts are handled manually by TechTrust via Zelle, bank transfer, check, or another approved method.",
    },
    tax: {
      marketplaceFacilitator: true,
      acknowledgedByProvider: profile.marketplaceFacilitatorTaxAcknowledged !== false,
      message:
        "TechTrust collects applicable Florida marketplace facilitator sales tax, stores transaction-level tax records, and supports QuickBooks tax reporting for remittance.",
    },
    compliance: {
      fdacsDeclared,
      localBusinessTaxReceiptDeclared: localBtrDeclared,
      businessTaxReceiptStatus: profile.businessTaxReceiptStatus || "NOT_PROVIDED",
      message: localBtrDeclared
        ? "Provider has supplied local business tax receipt information."
        : "Provider has not supplied local city/county business tax receipt information yet.",
    },
    insurance: {
      declared: insuranceDeclared,
      verified: Boolean(profile.insuranceVerified),
      disclosureAccepted: Boolean(profile.insuranceDisclosureAcceptedAt),
      customerWarningRequired: !insuranceDeclared,
      message: insuranceDeclared
        ? "Provider has supplied insurance information. Coverage may be unverified unless marked verified."
        : "Provider has not supplied insurance information. TechTrust does not provide insurance coverage for this provider's work.",
    },
  };
}
