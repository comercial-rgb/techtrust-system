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
  air_filter: ["MAINTENANCE_LIGHT", "OIL_CHANGE", "GENERAL_REPAIR"],
  belts_hoses: ["MAINTENANCE_LIGHT", "ENGINE", "GENERAL_REPAIR"],
  fluids: ["MAINTENANCE_LIGHT", "OIL_CHANGE", "GENERAL_REPAIR"],
  packages: ["MAINTENANCE_LIGHT", "OIL_CHANGE", "GENERAL_REPAIR"],

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

  // Diagnostic sub-types from ScheduleAppointmentScreen
  engine_diag: ["DIAGNOSTICS", "ENGINE", "GENERAL_REPAIR"],
  transmission_diag: ["DIAGNOSTICS", "TRANSMISSION", "GENERAL_REPAIR"],
  brake_diag: ["DIAGNOSTICS", "BRAKES", "GENERAL_REPAIR"],
  electrical_diag: ["DIAGNOSTICS", "ELECTRICAL_BASIC", "GENERAL_REPAIR"],
  ac_diag: ["DIAGNOSTICS", "AC_SERVICE", "GENERAL_REPAIR"],
  steering_diag: ["DIAGNOSTICS", "SUSPENSION", "GENERAL_REPAIR"],
  diesel_emissions: ["DIAGNOSTICS", "ENGINE", "GENERAL_REPAIR"],
  nvh: ["DIAGNOSTICS", "GENERAL_REPAIR"],
  cooling_diag: ["DIAGNOSTICS", "ENGINE", "GENERAL_REPAIR"],
  fuel_diag: ["DIAGNOSTICS", "ENGINE", "GENERAL_REPAIR"],
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
  air_filter: "SCHEDULED_MAINTENANCE",
  belts_hoses: "REPAIR",
  fluids: "SCHEDULED_MAINTENANCE",
  packages: "SCHEDULED_MAINTENANCE",

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

  // Diagnostic sub-types from ScheduleAppointmentScreen
  engine_diag: "DIAGNOSTIC",
  transmission_diag: "DIAGNOSTIC",
  brake_diag: "DIAGNOSTIC",
  electrical_diag: "DIAGNOSTIC",
  ac_diag: "DIAGNOSTIC",
  steering_diag: "DIAGNOSTIC",
  diesel_emissions: "DIAGNOSTIC",
  nvh: "DIAGNOSTIC",
  cooling_diag: "DIAGNOSTIC",
  fuel_diag: "DIAGNOSTIC",
};
