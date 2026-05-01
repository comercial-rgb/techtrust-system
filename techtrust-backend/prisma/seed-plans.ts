import { logger } from "../src/config/logger";
/**
 * Seed ONLY plan templates (safe for production)
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  logger.info("📋 Seeding subscription plan templates...\n");

  const planTemplates = [
    {
      planKey: "free",
      name: "Free",
      description: "Perfect for getting started",
      monthlyPrice: 0,
      yearlyPrice: 0,
      vehicleLimit: 2,
      serviceRequestsPerMonth: 4,
      features: ["2 vehicles (+$6.99/extra)", "4 service requests/month", "VIN decode & NHTSA recalls", "FDACS compliance", "PDF receipts"],
      isActive: true,
      isFeatured: false,
      position: 0,
    },
    {
      planKey: "starter",
      name: "Starter",
      description: "For individuals who want more",
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      vehicleLimit: 3,
      serviceRequestsPerMonth: 10,
      features: ["3 vehicles (+$5.99/extra)", "10 service requests/month", "Multi-language support", "Mileage tracker", "Scheduled maintenance", "Quote sharing", "1 oil change/year included", "10% SOS discount"],
      isActive: true,
      isFeatured: false,
      position: 1,
    },
    {
      planKey: "pro",
      name: "Pro",
      description: "Best value for families & growing needs",
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      vehicleLimit: 5,
      serviceRequestsPerMonth: null,
      features: ["5 vehicles (+$3.99/extra)", "Unlimited service requests", "OEM parts lookup", "Digital wallet", "Expense reports", "OBD2 basic diagnostics", "2 oil changes + 1 brake inspection/year", "20% SOS discount + priority", "Priority support 24/7"],
      isActive: true,
      isFeatured: true,
      position: 2,
    },
    {
      planKey: "enterprise",
      name: "Enterprise",
      description: "For families, businesses & fleets",
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      vehicleLimit: 14,
      serviceRequestsPerMonth: null,
      features: ["14 vehicles (custom pricing)", "Unlimited service requests", "Vehicle dashboard & analytics", "Advanced OBD2 diagnostics", "4 oil changes + unlimited inspections/year", "2 free SOS/month + 30% discount", "All Pro features included", "Dedicated account manager"],
      isActive: true,
      isFeatured: false,
      position: 3,
    },
  ];

  for (const template of planTemplates) {
    const result = await prisma.subscriptionPlanTemplate.upsert({
      where: { planKey: template.planKey },
      update: {
        name: template.name,
        description: template.description,
        monthlyPrice: template.monthlyPrice,
        yearlyPrice: template.yearlyPrice,
        vehicleLimit: template.vehicleLimit,
        serviceRequestsPerMonth: template.serviceRequestsPerMonth,
        features: template.features,
        isActive: template.isActive,
        isFeatured: template.isFeatured,
        position: template.position,
      },
      create: template,
    });
    logger.info(`  ✅ ${result.name} (${result.planKey}) - $${result.monthlyPrice}/mo`);
  }

  logger.info("\n✅ Done! 4 plan templates seeded.");
}

main()
  .catch((e: unknown) => logger.error(String(e)))
  .finally(() => prisma.$disconnect());
