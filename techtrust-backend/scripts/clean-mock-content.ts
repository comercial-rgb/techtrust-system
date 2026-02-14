import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const b = await prisma.banner.deleteMany({});
  const o = await prisma.specialOffer.deleteMany({});
  const a = await prisma.article.deleteMany({});
  console.log(
    `Deleted: ${b.count} banners, ${o.count} offers, ${a.count} articles`,
  );
  console.log(
    "✅ Mock content removed. Re-create real content via admin dashboard /conteudo",
  );
  await prisma.$disconnect();
}

main().catch(console.error);
