import type { Payment, TripCover } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { getCoverPlanById } from './coverPlans.js';

type CoverWithPayment = TripCover & {
  payment: Payment | null;
  vehicle?: { plateNumber: string; busId: string | null; route: { origin: string; destination: string } | null } | null;
  route?: { origin: string; destination: string } | null;
};

export function shortenPolicyId(coverId: string, createdAt?: Date) {
  const date = createdAt ? createdAt.toISOString().slice(0, 10).replace(/-/g, '') : '';
  const suffix = coverId.slice(-6).toUpperCase();
  return date ? `SAFE-${date}-${suffix}` : `SAFE-${suffix}`;
}

export function formatPlanName(plan: string) {
  const found = getCoverPlanById(plan);
  if (found) return found.name.replace(/ Cover$/, '').replace(/^(\w+)/, (m) => m);
  if (plan === 'basic') return 'Basic';
  if (plan === 'plus') return 'Plus';
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export function serializeActiveCover(cover: CoverWithPayment | null) {
  if (!cover) return null;
  const now = Date.now();
  const endsMs = cover.endsAt.getTime();
  let status: 'active' | 'expired' | 'pending' = 'active';
  if (cover.payment?.status === 'pending') status = 'pending';
  else if (endsMs <= now || cover.status === 'expired' || cover.status === 'cancelled') status = 'expired';

  return {
    id: cover.id,
    policyId: shortenPolicyId(cover.id, cover.createdAt),
    planId: cover.plan,
    planName: formatPlanName(cover.plan),
    status,
    startsAt: cover.startedAt.toISOString(),
    endsAt: cover.endsAt.toISOString(),
    paymentStatus: cover.payment?.status ?? null,
    paymentReference: cover.payment?.reference ?? cover.payment?.id ?? null,
    amount: cover.amount,
    currency: cover.currency,
    route: cover.route
      ? { origin: cover.route.origin, destination: cover.route.destination }
      : cover.vehicle?.route
        ? { origin: cover.vehicle.route.origin, destination: cover.vehicle.route.destination }
        : null,
    vehicle: cover.vehicle
      ? { plateNumber: cover.vehicle.plateNumber, busId: cover.vehicle.busId }
      : null,
  };
}

export async function loadActiveCoverForUser(userId: string) {
  const now = new Date();
  return prisma.tripCover.findFirst({
    where: {
      passengerUserId: userId,
      status: 'active',
      endsAt: { gt: now },
      payment: { status: 'succeeded' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { include: { route: true, driver: true } },
      route: true,
      payment: true,
    },
  });
}

export async function loadPendingCoverForUser(userId: string) {
  return prisma.tripCover.findFirst({
    where: {
      passengerUserId: userId,
      payment: { status: 'pending' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { include: { route: true } },
      route: true,
      payment: true,
    },
  });
}

/** Most recent ended cover (for hub expired state when nothing is active). */
export async function loadLastEndedCoverForUser(userId: string) {
  const now = new Date();
  return prisma.tripCover.findFirst({
    where: {
      passengerUserId: userId,
      payment: { status: 'succeeded' },
      OR: [{ endsAt: { lte: now } }, { status: { in: ['expired', 'cancelled'] } }],
    },
    orderBy: { endsAt: 'desc' },
    include: {
      vehicle: { include: { route: true, driver: true } },
      route: true,
      payment: true,
    },
  });
}

export function coverCapabilities() {
  return {
    paymentGatewayEnabled: env.paymentGatewayEnabled,
    cardPaymentsEnabled: env.cardPaymentsEnabled,
    allowCoverStacking: env.allowCoverStacking,
    allowCoverExtension: env.allowCoverExtension,
  };
}

export async function startCoverPurchase(
  userId: string,
  input: {
    planId: string;
    paymentMethodId: string;
    vehicleId?: string;
    startMode?: string;
  },
) {
  const plan = getCoverPlanById(input.planId);
  if (!plan || !plan.isAvailable) {
    throw new Error('Selected plan is not available.');
  }

  const active = await loadActiveCoverForUser(userId);
  if (active && !env.allowCoverStacking) {
    const err = new Error('You already have active cover.');
    (err as Error & { statusCode?: number }).statusCode = 409;
    throw err;
  }

  const savedMethod = await prisma.savedPaymentMethod.findFirst({
    where: { id: input.paymentMethodId, userId },
  });
  if (!savedMethod) {
    throw new Error('Payment method not found.');
  }

  if (savedMethod.type === 'card' && !env.cardPaymentsEnabled) {
    throw new Error('Card payments are not available yet.');
  }

  if (!env.paymentGatewayEnabled) {
    return {
      purchase: {
        id: null as string | null,
        status: 'not_configured' as const,
        paymentStatus: 'not_configured',
        message: 'Payment provider is not connected yet. No cover was activated.',
      },
      cover: null,
    };
  }

  const vehicle = input.vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: input.vehicleId },
        include: { route: true },
      })
    : null;

  const endsAt = new Date(Date.now() + plan.durationMinutes * 60_000);

  const cover = await prisma.tripCover.create({
    data: {
      passengerUserId: userId,
      plan: plan.id,
      amount: plan.price,
      currency: 'ZMW',
      endsAt,
      vehicleId: vehicle?.id ?? null,
      routeId: vehicle?.routeId ?? null,
      payment: {
        create: {
          amount: plan.price,
          currency: 'ZMW',
          method: savedMethod.type,
          status: 'pending',
          reference: savedMethod.id,
        },
      },
    },
    include: {
      payment: true,
      vehicle: { include: { route: true } },
      route: true,
    },
  });

  return {
    purchase: {
      id: cover.payment!.id,
      status: 'pending' as const,
      paymentStatus: 'pending',
      message: 'Complete the payment request on your phone to activate cover.',
    },
    cover: serializeActiveCover(cover),
  };
}

export async function getPurchaseStatus(userId: string, purchaseId: string) {
  const payment = await prisma.payment.findFirst({
    where: { id: purchaseId, tripCover: { passengerUserId: userId } },
    include: {
      tripCover: {
        include: {
          vehicle: { include: { route: true } },
          route: true,
          payment: true,
        },
      },
    },
  });

  if (!payment?.tripCover) {
    return null;
  }

  if (
    env.paymentSimulateSuccess &&
    payment.status === 'pending' &&
    Date.now() - payment.createdAt.getTime() > 2000
  ) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'succeeded' },
    });
    payment.status = 'succeeded';
  }

  const cover = payment.tripCover;
  let purchaseStatus: 'pending' | 'failed' | 'succeeded' | 'requires_action' | 'not_configured' =
    'pending';

  if (payment.status === 'succeeded') purchaseStatus = 'succeeded';
  else if (payment.status === 'failed') purchaseStatus = 'failed';

  const serialized =
    payment.status === 'succeeded' ? serializeActiveCover(cover as CoverWithPayment) : null;

  return {
    purchase: {
      id: payment.id,
      status: purchaseStatus,
      paymentStatus: payment.status,
      message:
        purchaseStatus === 'succeeded'
          ? 'Your SAFE cover is now active.'
          : purchaseStatus === 'failed'
            ? 'Your cover was not activated.'
            : 'Complete the payment request on your phone to activate cover.',
    },
    cover: serialized,
  };
}
