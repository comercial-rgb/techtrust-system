import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "contact@techtrustautosolutions.com" },
    include: { providerProfile: true },
  });

  if (!user) {
    console.log("User NOT FOUND");
    return;
  }

  console.log("User ID:", user.id);
  console.log("Role:", user.role);
  console.log("Phone Verified:", user.phoneVerified);
  console.log("Email Verified:", user.emailVerified);
  console.log("Status:", user.status);
  console.log("Has Provider Profile:", !!user.providerProfile);
  if (user.providerProfile) {
    console.log("Business Name:", user.providerProfile.businessName);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
