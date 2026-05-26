/**
 * QA helpers for QR capture and verification states.
 * Usage: node apps/backend/scripts/qaQrStates.mjs <command> [args]
 *
 * Commands:
 *   seed-all
 *   valid-code
 *   invalid-code
 *   expired-code
 *   disabled-code
 *   vehicle-id
 */
import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/auth.js';

const MATERO_TOWN_POLYLINE = JSON.stringify([
  { lat: -15.3745, lng: 28.278 },
  { lat: -15.395, lng: 28.281 },
  { lat: -15.4164, lng: 28.2822 },
]);

const QA_USERS = {
  noCover: { phone: '+260977300001', password: 'testpass123', fullName: 'QR No Cover' },
  activeCover: { phone: '+260977300002', password: 'testpass123', fullName: 'QR Active Cover' },
  expiredCover: { phone: '+260977300003', password: 'testpass123', fullName: 'QR Expired Cover' },
  errorCache: { phone: '+260977300004', password: 'testpass123', fullName: 'QR Error Cache' },
};

export const QR_CODES = {
  valid: 'SAFE-LSK-8KJ29X',
  invalid: 'SAFE-INV-000000',
  expired: 'SAFE-LSK-EXP001',
  disabled: 'SAFE-LSK-DSB001',
};

async function ensurePartner() {
  return prisma.transportPartner.upsert({
    where: { id: 'partner-qa-transport' },
    create: { id: 'partner-qa-transport', name: 'Lusaka Minibus Co-op' },
    update: { name: 'Lusaka Minibus Co-op' },
  });
}

async function ensureRoute() {
  return prisma.route.upsert({
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
      polyline: MATERO_TOWN_POLYLINE,
    },
  });
}

async function ensureVehicle(routeId, partnerId) {
  return prisma.vehicle.upsert({
    where: { plateNumber: 'LSK 2481' },
    create: {
      plateNumber: 'LSK 2481',
      busId: 'LSK-2481',
      routeId,
      transportPartnerId: partnerId,
      lastLat: -15.395,
      lastLng: 28.281,
      locationAt: new Date(),
    },
    update: {
      routeId,
      transportPartnerId: partnerId,
    },
  });
}

async function upsertQr(code, vehicleId, partnerId, status, expiresAt = null) {
  const isActive = status === 'active';
  return prisma.qRCode.upsert({
    where: { code },
    create: {
      code,
      type: 'vehicle',
      targetId: vehicleId,
      vehicleId,
      partnerId,
      status,
      isActive,
      expiresAt,
    },
    update: {
      vehicleId,
      partnerId,
      status,
      isActive,
      expiresAt,
      targetId: vehicleId,
    },
  });
}

async function ensureUser({ phone, password, fullName }) {
  const existing = await prisma.user.findFirst({ where: { phone } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      phone,
      passwordHash: await hashPassword(password),
      role: 'passenger',
      passengerProfile: { create: { fullName } },
    },
  });
}

async function clearUserCovers(userId) {
  await prisma.tripTracking.deleteMany({ where: { tripCover: { passengerUserId: userId } } });
  await prisma.payment.deleteMany({ where: { tripCover: { passengerUserId: userId } } });
  await prisma.tripCover.deleteMany({ where: { passengerUserId: userId } });
}

async function createCover(userId, vehicleId, routeId, status, paymentStatus) {
  const endsAt =
    status === 'expired'
      ? new Date(Date.now() - 60_000)
      : new Date(Date.now() + 4 * 60 * 60_000);
  return prisma.tripCover.create({
    data: {
      passengerUserId: userId,
      vehicleId,
      routeId,
      plan: 'basic',
      status: status === 'expired' ? 'expired' : 'active',
      amount: 3,
      endsAt,
      payment: {
        create: {
          amount: 3,
          method: 'airtel',
          status: paymentStatus,
        },
      },
    },
    include: { payment: true },
  });
}

async function seedAll() {
  const partner = await ensurePartner();
  const route = await ensureRoute();
  const vehicle = await ensureVehicle(route.id, partner.id);

  await upsertQr(QR_CODES.valid, vehicle.id, partner.id, 'active');
  await upsertQr(QR_CODES.expired, vehicle.id, partner.id, 'expired', new Date(Date.now() - 86_400_000));
  await upsertQr(QR_CODES.disabled, vehicle.id, partner.id, 'disabled');

  for (const user of Object.values(QA_USERS)) {
    await ensureUser(user);
  }

  const noCoverUser = await ensureUser(QA_USERS.noCover);
  const activeUser = await ensureUser(QA_USERS.activeCover);
  const expiredUser = await ensureUser(QA_USERS.expiredCover);

  await clearUserCovers(noCoverUser.id);
  await clearUserCovers(activeUser.id);
  await clearUserCovers(expiredUser.id);

  await createCover(activeUser.id, vehicle.id, route.id, 'active', 'succeeded');
  await createCover(expiredUser.id, vehicle.id, route.id, 'expired', 'succeeded');

  console.log(
    JSON.stringify({
      vehicleId: vehicle.id,
      routeId: route.id,
      codes: QR_CODES,
      users: QA_USERS,
    }),
  );
}

async function main() {
  const [command] = process.argv.slice(2);
  if (command === 'seed-all') {
    await seedAll();
    return;
  }
  if (command === 'valid-code') {
    console.log(QR_CODES.valid);
    return;
  }
  if (command === 'invalid-code') {
    console.log(QR_CODES.invalid);
    return;
  }
  if (command === 'expired-code') {
    console.log(QR_CODES.expired);
    return;
  }
  if (command === 'disabled-code') {
    console.log(QR_CODES.disabled);
    return;
  }
  if (command === 'vehicle-id') {
    const vehicle = await prisma.vehicle.findFirst({ where: { plateNumber: 'LSK 2481' } });
    console.log(vehicle?.id ?? '');
    return;
  }
  throw new Error('Usage: qaQrStates.mjs <seed-all|valid-code|invalid-code|expired-code|disabled-code|vehicle-id>');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
