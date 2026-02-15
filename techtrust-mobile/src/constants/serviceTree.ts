/**
 * SERVICE & DIAGNOSTIC TREE — Complete Technical Reference
 * TechTrust AutoSolutions LLC
 * Version 1.0 — February 2026
 *
 * Vehicles Covered: Cars • SUVs • Pickups • Trucks • Buses • Trailers
 * Market: United States (EPA / FMCSA / CARB Compliant)
 *
 * This file is the single source of truth for all service categories,
 * sub-services, diagnostic categories, icon mappings, vehicle classification,
 * and conditional display rules used across the entire app.
 */

// ============================================================
// VEHICLE CLASSIFICATION
// ============================================================

export type VehicleClass =
  | "light_duty"      // Cars / SUVs — up to 6,000 lbs GVWR
  | "light_truck"     // Pickups — 6,001–10,000 lbs
  | "medium_duty"     // HD Pickups — 10,001–26,000 lbs (F-250/350, RAM 2500/3500)
  | "heavy_duty"      // Trucks / Buses — 26,001+ lbs
  | "trailer";        // Trailers (no engine)

export interface VehicleClassInfo {
  id: VehicleClass;
  label: string;
  gvwrRange: string;
  examples: string;
  icon: string; // MDI icon name
  color: string;
}

export const VEHICLE_CLASSES: VehicleClassInfo[] = [
  {
    id: "light_duty",
    label: "Car / SUV",
    gvwrRange: "Up to 6,000 lbs",
    examples: "Toyota Camry, Honda CR-V, Ford Explorer",
    icon: "car-side",
    color: "#3498DB",
  },
  {
    id: "light_truck",
    label: "Pickup Truck",
    gvwrRange: "6,001–10,000 lbs",
    examples: "Ford F-150, RAM 1500, Chevy Silverado 1500",
    icon: "truck",
    color: "#E67E22",
  },
  {
    id: "medium_duty",
    label: "Heavy-Duty Pickup",
    gvwrRange: "10,001–26,000 lbs",
    examples: "Ford F-250/F-350, RAM 2500/3500, International CV",
    icon: "truck",
    color: "#E67E22",
  },
  {
    id: "heavy_duty",
    label: "Truck / Bus",
    gvwrRange: "26,001+ lbs",
    examples: "Freightliner Cascadia, Peterbilt 579, Thomas Built bus",
    icon: "truck-trailer",
    color: "#E74C3C",
  },
  {
    id: "trailer",
    label: "Trailer",
    gvwrRange: "Varies",
    examples: "Utility, flatbed, reefer, dry van, tanker",
    icon: "truck-flatbed",
    color: "#F39C12",
  },
];

// Vehicle type icons for the vehicle class selection screen
export const VEHICLE_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  car:     { icon: "car-side",       color: "#3498DB" },
  sedan:   { icon: "car-side",       color: "#3498DB" },
  suv:     { icon: "car-estate",     color: "#2ECC71" },
  crossover: { icon: "car-estate",   color: "#2ECC71" },
  pickup:  { icon: "truck",          color: "#E67E22" },
  truck:   { icon: "truck-trailer",  color: "#E74C3C" },
  semi:    { icon: "truck-trailer",  color: "#E74C3C" },
  bus:     { icon: "bus-side",       color: "#9B59B6" },
  trailer: { icon: "truck-flatbed",  color: "#F39C12" },
  van:     { icon: "van-utility",    color: "#1ABC9C" },
};

// ============================================================
// PART 1: SERVICE CATEGORIES (Solicitações)
// ============================================================

