/**
 * Seed live trip QA states for capture-live-trip.mjs
 * Usage: node scripts/qaTripStates.mjs <mode>
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const mode = process.argv[2] || 'active-route';

const QA_PHONE = '+260977123458';
const PASSWORD_HASH = '$2a$10$XQn8Y5zqJ5zqJ5zqJ5zqJ.uK8zqJ5zqJ5zqJ5zqJ5zqJ5zqJ5zq';

const LUSAKA_POLYLINE = JSON.stringify([
  { lat: -15.416, lng: 28.281 },
  { lat: -15.408, lng: 28.29 },
  { lat: -15.398, lng: 28.305 },
  { lat: -15.392, lng: 28.318 },
]);

async function ensureUser() {
  let user = await prisma.user.findFirst({ where: { phone: QA_PHONE } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: QA_PHONE,
        passwordHash: PASSWORD_HASH,
        role: 'passenger',
        passengerProfile: { create: { fullName: 'Trip QA User' } },
      },
    });
  }
  return user;
}

async function clearUserData(userId) {
  await prisma.tripTracking.deleteMany({ where: { tripCover: { passengerUserId: userId } } });
  await prisma.tripCover.deleteMany({ where: { passengerUserId: userId } });
}

async function createCover(userId, { withRoute = true, hoursLeft = 3 } = {}) {
  const now = new Date();
  const endsAt = new Date(now.getTime() + hoursLeft * 60 * 60 * 1000);
  let route = null;
  let vehicle = null;
  if (withRoute) {
    route = await prisma.route.create({
      data: {
        origin: 'Matero',
        destination: 'Town',
        originLat: -15.416,
        originLng: 28.281,
        destinationLat: -15.392,
        destinationLng: 28.318,
        polyline: LUSAKA_POLYLINE,
      },
    });
    vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: `QA-${Date.now().toString(36).slice(-4).toUpperCase()}`,
        routeId: route.id,
        lastLat: -15.398,
        lastLng: 28.305,
        locationAt: now,
      },
    });
  }
  const cover = await prisma.tripCover.create({
    data: {
      passengerUserId: userId,
      plan: 'plus',
      status: 'active',
      amount: 500,
      endsAt,
      routeId: route?.id,
      vehicleId: vehicle?.id,
      payment: {
        create: { method: 'airtel', status: 'succeeded', amount: 500 },
      },
    },
  });
  return { cover, route, vehicle };
}

async function main() {
  const user = await ensureUser();
  await clearUserData(user.id);

  if (mode === 'cover-expired') {
    const { cover } = await createCover(user.id);
    await prisma.tripCover.update({
      where: { id: cover.id },
      data: { endsAt: new Date(Date.now() - 60_000) },
    });
    await prisma.tripTracking.create({
      data: {
        tripCoverId: cover.id,
        status: 'active',
        startedAt: new Date(Date.now() - 3600_000),
        startLat: -15.405,
        startLng: 28.29,
        currentLat: -15.398,
        currentLng: 28.305,
        currentRecordedAt: new Date(Date.now() - 120_000),
        lastUpdatedAt: new Date(Date.now() - 120_000),
      },
    });
    console.log(JSON.stringify({ mode, coverId: cover.id, phone: QA_PHONE }));
    return;
  }

  if (mode === 'no-cover') {
    console.log(JSON.stringify({ mode, userId: user.id, phone: QA_PHONE }));
    return;
  }

  if (mode === 'active-cover-no-trip') {
    const { cover } = await createCover(user.id);
    console.log(JSON.stringify({ mode, coverId: cover.id, phone: QA_PHONE }));
    return;
  }

  const withRoute = mode === 'active-route' || mode === 'stale' || mode === 'ended';
  const { cover, route } = await createCover(user.id, { withRoute: mode !== 'active-no-route' });

  const now = new Date();
  let trackingData = {
    tripCoverId: cover.id,
    status: 'active',
    startedAt: now,
    startLat: route?.originLat ?? -15.405,
    startLng: route?.originLng ?? 28.29,
    currentLat: -15.398,
    currentLng: 28.305,
    currentRecordedAt: now,
    lastUpdatedAt: now,
  };

  if (mode === 'active-no-route') {
    trackingData = {
      tripCoverId: cover.id,
      status: 'active',
      startedAt: now,
      startLat: -15.405,
      startLng: 28.29,
      currentLat: -15.401,
      currentLng: 28.295,
      currentRecordedAt: now,
      lastUpdatedAt: now,
    };
  }

  if (mode === 'stale') {
    const staleAt = new Date(now.getTime() - 35 * 60 * 1000);
    trackingData.currentRecordedAt = staleAt;
    trackingData.lastUpdatedAt = staleAt;
  }

  if (mode === 'ended') {
    trackingData.status = 'ended';
    trackingData.endedAt = now;
  }

  if (mode === 'no-trip') {
    console.log(JSON.stringify({ mode, coverId: cover.id, phone: QA_PHONE, note: 'cover without tracking' }));
    return;
  }

  const tracking = await prisma.tripTracking.create({ data: trackingData });
  console.log(JSON.stringify({ mode, coverId: cover.id, tripId: tracking.id, phone: QA_PHONE }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
