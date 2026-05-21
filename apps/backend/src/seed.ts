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