export interface ServiceCategory {
  id: string;
  key: string;        // Backend enum key (UPPER_SNAKE_CASE)
  label: string;
  mdiIcon: string;    // MaterialCommunityIcons name
  ionIcon: string;    // Ionicons name (for CreateRequestScreen)
  color: string;      // Hex color
  category: "maintenance" | "repairs" | "inspection" | "detailing" | "sos" | "fluids" | "packages";
  hasSubOptions: boolean;
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  // -- Maintenance --
  { id: "oil",          key: "OIL_CHANGE",       label: "Oil Change",                mdiIcon: "oil",                       ionIcon: "water",              color: "#F39C12", category: "maintenance", hasSubOptions: true },
  { id: "air_filter",   key: "AIR_FILTER",       label: "Air Filter Service",        mdiIcon: "air-filter",                ionIcon: "cloud",              color: "#3498DB", category: "maintenance", hasSubOptions: true },
  { id: "fuel_system",  key: "FUEL_SYSTEM",      label: "Fuel System",               mdiIcon: "gas-station",               ionIcon: "flame",              color: "#E74C3C", category: "maintenance", hasSubOptions: true },
  { id: "brake",        key: "BRAKES",           label: "Brake Service",             mdiIcon: "car-brake-alert",           ionIcon: "disc",               color: "#C0392B", category: "maintenance", hasSubOptions: true },
  { id: "cooling",      key: "COOLING_SYSTEM",   label: "Cooling System",            mdiIcon: "coolant-temperature",       ionIcon: "thermometer",        color: "#2980B9", category: "maintenance", hasSubOptions: true },
  { id: "tire",         key: "TIRES",            label: "Tires & Wheels",            mdiIcon: "tire",                      ionIcon: "ellipse",            color: "#2C3E50", category: "maintenance", hasSubOptions: true },
  { id: "belts_hoses",  key: "BELTS_HOSES",      label: "Belts & Hoses",             mdiIcon: "connection",                ionIcon: "link",               color: "#D35400", category: "maintenance", hasSubOptions: true },
  // -- Repairs --
  { id: "ac",           key: "AC_SERVICE",       label: "A/C & Heating",             mdiIcon: "air-conditioner",           ionIcon: "snow",               color: "#1ABC9C", category: "repairs", hasSubOptions: true },
  { id: "steering",     key: "STEERING",         label: "Steering & Suspension",     mdiIcon: "steering",                  ionIcon: "navigate",           color: "#8E44AD", category: "repairs", hasSubOptions: true },
  { id: "electric",     key: "ELECTRICAL_BASIC", label: "Electrical System",         mdiIcon: "flash",                     ionIcon: "flash",              color: "#F1C40F", category: "repairs", hasSubOptions: true },
  { id: "exhaust",      key: "EXHAUST",          label: "Exhaust System",            mdiIcon: "pipe-leak",                 ionIcon: "cloud",              color: "#7F8C8D", category: "repairs", hasSubOptions: true },
  { id: "drivetrain",   key: "DRIVETRAIN",       label: "Drivetrain",                mdiIcon: "cog-transfer",              ionIcon: "speedometer",        color: "#E67E22", category: "repairs", hasSubOptions: true },
  { id: "engine",       key: "ENGINE",           label: "Engine",                    mdiIcon: "engine",                    ionIcon: "cog",                color: "#E74C3C", category: "repairs", hasSubOptions: true },
  { id: "transmission", key: "TRANSMISSION",     label: "Transmission",              mdiIcon: "car-shift-pattern",         ionIcon: "settings",           color: "#E67E22", category: "repairs", hasSubOptions: false },
  { id: "battery",      key: "BATTERY",          label: "Battery",                   mdiIcon: "car-battery",               ionIcon: "battery-charging",   color: "#F1C40F", category: "repairs", hasSubOptions: false },
  // -- Fluids --
  { id: "fluids",       key: "FLUID_SERVICES",   label: "Fluid Services",            mdiIcon: "water",                     ionIcon: "water",              color: "#2E86C1", category: "fluids", hasSubOptions: true },
  // -- Preventive Packages --
  { id: "packages",     key: "PREVENTIVE_PACKAGES", label: "Preventive Maintenance", mdiIcon: "package-variant-closed-check", ionIcon: "cube",            color: "#27AE60", category: "packages", hasSubOptions: true },
  // -- Inspection & Diagnostics --
  { id: "inspection",   key: "INSPECTION",       label: "Inspection",                mdiIcon: "clipboard-check",           ionIcon: "clipboard",          color: "#27AE60", category: "inspection", hasSubOptions: false },
  { id: "diagnostic",   key: "DIAGNOSTICS",      label: "Diagnostics",               mdiIcon: "stethoscope",               ionIcon: "pulse",              color: "#E67E22", category: "inspection", hasSubOptions: false },
  // -- Detailing --
  { id: "detailing",    key: "DETAILING",        label: "Detailing",                 mdiIcon: "car-wash",                  ionIcon: "sparkles",           color: "#ec4899", category: "detailing", hasSubOptions: false },
  // -- Roadside / SOS --
  { id: "towing",       key: "TOWING",           label: "Towing",                    mdiIcon: "tow-truck",                 ionIcon: "car-sport",          color: "#E74C3C", category: "sos", hasSubOptions: false },
  { id: "roadside",     key: "ROADSIDE_ASSIST",  label: "Roadside Assist",           mdiIcon: "tow-truck",                 ionIcon: "warning",            color: "#E74C3C", category: "sos", hasSubOptions: false },
  { id: "lockout",      key: "LOCKOUT",          label: "Lockout",                   mdiIcon: "key-variant",               ionIcon: "key",                color: "#E74C3C", category: "sos", hasSubOptions: false },
  // -- General / Other --
  { id: "general_repair", key: "GENERAL_REPAIR", label: "General Repair",            mdiIcon: "wrench",                    ionIcon: "construct",          color: "#6b7280", category: "repairs", hasSubOptions: false },
  { id: "maintenance",    key: "MAINTENANCE_LIGHT", label: "Maintenance",            mdiIcon: "car-cog",                   ionIcon: "build",              color: "#3b82f6", category: "maintenance", hasSubOptions: false },
  { id: "other",          key: "OTHER",            label: "Other",                   mdiIcon: "dots-horizontal",           ionIcon: "ellipsis-horizontal", color: "#6b7280", category: "repairs", hasSubOptions: false },
];

