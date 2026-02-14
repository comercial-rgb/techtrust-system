/**
 * Seed Content - Banners, Offers, Articles
 * Restaura conteúdo da Home do app
 * Execute: npx ts-node prisma/seed-content.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding content (banners, offers, articles)...\n');

  // ===========================================
  // BANNERS
  // ===========================================
  console.log('1️⃣ Creating banners...');

  const banners = [
    {
      title: 'Welcome to TechTrust',
      subtitle: 'Find trusted auto service providers near you',
      imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=400&fit=crop',
      linkType: 'none',
      position: 1,
      isActive: true,
      targetAudience: 'all',
    },
    {
      title: 'Free Oil Change Inspection',
      subtitle: 'Get a complimentary 15-point inspection with every oil change',
      imageUrl: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=800&h=400&fit=crop',
      linkType: 'internal',
      linkUrl: '/offers',
      position: 2,
      isActive: true,
      targetAudience: 'customers',
    },
    {
      title: 'Become a Provider',
      subtitle: 'Join TechTrust and grow your auto repair business',
      imageUrl: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&h=400&fit=crop',
      linkType: 'internal',
      linkUrl: '/signup-provider',
      position: 3,
      isActive: true,
      targetAudience: 'all',
    },
  ];

  for (const banner of banners) {
    await prisma.banner.create({ data: banner });
  }
  console.log(`   ✅ ${banners.length} banners created`);

  // ===========================================
  // SPECIAL OFFERS
  // ===========================================
  console.log('\n2️⃣ Creating special offers...');

  const offers = [
    {
      title: 'Oil Change Special',
      description: 'Full synthetic oil change with filter replacement. Includes multi-point inspection.',
      imageUrl: 'https://images.unsplash.com/photo-1635784065932-3f4cb2d23be1?w=400&h=300&fit=crop',
      discountType: 'percentage',
      discountValue: 15,
      discountLabel: '15% OFF',
      originalPrice: 69.99,
      discountedPrice: 59.49,
      position: 1,
      isActive: true,
      isFeatured: true,
      serviceType: 'oil_change',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Brake Service Deal',
      description: 'Complete brake inspection and pad replacement. Front or rear.',
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop',
      discountType: 'fixed',
      discountValue: 25,
      discountLabel: '$25 OFF',
      originalPrice: 199.99,
      discountedPrice: 174.99,
      position: 2,
      isActive: true,
      isFeatured: true,
      serviceType: 'brake_repair',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'AC System Check',
      description: 'Complete AC system diagnosis with refrigerant level check.',
      imageUrl: 'https://images.unsplash.com/photo-1625047509248-ec889cbff17f?w=400&h=300&fit=crop',
      discountType: 'free',
      discountValue: 0,
      discountLabel: 'FREE',
      originalPrice: 49.99,
      discountedPrice: 0,
      position: 3,
      isActive: true,
      isFeatured: false,
      serviceType: 'ac_service',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      title: 'Tire Rotation & Balance',
      description: 'Keep your tires wearing evenly. All 4 tires rotated and balanced.',
      imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=400&h=300&fit=crop',
      discountType: 'percentage',
      discountValue: 20,
      discountLabel: '20% OFF',
      originalPrice: 79.99,
      discountedPrice: 63.99,
      position: 4,
      isActive: true,
      isFeatured: false,
      serviceType: 'tire_service',
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const offer of offers) {
    await prisma.specialOffer.create({ data: offer });
  }
  console.log(`   ✅ ${offers.length} special offers created`);

  // ===========================================
  // ARTICLES
  // ===========================================
  console.log('\n3️⃣ Creating articles...');

  const articles = [
    {
      title: '5 Signs Your Brakes Need Attention',
      slug: '5-signs-brakes-need-attention',
      excerpt: 'Learn the warning signs that your brakes may need repair or replacement.',
      content: `Your brakes are one of the most critical safety systems in your vehicle. Here are 5 signs they need attention:\n\n1. **Squealing or grinding noises** when braking\n2. **Vibration or pulsation** in the brake pedal\n3. **Longer stopping distances** than usual\n4. **Pulling to one side** when braking\n5. **Brake warning light** on your dashboard\n\nIf you notice any of these signs, schedule a brake inspection immediately. At TechTrust, you can compare quotes from verified providers and get your brakes fixed quickly and affordably.`,
      imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=400&fit=crop',
      category: 'maintenance',
      tags: ['brakes', 'safety', 'maintenance'],
      readTime: '3 min read',
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date(),
    },
    {
      title: 'How Often Should You Change Your Oil?',
      slug: 'how-often-change-oil',
      excerpt: 'The answer depends on your vehicle, oil type, and driving habits.',
      content: `Oil changes are the most basic yet important maintenance for your engine.\n\n**Conventional oil:** Every 3,000-5,000 miles\n**Synthetic blend:** Every 5,000-7,500 miles\n**Full synthetic:** Every 7,500-10,000 miles\n\nAlways check your owner's manual for the manufacturer's recommendation. Modern vehicles with synthetic oil can often go longer between changes.\n\n**Factors that may require more frequent changes:**\n- Frequent short trips\n- Extreme temperatures\n- Towing or hauling heavy loads\n- Dusty or dirty conditions`,
      imageUrl: 'https://images.unsplash.com/photo-1635784065932-3f4cb2d23be1?w=600&h=400&fit=crop',
      category: 'tips',
      tags: ['oil change', 'maintenance', 'engine'],
      readTime: '4 min read',
      isPublished: true,
      isFeatured: false,
      publishedAt: new Date(),
    },
    {
      title: 'Understanding Your FDACS Rights in Florida',
      slug: 'fdacs-rights-florida-motor-vehicle-repair',
      excerpt: 'Know your rights under the Florida Motor Vehicle Repair Act.',
      content: `Florida law protects consumers when getting their vehicles repaired. Here's what you need to know:\n\n**Written Estimates (§559.905)**\n- Shops must provide a written estimate before starting any repair over $100\n- You cannot be charged more than 10% above the estimate without written authorization\n\n**Your Rights:**\n- Request return of replaced parts\n- Right to inspect replaced parts\n- Written invoice with detailed breakdown\n- Storage charges only apply after 3 working days\n\n**Mandated Fees:**\n- Tire fee: $1.00 per new tire (FS 403.718)\n- Battery fee: $1.50 per new battery (FS 403.7185)\n- These fees must be listed separately on your invoice\n\nTechTrust ensures all providers comply with FDACS requirements for your protection.`,
      imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&fit=crop',
      category: 'safety',
      tags: ['FDACS', 'Florida', 'consumer rights', 'regulations'],
      readTime: '5 min read',
      isPublished: true,
      isFeatured: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articles) {
    await prisma.article.create({ data: article });
  }
  console.log(`   ✅ ${articles.length} articles created`);

  // ===========================================
  // SUMMARY
  // ===========================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ CONTENT SEED COMPLETE!');
  console.log('='.repeat(50));
  console.log(`\n📊 Created:`);
  console.log(`   🖼️  ${banners.length} banners`);
  console.log(`   🏷️  ${offers.length} special offers`);
  console.log(`   📰 ${articles.length} articles`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding content:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
