import { prisma } from './prisma.js';
import { maskPhoneNumber } from './paymentMethods.js';
import { serializeActiveTrip } from './activeTrip.js';

function formatPlanName(plan: string) {
  if (plan === 'basic') return 'Basic';
  if (plan === 'plus') return 'Plus';
  if (plan === 'family') return 'Family';
  if (plan === 'trip') return 'Trip Cover';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function shortenPolicyId(id: string, createdAt?: Date) {
  const date = createdAt ? createdAt.toISOString().slice(0, 10).replace(/-/g, '') : '';
  const suffix = id.slice(-6).toUpperCase();
  return date ? `SAFE-${date}-${suffix}` : `SAFE-${suffix}`;
}

function serializeCover(cover: {
  id: string;
  plan: string;
  status: string;
  startedAt: Date;
  endsAt: Date;
  createdAt: Date;
  payment?: { status: string } | null;
}) {
  const now = Date.now();
  const endsMs = cover.endsAt.getTime();
  let status: 'active' | 'expired' | 'pending' = 'active';
  if (cover.payment?.status === 'pending') {
    status = 'pending';
  } else if (endsMs <= now || cover.status === 'expired' || cover.status === 'cancelled') {
    status = 'expired';
  } else if (cover.status === 'active') {
    status = 'active';
  }

  return {
    id: cover.id,
    policyId: shortenPolicyId(cover.id, cover.createdAt),
    planName: formatPlanName(cover.plan),
    status,
    startsAt: cover.startedAt.toISOString(),
    endsAt: cover.endsAt.toISOString(),
    paymentStatus: cover.payment?.status ?? null,
  };
}

function serializeTripFromCover(cover: Awaited<ReturnType<typeof loadCoverWithRelations>>) {
  if (!cover) return null;
  const trip = serializeActiveTrip(cover);
  if (!trip) return null;

  const route = trip.route;
  const vehicleLoc = trip.vehicleLocation;

  return {
    id: trip.tripId,
    status: cover.status === 'active' && cover.endsAt > new Date() ? 'active' : 'ended',
    startLocation: route?.start
      ? { lat: route.start.lat, lng: route.start.lng, label: route.from ?? undefined }
      : undefined,
    currentLocation:
      vehicleLoc?.lat != null && vehicleLoc?.lng != null
        ? { lat: vehicleLoc.lat, lng: vehicleLoc.lng }
        : undefined,
    endLocation: route?.destination
      ? { lat: route.destination.lat, lng: route.destination.lng, label: route.to ?? undefined }
      : undefined,
    lastUpdatedAt: vehicleLoc?.updatedAt ?? undefined,
    mapTrip: trip,
  };
}

async function loadCoverWithRelations(coverId: string, userId: string) {
  return prisma.tripCover.findFirst({
    where: { id: coverId, passengerUserId: userId },
    include: {
      vehicle: { include: { route: true, driver: true } },
      route: true,
      payment: true,
    },
  });
}

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  createdAt: string;
};

function pushActivity(items: ActivityItem[], item: ActivityItem) {
  if (items.some((x) => x.id === item.id)) return;
  items.push(item);
}

export async function buildHomeSummary(userId: string) {
  const now = new Date();

  const [profile, user, activeRow, latestCover, claims, contacts] = await Promise.all([
    prisma.passengerProfile.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { phone: true, email: true } }),
    prisma.tripCover.findFirst({
      where: { passengerUserId: userId, status: 'active', endsAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { include: { route: true, driver: true } },
        route: true,
        payment: true,
      },
    }),
    prisma.tripCover.findFirst({
      where: { passengerUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { payment: true },
    }),
    prisma.claim.findMany({
      where: { passengerUserId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    prisma.trustedContact.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 3,
    }),
  ]);

  const pendingRow =
    !activeRow || activeRow.payment?.status === 'pending'
      ? await prisma.tripCover.findFirst({
          where: {
            passengerUserId: userId,
            payment: { status: 'pending' },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            vehicle: { include: { route: true, driver: true } },
            route: true,
            payment: true,
          },
        })
      : null;

  let activeCover: ReturnType<typeof serializeCover> | null = null;
  let displayCover: ReturnType<typeof serializeCover> | null = null;

  if (activeRow && activeRow.payment?.status !== 'pending') {
    activeCover = serializeCover(activeRow);
    displayCover = activeCover;
  } else if (pendingRow) {
    displayCover = serializeCover(pendingRow);
  } else if (latestCover && latestCover.endsAt <= now) {
    displayCover = serializeCover(latestCover);
  }

  const tripSource = activeRow ?? pendingRow;
  const activeTrip = tripSource ? serializeTripFromCover(tripSource) : null;

  const latestClaim = claims[0]
    ? {
        id: claims[0].id,
        reference: `CLM-${claims[0].id.slice(-6).toUpperCase()}`,
        status: claims[0].status,
        updatedAt: claims[0].updatedAt.toISOString(),
      }
    : null;

  const activity: ActivityItem[] = [];

  const recentCovers = await prisma.tripCover.findMany({
    where: { passengerUserId: userId },
    orderBy: { createdAt: 'desc' },
    take: 8,
    include: { payment: true },
  });

  for (const cover of recentCovers) {
    pushActivity(activity, {
      id: `cover-buy-${cover.id}`,
      type: 'cover_purchased',
      title: `${formatPlanName(cover.plan)} cover purchased`,
      subtitle: cover.payment?.status === 'pending' ? 'Payment pending' : undefined,
      createdAt: cover.createdAt.toISOString(),
    });
    if (cover.endsAt <= now || cover.status === 'expired') {
      pushActivity(activity, {
        id: `cover-expired-${cover.id}`,
        type: 'cover_expired',
        title: `${formatPlanName(cover.plan)} cover ended`,
        createdAt: cover.endsAt.toISOString(),
      });
    }
    if (cover.payment?.status === 'succeeded') {
      pushActivity(activity, {
        id: `payment-ok-${cover.payment.id}`,
        type: 'payment_succeeded',
        title: 'Payment successful',
        subtitle: formatPlanName(cover.plan),
        createdAt: cover.payment.updatedAt.toISOString(),
      });
    }
    if (cover.payment?.status === 'failed') {
      pushActivity(activity, {
        id: `payment-fail-${cover.payment.id}`,
        type: 'payment_failed',
        title: 'Payment failed',
        subtitle: formatPlanName(cover.plan),
        createdAt: cover.payment.updatedAt.toISOString(),
      });
    }
  }

  for (const claim of claims) {
    pushActivity(activity, {
      id: `claim-${claim.id}`,
      type: 'claim_submitted',
      title: 'Claim submitted',
      subtitle: claim.status,
      createdAt: claim.createdAt.toISOString(),
    });
  }

  for (const contact of contacts) {
    pushActivity(activity, {
      id: `contact-${contact.id}-${contact.updatedAt.getTime()}`,
      type: 'trusted_contact_updated',
      title: 'Trusted contact updated',
      subtitle: contact.name,
      createdAt: contact.updatedAt.toISOString(),
    });
  }

  activity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const maskedPhone = user?.phone ? maskPhoneNumber(user.phone) : undefined;

  return {
    user: {
      fullName: profile?.fullName?.trim() || undefined,
      maskedPhone,
    },
    activeCover,
    displayCover,
    activeTrip,
    latestClaim,
    recentActivity: activity.slice(0, 3),
  };
}