// Service category groupings for provider screens
export const SERVICE_CATEGORY_GROUPS = [
  { key: "maintenance", label: "Maintenance" },
  { key: "repairs",     label: "Repairs" },
  { key: "fluids",      label: "Fluid Services" },
  { key: "packages",    label: "Preventive Packages" },
  { key: "inspection",  label: "Inspection & Diagnostics" },
  { key: "detailing",   label: "Detailing" },
  { key: "sos",         label: "Roadside / SOS" },
];

// ============================================================
// getServiceTypeInfo — Shared helper for icon/color lookup
// ============================================================

export const getServiceTypeInfo = (type: string): { icon: string; color: string; bg: string; label: string } => {
  const map: Record<string, { icon: string; color: string; bg: string; label: string }> = {
    // Backend ServiceType enums
    SCHEDULED_MAINTENANCE: { icon: "wrench-cog",        color: "#2E86C1", bg: "#dbeafe", label: "Maintenance" },
    REPAIR:                { icon: "wrench",             color: "#f97316", bg: "#ffedd5", label: "Repair" },
    INSPECTION:            { icon: "clipboard-check",    color: "#27AE60", bg: "#d1fae5", label: "Inspection" },
    DIAGNOSTIC:            { icon: "stethoscope",        color: "#E67E22", bg: "#ffedd5", label: "Diagnostics" },
    DETAILING:             { icon: "car-wash",           color: "#ec4899", bg: "#fce7f3", label: "Detailing" },
    ROADSIDE_SOS:          { icon: "car-emergency",      color: "#ef4444", bg: "#fef2f2", label: "SOS" },
    // Granular service keys (from rawServiceType / mobile IDs)
    OIL_CHANGE:    { icon: "oil",                 color: "#F39C12", bg: "#fef3c7", label: "Oil Change" },
    AIR_FILTER:    { icon: "air-filter",           color: "#3498DB", bg: "#dbeafe", label: "Air Filter" },
    FUEL_SYSTEM:   { icon: "gas-station",          color: "#E74C3C", bg: "#fef2f2", label: "Fuel System" },
    BRAKES:        { icon: "car-brake-alert",      color: "#C0392B", bg: "#fef2f2", label: "Brakes" },
    COOLING_SYSTEM:{ icon: "coolant-temperature",  color: "#2980B9", bg: "#dbeafe", label: "Cooling System" },
    TIRES:         { icon: "tire",                 color: "#2C3E50", bg: "#e5e7eb", label: "Tires & Wheels" },
    BELTS_HOSES:   { icon: "connection",           color: "#D35400", bg: "#ffedd5", label: "Belts & Hoses" },
    AC_SERVICE:    { icon: "air-conditioner",      color: "#1ABC9C", bg: "#d1fae5", label: "A/C & Heating" },
    STEERING:      { icon: "steering",             color: "#8E44AD", bg: "#ede9fe", label: "Steering & Suspension" },
    ELECTRICAL_BASIC: { icon: "flash",             color: "#F1C40F", bg: "#fef9c3", label: "Electrical" },
    EXHAUST:       { icon: "pipe-leak",            color: "#7F8C8D", bg: "#f3f4f6", label: "Exhaust" },
    DRIVETRAIN:    { icon: "cog-transfer",         color: "#E67E22", bg: "#ffedd5", label: "Drivetrain" },
    ENGINE:        { icon: "engine",               color: "#E74C3C", bg: "#fef2f2", label: "Engine" },
    TRANSMISSION:  { icon: "car-shift-pattern",    color: "#E67E22", bg: "#ffedd5", label: "Transmission" },
    BATTERY:       { icon: "car-battery",          color: "#F1C40F", bg: "#fef9c3", label: "Battery" },
    FLUID_SERVICES:{ icon: "water",                color: "#2E86C1", bg: "#dbeafe", label: "Fluid Services" },
    PREVENTIVE_PACKAGES: { icon: "package-variant-closed-check", color: "#27AE60", bg: "#d1fae5", label: "Preventive Maintenance" },
    DIAGNOSTICS:   { icon: "stethoscope",          color: "#E67E22", bg: "#ffedd5", label: "Diagnostics" },
    GENERAL_REPAIR:{ icon: "wrench",               color: "#6b7280", bg: "#f3f4f6", label: "General Repair" },
    MAINTENANCE_LIGHT: { icon: "car-cog",          color: "#3b82f6", bg: "#dbeafe", label: "Maintenance" },
    TOWING:        { icon: "tow-truck",            color: "#E74C3C", bg: "#fef2f2", label: "Towing" },
    ROADSIDE_ASSIST:{ icon: "tow-truck",           color: "#E74C3C", bg: "#fef2f2", label: "Roadside" },
    LOCKOUT:       { icon: "key-variant",          color: "#E74C3C", bg: "#fef2f2", label: "Lockout" },
    // Legacy / lowercase IDs from CreateRequestScreen
    oil:           { icon: "oil",                  color: "#F39C12", bg: "#fef3c7", label: "Oil Change" },
    air_filter:    { icon: "air-filter",           color: "#3498DB", bg: "#dbeafe", label: "Air Filter" },
    fuel_system:   { icon: "gas-station",          color: "#E74C3C", bg: "#fef2f2", label: "Fuel System" },
    brake:         { icon: "car-brake-alert",      color: "#C0392B", bg: "#fef2f2", label: "Brakes" },
    cooling:       { icon: "coolant-temperature",  color: "#2980B9", bg: "#dbeafe", label: "Cooling System" },
    tire:          { icon: "tire",                 color: "#2C3E50", bg: "#e5e7eb", label: "Tires & Wheels" },
    belts_hoses:   { icon: "connection",           color: "#D35400", bg: "#ffedd5", label: "Belts & Hoses" },
    ac:            { icon: "air-conditioner",      color: "#1ABC9C", bg: "#d1fae5", label: "A/C & Heating" },
    steering:      { icon: "steering",             color: "#8E44AD", bg: "#ede9fe", label: "Steering & Suspension" },
    electric:      { icon: "flash",                color: "#F1C40F", bg: "#fef9c3", label: "Electrical" },
    exhaust:       { icon: "pipe-leak",            color: "#7F8C8D", bg: "#f3f4f6", label: "Exhaust" },
    drivetrain:    { icon: "cog-transfer",         color: "#E67E22", bg: "#ffedd5", label: "Drivetrain" },
    engine:        { icon: "engine",               color: "#E74C3C", bg: "#fef2f2", label: "Engine" },
    transmission:  { icon: "car-shift-pattern",    color: "#E67E22", bg: "#ffedd5", label: "Transmission" },
    battery:       { icon: "car-battery",          color: "#F1C40F", bg: "#fef9c3", label: "Battery" },
    fluids:        { icon: "water",                color: "#2E86C1", bg: "#dbeafe", label: "Fluid Services" },
    packages:      { icon: "package-variant-closed-check", color: "#27AE60", bg: "#d1fae5", label: "Preventive Maintenance" },
    inspection:    { icon: "clipboard-check",      color: "#27AE60", bg: "#d1fae5", label: "Inspection" },
    diagnostic:    { icon: "stethoscope",          color: "#E67E22", bg: "#ffedd5", label: "Diagnostics" },
    detailing:     { icon: "car-wash",             color: "#ec4899", bg: "#fce7f3", label: "Detailing" },
    towing:        { icon: "tow-truck",            color: "#E74C3C", bg: "#fef2f2", label: "Towing" },
    roadside:      { icon: "tow-truck",            color: "#E74C3C", bg: "#fef2f2", label: "Roadside" },
    lockout:       { icon: "key-variant",          color: "#E74C3C", bg: "#fef2f2", label: "Lockout" },
    general_repair:{ icon: "wrench",               color: "#6b7280", bg: "#f3f4f6", label: "General Repair" },
    maintenance:   { icon: "car-cog",              color: "#3b82f6", bg: "#dbeafe", label: "Maintenance" },
    other:         { icon: "dots-horizontal",      color: "#6b7280", bg: "#f3f4f6", label: "Other" },
  };
  return map[type] || { icon: "car", color: "#6b7280", bg: "#f3f4f6", label: type };
};

