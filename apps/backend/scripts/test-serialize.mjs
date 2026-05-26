import { prisma } from '../src/lib/prisma.js';
import { serializeActiveTripPayload } from '../src/lib/activeTrip.js';
const user = await prisma.user.findFirst({ where: { phone: '+260977123458' } });
const cover = await prisma.tripCover.findFirst({
  where: { passengerUserId: user.id, status: 'active' },
  orderBy: { createdAt: 'desc' },
  include: {
    vehicle: { include: { route: true, driver: true } },
    route: true,
    payment: true,
    tripTracking: true,
  },
});
console.log('cover', cover?.id, 'tracking', cover?.tripTracking?.id);
const trip = serializeActiveTripPayload(cover, cover?.tripTracking);
console.log(trip?.id, trip?.routePolyline?.length);
await prisma.$disconnect();
