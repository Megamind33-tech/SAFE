/**
 * QA helpers for Home capture and related end-to-end seeds.
 * Usage: npx tsx apps/backend/scripts/qaHomeStates.mjs <command> <phone>
 *
 * Commands:
 *   clear-covers <phone>
 *   succeed-payment <phone>
 *   expire-latest <phone>
 *   trip-active <phone>   — active TripTracking on latest active cover
 */
import { prisma } from '../src/lib/prisma.js';

const [command, phone] = process.argv.slice(2);

async function findUser(phoneNumber) {
  const user = await prisma.user.findFirst({ where: { phone: phoneNumber } });
  if (!user) throw new Error(`User not found: ${phoneNumber}`);
  return user;
}

async function latestCover(userId) {
  const cover = await prisma.tripCover.findFirst({
    where: { passengerUserId: userId },
    orderBy: { createdAt: 'desc' },
    include: { payment: true, route: true },
  });
  if (!cover) throw new Error('No cover for user');
  return cover;
}

async function main() {
  if (!phone) {
    throw new Error(
      'Usage: qaHomeStates.mjs <clear-covers|succeed-payment|expire-latest|trip-active> <phone>',
    );
  }

  const user = await findUser(phone);

  if (command === 'clear-covers') {
    await prisma.tripTracking.deleteMany({ where: { tripCover: { passengerUserId: user.id } } });
    await prisma.tripCover.deleteMany({ where: { passengerUserId: user.id } });
    console.log('covers_cleared');
    return;
  }

  const cover = await latestCover(user.id);

  if (command === 'succeed-payment') {
    if (!cover.payment) throw new Error('No payment on cover');
    await prisma.payment.update({
      where: { id: cover.payment.id },
      data: { status: 'succeeded' },
    });
    await prisma.tripCover.update({
      where: { id: cover.id },
      data: { status: 'active', startedAt: cover.startedAt ?? new Date() },
    });
    console.log('payment_succeeded', cover.id);
    return;
  }

  if (command === 'expire-latest') {
    await prisma.tripCover.update({
      where: { id: cover.id },
      data: { status: 'expired', endsAt: new Date(Date.now() - 60_000) },
    });
    console.log('cover_expired', cover.id);
    return;
  }

  if (command === 'trip-active') {
    const active = await prisma.tripCover.findFirst({
      where: { passengerUserId: user.id, status: 'active' },
      orderBy: { createdAt: 'desc' },
      include: { route: true },
    });
    if (!active) throw new Error('No active cover for trip seed');

    await prisma.tripTracking.deleteMany({ where: { tripCoverId: active.id } });
    const now = new Date();
    const lat = active.route?.originLat ?? -15.405;
    const lng = active.route?.originLng ?? 28.29;
    const tracking = await prisma.tripTracking.create({
      data: {
        tripCoverId: active.id,
        status: 'active',
        startedAt: now,
        startLat: lat,
        startLng: lng,
        currentLat: active.route?.destinationLat ?? -15.392,
        currentLng: active.route?.destinationLng ?? 28.318,
        currentRecordedAt: now,
        lastUpdatedAt: now,
      },
    });
    console.log('trip_active', tracking.id, active.id);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