// ============================================================
// PART 2: DIAGNOSTIC CATEGORIES
// ============================================================

export interface DiagnosticCategory {
  id: string;
  label: string;
  mdiIcon: string;
  ionIcon: string;
  color: string;
}

export const DIAGNOSTIC_CATEGORIES: DiagnosticCategory[] = [
  { id: "engine_diag",       label: "Engine Diagnostics",            mdiIcon: "engine",                    ionIcon: "cog",               color: "#E74C3C" },
  { id: "transmission_diag", label: "Transmission Diagnostics",      mdiIcon: "car-shift-pattern",         ionIcon: "settings",          color: "#E67E22" },
  { id: "brake_diag",        label: "Brake System Diagnostics",      mdiIcon: "car-brake-alert",           ionIcon: "disc",              color: "#C0392B" },
  { id: "electrical_diag",   label: "Electrical Diagnostics",        mdiIcon: "flash-triangle",            ionIcon: "flash",             color: "#F1C40F" },
  { id: "ac_diag",           label: "A/C & HVAC Diagnostics",        mdiIcon: "snowflake-thermometer",     ionIcon: "snow",              color: "#3498DB" },
  { id: "steering_diag",     label: "Steering & Suspension Diag.",   mdiIcon: "steering",                  ionIcon: "navigate",          color: "#8E44AD" },
  { id: "diesel_emissions",  label: "Diesel Emissions Diagnostics",  mdiIcon: "smoke-detector-variant",    ionIcon: "cloud",             color: "#7F8C8D" },
  { id: "nvh",               label: "NVH Diagnostics",               mdiIcon: "waveform",                  ionIcon: "volume-high",       color: "#2C3E50" },
  { id: "cooling_diag",      label: "Cooling System Diagnostics",    mdiIcon: "coolant-temperature",       ionIcon: "thermometer",       color: "#2980B9" },
  { id: "fuel_diag",         label: "Fuel System Diagnostics",       mdiIcon: "gas-station",               ionIcon: "flame",             color: "#D35400" },
  { id: "pre_purchase",      label: "Pre-Purchase / Safety Inspection", mdiIcon: "clipboard-search",       ionIcon: "search",            color: "#27AE60" },
];

