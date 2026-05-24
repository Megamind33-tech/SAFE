import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

const MATERO_TOWN_POLYLINE = JSON.stringify([
  { lat: -15.3745, lng: 28.278 },
  { lat: -15.382, lng: 28.2795 },
  { lat: -15.395, lng: 28.281 },
  { lat: -15.408, lng: 28.2818 },
  { lat: -15.4164, lng: 28.2822 },
]);

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
    create: {
      id: 'route-matero-town',
      origin: 'Matero',
      destination: 'Town',
      originLat: -15.3745,
      originLng: 28.278,
      destinationLat: -15.4164,
      destinationLng: 28.2822,
      polyline: MATERO_TOWN_POLYLINE,
    },
    update: {
      originLat: -15.3745,
      originLng: 28.278,
      destinationLat: -15.4164,
      destinationLng: 28.2822,
      polyline: MATERO_TOWN_POLYLINE,
    },
  });

  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: 'LSK 2481' },
    create: {
      plateNumber: 'LSK 2481',
      busId: 'LSK-2481',
      routeId: route.id,
      lastLat: -15.395,
      lastLng: 28.281,
      lastHeading: 185,
      locationAt: new Date(),
    },
    update: {
      busId: 'LSK-2481',
      routeId: route.id,
      lastLat: -15.395,
      lastLng: 28.281,
      lastHeading: 185,
      locationAt: new Date(),
    },
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
