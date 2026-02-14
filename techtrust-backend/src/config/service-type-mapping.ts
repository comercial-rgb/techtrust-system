/**
 * Centralized mapping from mobile rawServiceType IDs to ServiceOffered enum values.
 * Used by provider matching logic to filter requests by provider capabilities.
 *
 * - Keys: rawServiceType values sent by the mobile app (lowercase)
 * - Values: array of ServiceOffered enum values that qualify a provider to serve this request
 */
export const RAW_TO_SERVICE_OFFERED: Record<string, string[]> = {
  // ── Service Request types (CreateRequestScreen) ──
  oil: ["OIL_CHANGE", "MAINTENANCE_LIGHT", "GENERAL_REPAIR"],
  brake: ["BRAKES", "GENERAL_REPAIR"],
  tire: ["TIRES", "GENERAL_REPAIR"],
  engine: ["ENGINE", "GENERAL_REPAIR"],
  electric: ["ELECTRICAL_BASIC", "GENERAL_REPAIR"],
  ac: ["AC_SERVICE", "GENERAL_REPAIR"],
  suspension: ["SUSPENSION", "GENERAL_REPAIR"],
  transmission: ["TRANSMISSION", "GENERAL_REPAIR"],
  inspection: ["INSPECTION", "DIAGNOSTICS"],
  detailing: ["DETAILING"],
  towing: ["TOWING", "ROADSIDE_ASSIST"],
  roadside: ["ROADSIDE_ASSIST", "TOWING"],
  battery: ["BATTERY", "ROADSIDE_ASSIST", "ELECTRICAL_BASIC"],
  lockout: ["LOCKOUT", "ROADSIDE_ASSIST"],
  general_repair: ["GENERAL_REPAIR"],
  maintenance: ["MAINTENANCE_LIGHT", "OIL_CHANGE", "GENERAL_REPAIR"],
  other: ["GENERAL_REPAIR"],

  // ── Diagnostic/Appointment types (ScheduleAppointmentScreen) ──
  diagnostic: ["DIAGNOSTICS"],
  steering: ["SUSPENSION", "GENERAL_REPAIR"],
  exhaust: ["ENGINE", "GENERAL_REPAIR"],
  cooling: ["ENGINE", "GENERAL_REPAIR"],
  fuel_system: ["ENGINE", "GENERAL_REPAIR"],
  check_engine_light: ["DIAGNOSTICS", "ENGINE", "GENERAL_REPAIR"],
  noise_vibration: ["DIAGNOSTICS", "GENERAL_REPAIR"],
  starting_issues: ["BATTERY", "ELECTRICAL_BASIC", "ENGINE", "GENERAL_REPAIR"],
  drivetrain: ["TRANSMISSION", "GENERAL_REPAIR"],
  pre_purchase: ["INSPECTION", "DIAGNOSTICS"],
};

/**
 * Map mobile rawServiceType to backend ServiceType enum (coarse category).
 */
export const SERVICE_TYPE_MAP: Record<string, string> = {
  // Service requests
  oil: "SCHEDULED_MAINTENANCE",
  brake: "REPAIR",
  tire: "REPAIR",
  engine: "REPAIR",
  electric: "REPAIR",
  ac: "REPAIR",
  suspension: "REPAIR",
  transmission: "REPAIR",
  inspection: "INSPECTION",
  detailing: "DETAILING",
  towing: "ROADSIDE_SOS",
  roadside: "ROADSIDE_SOS",
  battery: "ROADSIDE_SOS",
  lockout: "ROADSIDE_SOS",
  general_repair: "REPAIR",
  maintenance: "SCHEDULED_MAINTENANCE",
  other: "REPAIR",

  // Diagnostic appointments
  diagnostic: "DIAGNOSTIC",
  steering: "DIAGNOSTIC",
  exhaust: "DIAGNOSTIC",
  cooling: "DIAGNOSTIC",
  fuel_system: "DIAGNOSTIC",
  check_engine_light: "DIAGNOSTIC",
  noise_vibration: "DIAGNOSTIC",
  starting_issues: "DIAGNOSTIC",
  drivetrain: "DIAGNOSTIC",
  pre_purchase: "INSPECTION",
};