// ============================================================
// CONDITIONAL DISPLAY RULES
// ============================================================
// These rules determine which sub-services to show/hide based on vehicle class.

export interface ConditionalRule {
  feature: string;
  showWhen: string;
  hideWhen: string;
}

export const CONDITIONAL_DISPLAY_RULES: ConditionalRule[] = [
  { feature: "Secondary (Safety) Air Filter",    showWhen: "HD Truck, Bus, or Trailer with diesel engine",    hideWhen: "Cars, SUVs, most light-duty pickups" },
  { feature: "Secondary Fuel Filter",            showWhen: "Diesel engine (medium-duty and up)",              hideWhen: "All gasoline vehicles; light-duty diesel may have single" },
  { feature: "Water Separator Drain",            showWhen: "Diesel engine",                                  hideWhen: "All gasoline vehicles" },
  { feature: "Air Brake Components",             showWhen: "Medium-duty (some), heavy-duty, bus, or trailer", hideWhen: "Cars, SUVs, light-duty pickups" },
  { feature: "DEF / SCR Service",                showWhen: "2010+ diesel (EPA mandate)",                     hideWhen: "Pre-2010 diesel, all gasoline vehicles" },
  { feature: "DPF Service",                      showWhen: "2007+ diesel (EPA mandate)",                     hideWhen: "Pre-2007 diesel, all gasoline vehicles" },
  { feature: "EGR System",                       showWhen: "Most diesel and many gasoline vehicles",         hideWhen: "Some older or exempt vehicles" },
  { feature: "Transfer Case Fluid",              showWhen: "4WD or AWD vehicles",                            hideWhen: "2WD vehicles" },
  { feature: "PTO (Power Take-Off)",             showWhen: "Work trucks / vocational trucks",                hideWhen: "Cars, SUVs, most consumer pickups" },
  { feature: "DOT / FMCSA Inspection",           showWhen: "Commercial vehicles (CDL required)",             hideWhen: "Non-commercial vehicles" },
  { feature: "CVT Diagnosis",                    showWhen: "CVT-equipped vehicles",                          hideWhen: "Non-CVT vehicles" },
  { feature: "Allison Transmission Diagnostics", showWhen: "Vehicles with Allison transmissions",            hideWhen: "Non-Allison vehicles" },
  { feature: "King Pin Service",                 showWhen: "Heavy-duty trucks with solid steer axle",        hideWhen: "Independent front suspension vehicles" },
  { feature: "EVAP System Diagnostics",          showWhen: "Gasoline vehicles only",                         hideWhen: "All diesel vehicles" },
  { feature: "Spark Plug Service",               showWhen: "Gasoline engines only",                          hideWhen: "Diesel engines" },
  { feature: "Glow Plug Service",                showWhen: "Diesel engines only",                            hideWhen: "Gasoline engines" },
];

