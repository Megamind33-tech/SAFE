import type { PaymentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';

const ALLOWED_STATUSES: PaymentStatus[] = ['pending', 'succeeded', 'failed'];

export async function applyPaymentWebhookUpdate(input: {
  paymentId?: string;
  reference?: string;
  status: PaymentStatus;
  providerEventId?: string;
}) {
  if (!env.paymentGatewayEnabled) {
    return { ok: false, reason: 'payment_gateway_disabled' as const };
  }

  if (!ALLOWED_STATUSES.includes(input.status)) {
    return { ok: false, reason: 'invalid_status' as const };
  }

  const payment = input.paymentId
    ? await prisma.payment.findUnique({
        where: { id: input.paymentId },
        include: { tripCover: true },
      })
    : input.reference
      ? await prisma.payment.findFirst({
          where: { OR: [{ id: input.reference }, { reference: input.reference }] },
          include: { tripCover: true },
        })
      : null;

  if (!payment) {
    return { ok: false, reason: 'payment_not_found' as const };
  }

  if (payment.status === 'succeeded' && input.status !== 'succeeded') {
    return { ok: false, reason: 'already_succeeded' as const };
  }

  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: input.status,
      reference: input.providerEventId ?? payment.reference,
    },
    include: { tripCover: { include: { payment: true, vehicle: true, route: true } } },
  });

  if (input.status === 'failed') {
    await prisma.tripCover.update({
      where: { id: payment.tripCoverId },
      data: { status: 'cancelled' },
    });
  }

  return { ok: true as const, payment: updated };
}

export function paymentWebhookPlaceholderInfo() {
  return {
    enabled: env.paymentGatewayEnabled,
    simulateSuccess: env.paymentSimulateSuccess,
    note:
      'Provider webhook handler placeholder. Wire your gateway to POST status updates here before production go-live.',
    expectedBody: {
      paymentId: 'payment cuid',
      reference: 'optional provider reference',
      status: 'pending | succeeded | failed',
      providerEventId: 'optional external event id',
    },
  };
}
