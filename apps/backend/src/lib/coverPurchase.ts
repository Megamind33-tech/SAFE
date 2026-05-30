import type { Payment, TripCover } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { getCoverPlanById } from './coverPlans.js';
import { ensureUniquePaymentReference } from './paymentReference.js';

type CoverWithPayment = TripCover & {
  payment: Payment | null;
  vehicle?: { plateNumber: string; busId: string | null; route: { origin: string; destination: string } | null } | null;
  route?: { origin: string; destination: string } | null;
};

type ExtPayment = Payment & {
  internalReference?: string | null;
  providerReference?: string | null;
  confirmedAt?: Date | null;
  reversedAt?: Date | null;
};
type ExtCover = TripCover & { activationSource?: string | null };

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
  const extPayment = cover.payment as ExtPayment | null;
  const extCover = cover as ExtCover;

  let status: 'active' | 'expired' | 'pending' = 'active';
  if (
    extCover.activationSource == null &&
    (cover.status === 'pending_payment' || cover.payment?.status === 'pending')
  ) {
    status = 'pending';
  } else if (cover.status === 'pending_payment' || cover.payment?.status === 'pending') {
    status = 'pending';
  } else if (
    endsMs <= now ||
    cover.status === 'expired' ||
    cover.status === 'cancelled'
  ) {
    status = 'expired';
  }

  const trackable = status === 'active' && endsMs > now;

  return {
    id: cover.id,
    policyId: shortenPolicyId(cover.id, cover.createdAt),
    planId: cover.plan,
    planName: formatPlanName(cover.plan),
    status,
    trackable,
    activationSource: extCover.activationSource ?? null,
    startsAt: cover.startedAt.toISOString(),
    endsAt: cover.endsAt.toISOString(),
    paymentStatus: cover.payment?.status ?? null,
    paymentReference:
      extPayment?.internalReference ?? cover.payment?.reference ?? cover.payment?.id ?? null,
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
      OR: [
        { status: 'pending_payment' },
        { payment: { status: 'pending' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      vehicle: { include: { route: true } },
      route: true,
      payment: true,
    },
  });
}

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

/**
 * The ONLY function that may transition a cover from pending_payment → active.
 * All cover activations must go through here so they are audited and sourced.
 */
export async function activateCoverFromPayment(
  paymentId: string,
  source: 'provider_webhook' | 'simulate_dev' | 'manual_admin_override',
  opts: { actorUserId?: string; adminNote?: string } = {},
): Promise<{ payment: Payment; cover: TripCover }> {
  const now = new Date();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { tripCover: true },
  });
  if (!payment) throw new Error('Payment not found.');
  if (!payment.tripCover) throw new Error('Cover not found for payment.');

  // Idempotent — already activated.
  if (payment.status === 'succeeded' && payment.tripCover.status === 'active') {
    return { payment, cover: payment.tripCover };
  }

  if (payment.status === 'reversed' || payment.status === 'disputed') {
    throw new Error(`Cannot activate cover: payment is ${payment.status}.`);
  }

  const plan = getCoverPlanById(payment.tripCover.plan);
  const endsAt = plan
    ? new Date(now.getTime() + plan.durationMinutes * 60_000)
    : payment.tripCover.endsAt;

  const [updatedPayment, updatedCover] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'succeeded', confirmedAt: now } as Parameters<typeof prisma.payment.update>[0]['data'],
    }),
    prisma.tripCover.update({
      where: { id: payment.tripCoverId },
      data: {
        status: 'active',
        startedAt: now,
        endsAt,
        activationSource: source,
      } as Parameters<typeof prisma.tripCover.update>[0]['data'],
    }),
    prisma.auditLog.create({
      data: {
        actorUserId: opts.actorUserId ?? null,
        action: `payment.activated.${source}`,
        entityType: 'Payment',
        entityId: paymentId,
        meta: JSON.stringify({
          source,
          coverId: payment.tripCoverId,
          adminNote: opts.adminNote ?? null,
          amount: payment.amount,
          currency: payment.currency,
        }),
      },
    }),
  ]);

  return { payment: updatedPayment, cover: updatedCover };
}

export async function startCoverPurchase(
  userId: string,
  input: {
    planId: string;
    paymentMethodId: string;
    vehicleId?: string;
    routeId?: string;
    qrCodeId?: string;
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

  if (input.qrCodeId) {
    const qrRecord = await prisma.qRCode.findUnique({ where: { id: input.qrCodeId } });
    if (!qrRecord || qrRecord.status !== 'active' || !qrRecord.isActive) {
      throw new Error('QR code is not valid for cover purchase.');
    }
    if (input.vehicleId && qrRecord.vehicleId && qrRecord.vehicleId !== input.vehicleId) {
      throw new Error('QR code does not match the selected vehicle.');
    }
  }

  // Provisional end time — recalculated from actual confirmation time in activateCoverFromPayment.
  const provisionalEndsAt = new Date(Date.now() + plan.durationMinutes * 60_000);
  const internalReference = await ensureUniquePaymentReference();

  const cover = await prisma.tripCover.create({
    data: {
      passengerUserId: userId,
      plan: plan.id,
      status: 'pending_payment',
      amount: plan.price,
      currency: 'ZMW',
      endsAt: provisionalEndsAt,
      vehicleId: vehicle?.id ?? null,
      routeId: input.routeId ?? vehicle?.routeId ?? null,
      payment: {
        create: {
          amount: plan.price,
          currency: 'ZMW',
          method: savedMethod.type,
          status: 'pending',
          internalReference,
        } as Parameters<typeof prisma.payment.create>[0]['data'],
      },
    },
    include: {
      payment: true,
      vehicle: { include: { route: true } },
      route: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: 'payment.initiated',
      entityType: 'Payment',
      entityId: cover.payment!.id,
      meta: JSON.stringify({
        coverId: cover.id,
        planId: plan.id,
        amount: plan.price,
        currency: 'ZMW',
        method: savedMethod.type,
        internalReference,
      }),
    },
  });

  return {
    purchase: {
      id: cover.payment!.id,
      status: 'pending' as const,
      paymentStatus: 'pending',
      internalReference,
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

  if (!payment?.tripCover) return null;

  // Dev-only simulate: runs after 2 s, writes full audit trail.
  if (
    env.paymentSimulateSuccess &&
    payment.status === 'pending' &&
    Date.now() - payment.createdAt.getTime() > 2000
  ) {
    await activateCoverFromPayment(payment.id, 'simulate_dev', { actorUserId: userId });
    const refreshed = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        tripCover: {
          include: { vehicle: { include: { route: true } }, route: true, payment: true },
        },
      },
    });
    if (refreshed) {
      payment.status = refreshed.status as typeof payment.status;
      if (refreshed.tripCover) Object.assign(payment.tripCover, refreshed.tripCover);
    }
  }

  const cover = payment.tripCover;
  let purchaseStatus: 'pending' | 'failed' | 'succeeded' | 'requires_action' | 'not_configured' =
    'pending';

  if (payment.status === 'succeeded') purchaseStatus = 'succeeded';
  else if (
    payment.status === 'failed' ||
    payment.status === 'reversed' ||
    payment.status === 'disputed'
  ) {
    purchaseStatus = 'failed';
  }

  const extPayment = payment as ExtPayment;
  const serialized =
    payment.status === 'succeeded' ? serializeActiveCover(cover as CoverWithPayment) : null;

  return {
    purchase: {
      id: payment.id,
      status: purchaseStatus,
      paymentStatus: payment.status,
      internalReference: extPayment.internalReference ?? null,
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