// Helper to check if a feature should be shown based on vehicle info
export function shouldShowFeature(
  feature: string,
  vehicleClass: VehicleClass,
  fuelType: string,
  year: number,
  driveType?: string, // "4WD" | "AWD" | "2WD" | "FWD" | "RWD"
): boolean {
  const isDiesel = fuelType?.toLowerCase().includes("diesel");
  const isGasoline = !isDiesel;
  const isHeavyDuty = vehicleClass === "heavy_duty" || vehicleClass === "trailer";
  const isMediumOrHeavy = vehicleClass === "medium_duty" || isHeavyDuty;
  const isLightDuty = vehicleClass === "light_duty";
  const is4WD = driveType === "4WD" || driveType === "AWD";

  switch (feature) {
    case "secondary_air_filter":
      return isHeavyDuty && isDiesel;
    case "secondary_fuel_filter":
      return isDiesel && isMediumOrHeavy;
    case "water_separator":
      return isDiesel;
    case "air_brake":
      return isMediumOrHeavy;
    case "def_scr":
      return isDiesel && year >= 2010;
    case "dpf":
      return isDiesel && year >= 2007;
    case "egr":
      return true; // Most vehicles
    case "transfer_case":
      return is4WD;
    case "pto":
      return vehicleClass === "heavy_duty" || vehicleClass === "medium_duty";
    case "dot_inspection":
      return isMediumOrHeavy;
    case "evap":
      return isGasoline;
    case "spark_plugs":
      return isGasoline;
    case "glow_plugs":
      return isDiesel;
    case "king_pin":
      return vehicleClass === "heavy_duty";
    default:
      return true;
  }
}

