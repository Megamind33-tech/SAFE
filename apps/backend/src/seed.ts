import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

async function main() {
  const adminEmail = 'admin@safe.local';
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: '+260000000000',
        passwordHash: await hashPassword('admin1234'),
        role: 'super_admin',
      },
    });
  }

  const route = await prisma.route.upsert({
    where: { id: 'route-matero-town' },
    create: { id: 'route-matero-town', origin: 'Matero', destination: 'Town' },
    update: {},
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: 'LSK 2481' },
    create: { plateNumber: 'LSK 2481', busId: 'LSK-2481', routeId: route.id },
    update: { busId: 'LSK-2481', routeId: route.id },
  });

  await prisma.qRCode.upsert({
    where: { code: 'SAFE-LSK-2481' },
    create: { code: 'SAFE-LSK-2481', vehicleId: vehicle.id, isActive: true },
    update: { vehicleId: vehicle.id, isActive: true },
  });

  // Cover products
  await prisma.coverProduct.upsert({
    where: { id: 'cover-basic' },
    create: { id: 'cover-basic', name: 'Basic Cover', price: 3, currency: 'ZMW', durationMinutes: 240, coverageAmount: 5000, description: 'Single trip cover for 4 hours. Accident and medical coverage up to K5,000.' },
    update: { name: 'Basic Cover', price: 3, durationMinutes: 240, coverageAmount: 5000, description: 'Single trip cover for 4 hours. Accident and medical coverage up to K5,000.' },
  });

  await prisma.coverProduct.upsert({
    where: { id: 'cover-plus' },
    create: { id: 'cover-plus', name: 'Plus Cover', price: 5, currency: 'ZMW', durationMinutes: 480, coverageAmount: 15000, description: 'Enhanced trip cover for 8 hours. Accident, medical, and luggage coverage up to K15,000.' },
    update: { name: 'Plus Cover', price: 5, durationMinutes: 480, coverageAmount: 15000, description: 'Enhanced trip cover for 8 hours. Accident, medical, and luggage coverage up to K15,000.' },
  });

  await prisma.coverProduct.upsert({
    where: { id: 'cover-daily' },
    create: { id: 'cover-daily', name: 'Daily Cover', price: 10, currency: 'ZMW', durationMinutes: 1440, coverageAmount: 25000, description: 'Full day cover for 24 hours. Comprehensive accident, medical, and luggage coverage up to K25,000.' },
    update: { name: 'Daily Cover', price: 10, durationMinutes: 1440, coverageAmount: 25000, description: 'Full day cover for 24 hours. Comprehensive accident, medical, and luggage coverage up to K25,000.' },
  });

  // Additional routes
  const route2 = await prisma.route.upsert({
    where: { id: 'route-chilenje-town' },
    create: { id: 'route-chilenje-town', origin: 'Chilenje', destination: 'Town' },
    update: {},
  });

  const route3 = await prisma.route.upsert({
    where: { id: 'route-kabwata-town' },
    create: { id: 'route-kabwata-town', origin: 'Kabwata', destination: 'Town' },
    update: {},
  });

  // Additional vehicles
  await prisma.vehicle.upsert({
    where: { plateNumber: 'ABZ 3392' },
    create: { plateNumber: 'ABZ 3392', busId: 'ABZ-3392', routeId: route2.id },
    update: { routeId: route2.id },
  });

  await prisma.vehicle.upsert({
    where: { plateNumber: 'KAB 1150' },
    create: { plateNumber: 'KAB 1150', busId: 'KAB-1150', routeId: route3.id },
    update: { routeId: route3.id },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

