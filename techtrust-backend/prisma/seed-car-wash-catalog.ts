/**
 * Seed Car Wash Catalog Data
 * Pre-defined services, amenities, and payment methods
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚿 Seeding Car Wash catalog data...\n");

  // ============================================
  // SERVICE CATALOG
  // ============================================
  const services = [
    // Exterior Wash
    { key: "basic_exterior_wash", category: "exterior_wash", name: "Basic Exterior Wash", description: "Standard exterior vehicle wash with soap and rinse", sortOrder: 1 },
    { key: "presoak_bug_prep", category: "exterior_wash", name: "Presoak / Bug Prep Treatment", description: "Pre-treatment for removal of heavy dirt and bugs", sortOrder: 2 },
    { key: "high_pressure_rinse", category: "exterior_wash", name: "High-Pressure Rinse", description: "High-pressure water rinse for deep cleaning", sortOrder: 3 },
    { key: "foam_bath", category: "exterior_wash", name: "Foam Bath", description: "Full foam bath application", sortOrder: 4 },
    { key: "soft_cloth_wash", category: "exterior_wash", name: "Soft Cloth Wash", description: "Tunnel wash with soft rotating cloths", sortOrder: 5 },
    { key: "touchless_wash", category: "exterior_wash", name: "Touchless Wash", description: "No-contact wash using only water jets and chemicals", sortOrder: 6 },
    { key: "spot_free_rinse", category: "exterior_wash", name: "Spot-Free Rinse", description: "Final rinse with demineralized water to prevent spots", sortOrder: 7 },
    { key: "hand_wash", category: "exterior_wash", name: "Hand Wash", description: "Manual wash by attendants", sortOrder: 8 },

    // Protection
    { key: "carnauba_wax", category: "protection", name: "Carnauba Wax", description: "Natural carnauba wax application", sortOrder: 10 },
    { key: "polymer_sealant", category: "protection", name: "Polymer Sealant Spray", description: "Polymer-based paint sealant spray", sortOrder: 11 },
    { key: "ceramic_spray_coating", category: "protection", name: "Ceramic Spray Coating", description: "Ceramic protection spray (express, not professional)", sortOrder: 12 },
    { key: "triple_foam_polish", category: "protection", name: "Triple Foam Polish", description: "Tri-color foam with light polishing agents", sortOrder: 13 },
    { key: "hot_wax", category: "protection", name: "Hot Wax", description: "Hot wax spray application", sortOrder: 14 },
    { key: "rain_repellent", category: "protection", name: "Rain Repellent / Windshield Treatment", description: "Hydrophobic treatment for windshield", sortOrder: 15 },
    { key: "paint_protectant", category: "protection", name: "Paint Protectant Spray", description: "Additional paint protection spray", sortOrder: 16 },
    { key: "uv_protectant", category: "protection", name: "UV Protectant", description: "Protection against UV rays", sortOrder: 17 },

    // Wheels & Chassis
    { key: "tire_shine", category: "wheels_chassis", name: "Tire Shine / Tire Dressing", description: "Tire shine application for glossy finish", sortOrder: 20 },
    { key: "wheel_cleaning", category: "wheels_chassis", name: "Wheel Cleaning / Brake Dust Removal", description: "Cleaning of wheels and brake dust removal", sortOrder: 21 },
    { key: "undercarriage_wash", category: "wheels_chassis", name: "Undercarriage Wash", description: "Wash of vehicle underside - important for salt removal", sortOrder: 22 },
    { key: "undercarriage_rust_inhibitor", category: "wheels_chassis", name: "Undercarriage Rust Inhibitor", description: "Rust inhibitor applied to undercarriage", sortOrder: 23 },

    // Drying
    { key: "blow_dry", category: "drying", name: "Blow Dry / Air Dry", description: "Hot air jet drying", sortOrder: 30 },
    { key: "hand_dry", category: "drying", name: "Hand Dry by Attendant", description: "Manual drying with microfiber towels", sortOrder: 31 },
    { key: "chamois_dry", category: "drying", name: "Chamois Dry", description: "Drying with chamois cloth", sortOrder: 32 },

    // Interior Basic
    { key: "interior_vacuum", category: "interior_basic", name: "Interior Vacuum", description: "Vacuuming of interior surfaces", sortOrder: 40 },
    { key: "interior_wipe_down", category: "interior_basic", name: "Interior Wipe-Down", description: "Quick wipe of dashboard and surfaces", sortOrder: 41 },
    { key: "window_cleaning_interior", category: "interior_basic", name: "Window Cleaning (Interior)", description: "Cleaning of interior windows", sortOrder: 42 },
    { key: "door_jamb_cleaning", category: "interior_basic", name: "Door Jamb Cleaning", description: "Cleaning of door jambs", sortOrder: 43 },
    { key: "dashboard_console_cleaning", category: "interior_basic", name: "Dashboard & Console Cleaning", description: "Cleaning of dashboard and center console", sortOrder: 44 },
    { key: "cup_holder_cleaning", category: "interior_basic", name: "Cup Holder Cleaning", description: "Cleaning of cup holders", sortOrder: 45 },
    { key: "air_freshener", category: "interior_basic", name: "Air Freshener", description: "Interior air freshener application", sortOrder: 46 },
    { key: "floor_mat_cleaning", category: "interior_basic", name: "Floor Mat Cleaning", description: "Cleaning of floor mats", sortOrder: 47 },
    { key: "floor_mat_shampoo", category: "interior_basic", name: "Floor Mat Shampoo", description: "Shampooing of floor mats", sortOrder: 48 },

    // Additional
    { key: "pet_hair_removal", category: "additional", name: "Pet Hair Removal", description: "Removal of pet hair from interior", sortOrder: 50 },
    { key: "odor_elimination", category: "additional", name: "Odor Elimination", description: "Interior odor elimination treatment", sortOrder: 51 },
    { key: "leather_conditioning", category: "additional", name: "Leather Conditioning", description: "Basic leather hydration (not professional)", sortOrder: 52 },
    { key: "bug_removal", category: "additional", name: "Bug Removal", description: "Removal of bugs stuck on vehicle front", sortOrder: 53 },
    { key: "tree_sap_removal", category: "additional", name: "Tree Sap Removal", description: "Removal of tree sap from paint", sortOrder: 54 },
    { key: "clay_bar_treatment", category: "additional", name: "Clay Bar Treatment", description: "Paint decontamination with clay bar", sortOrder: 55 },
    { key: "headlight_restoration", category: "additional", name: "Headlight Restoration", description: "Restoration of yellowed headlights", sortOrder: 56 },
    { key: "engine_bay_rinse", category: "additional", name: "Engine Bay Rinse", description: "Superficial engine compartment wash", sortOrder: 57 },
  ];

  for (const s of services) {
    await prisma.carWashServiceCatalog.upsert({
      where: { key: s.key },
      update: { name: s.name, description: s.description, category: s.category, sortOrder: s.sortOrder },
      create: s,
    });
  }
  console.log(`  ✅ ${services.length} car wash services created/updated`);

  // ============================================
  // AMENITY CATALOG
  // ============================================
  const amenities = [
    { key: "free_vacuum", name: "Free Vacuum Stations", icon: "vacuum", sortOrder: 1 },
    { key: "free_mat_cleaner", name: "Free Mat Cleaner", icon: "broom", sortOrder: 2 },
    { key: "free_towels", name: "Free Towels for Drying", icon: "towel", sortOrder: 3 },
    { key: "free_tire_air", name: "Free Tire Air", icon: "tire", sortOrder: 4 },
    { key: "vending_machines", name: "Vending Machines", icon: "shopping", sortOrder: 5 },
    { key: "waiting_lounge", name: "Waiting Lounge", icon: "sofa", sortOrder: 6 },
    { key: "wifi", name: "Free WiFi", icon: "wifi", sortOrder: 7 },
    { key: "restroom", name: "Restroom Available", icon: "restroom", sortOrder: 8 },
    { key: "loyalty_program", name: "Loyalty Program", icon: "star", sortOrder: 9 },
  ];

  for (const a of amenities) {
    await prisma.carWashAmenityCatalog.upsert({
      where: { key: a.key },
      update: { name: a.name, icon: a.icon, sortOrder: a.sortOrder },
      create: a,
    });
  }
  console.log(`  ✅ ${amenities.length} amenities created/updated`);

  // ============================================
  // PAYMENT METHOD CATALOG
  // ============================================
  const paymentMethods = [
    { key: "credit_card", name: "Credit / Debit Card", icon: "credit-card", sortOrder: 1 },
    { key: "cash", name: "Cash", icon: "cash", sortOrder: 2 },
    { key: "apple_pay", name: "Apple Pay", icon: "apple", sortOrder: 3 },
    { key: "google_pay", name: "Google Pay", icon: "google", sortOrder: 4 },
    { key: "samsung_pay", name: "Samsung Pay", icon: "samsung", sortOrder: 5 },
    { key: "wash_codes", name: "Wash Codes", icon: "qr-code", sortOrder: 6 },
    { key: "gift_cards", name: "Gift Cards", icon: "gift", sortOrder: 7 },
    { key: "membership_rfid", name: "Membership RFID Tag", icon: "rfid", sortOrder: 8 },
    { key: "coins", name: "Coins (Quarters)", icon: "coins", sortOrder: 9 },
  ];

  for (const pm of paymentMethods) {
    await prisma.carWashPaymentMethodCatalog.upsert({
      where: { key: pm.key },
      update: { name: pm.name, icon: pm.icon, sortOrder: pm.sortOrder },
      create: pm,
    });
  }
  console.log(`  ✅ ${paymentMethods.length} payment methods created/updated`);

  console.log("\n🎉 Car Wash catalog seed complete!\n");
}

main()
  .catch((e) => {
    console.error("Error seeding car wash catalog:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