// ============================================================
// STATUS & UI ICONS
// ============================================================

export const STATUS_ICONS: Record<string, { icon: string; color: string }> = {
  pending:       { icon: "clock-outline",           color: "#F39C12" },
  confirmed:     { icon: "calendar-check",          color: "#3498DB" },
  in_progress:   { icon: "progress-wrench",         color: "#E67E22" },
  waiting_parts: { icon: "package-variant-closed",  color: "#9B59B6" },
  completed:     { icon: "check-circle",            color: "#27AE60" },
  cancelled:     { icon: "close-circle",            color: "#E74C3C" },
  requires_auth: { icon: "alert-circle",            color: "#E74C3C" },
  invoice_sent:  { icon: "receipt-text",             color: "#2C3E50" },
  paid:          { icon: "cash-check",              color: "#27AE60" },
};

export const PRIORITY_ICONS: Record<string, { icon: string; color: string }> = {
  safety_critical: { icon: "alert-octagon",  color: "#E74C3C" },
  urgent:          { icon: "alert",          color: "#E67E22" },
  recommended:     { icon: "information",    color: "#3498DB" },
  optional:        { icon: "clock-alert",    color: "#95A5A6" },
};

export const ACTION_ICONS: Record<string, string> = {
  add:          "plus-circle",
  remove:       "minus-circle",
  edit:         "pencil",
  delete:       "delete",
  search:       "magnify",
  filter:       "filter-variant",
  sort:         "sort-variant",
  share:        "share-variant",
  print:        "printer",
  camera:       "camera",
  upload_photo: "image-plus",
  scan_vin:     "barcode-scan",
  call:         "phone",
  message:      "message-text",
  map:          "map-marker",
  approve:      "check-bold",
  decline:      "close-thick",
  signature:    "draw",
  refresh:      "refresh",
  download_pdf: "file-pdf-box",
};

// ============================================================
// COLOR PALETTE
// ============================================================

export const COLORS = {
  primaryBlue:   "#1B4F72",
  secondaryBlue: "#2E86C1",
  successGreen:  "#27AE60",
  warningOrange: "#E67E22",
  dangerRed:     "#E74C3C",
  accentYellow:  "#F1C40F",
  purple:        "#8E44AD",
  darkText:      "#2C3E50",
  lightGray:     "#BDC3C7",
  background:    "#F8F9FA",
  cardWhite:     "#FFFFFF",
};
