import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // All vehicles
  const allVehicles = await prisma.vehicle.findMany({
    include: { user: { select: { id: true, fullName: true, email: true } } }
  });
  
  console.log('\n=== ALL VEHICLES IN DATABASE ===');
  console.log('Total:', allVehicles.length);
  allVehicles.forEach(v => {
    console.log('---');
    console.log('  Vehicle ID:', v.id);
    console.log('  User:', v.user.fullName, '-', v.user.email);
    console.log('  User ID:', v.user.id);
    console.log('  Make:', v.make, '| Model:', v.model, '| Year:', v.year);
    console.log('  Plate:', v.plateNumber, '| VIN:', v.vin);
    console.log('  isPrimary:', v.isPrimary, '| isActive:', v.isActive);
    console.log('  Created:', v.createdAt);
  });

  // All users (customers)
  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' as any },
    select: { id: true, fullName: true, email: true }
  });
  
  console.log('\n=== ALL CUSTOMERS ===');
  customers.forEach(c => {
    console.log('  ', c.id, '-', c.fullName, '-', c.email);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
