import type { PaymentStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { activateCoverFromPayment } from './coverPurchase.js';

const TERMINAL_STATUSES: string[] = ['succeeded', 'failed', 'reversed', 'disputed'];

export async function applyPaymentWebhookUpdate(input: {
  paymentId?: string;
  reference?: string;
  status: 'succeeded' | 'failed' | 'reversed' | 'disputed';
  providerReference?: string;
  amount?: number;
  currency?: string;
}) {
  if (!env.paymentGatewayEnabled) {
    return { ok: false, reason: 'payment_gateway_disabled' as const };
  }

  // ── Idempotency check: same providerReference already processed → return cached result.
  if (input.providerReference) {
    const existing = await (prisma.payment as any).findUnique({
      where: { providerReference: input.providerReference },
      include: { tripCover: true },
    });
    if (existing && TERMINAL_STATUSES.includes(existing.status)) {
      return { ok: true as const, payment: existing, idempotent: true };
    }
  }

  // ── Locate payment by paymentId, internalReference, or legacy reference field.
  let payment = input.paymentId
    ? await (prisma.payment as any).findUnique({
        where: { id: input.paymentId },
        include: { tripCover: true },
      })
    : null;

  if (!payment && input.reference) {
    payment = await (prisma.payment as any).findFirst({
      where: {
        OR: [
          { id: input.reference },
          { internalReference: input.reference },
          { reference: input.reference },
        ],
      },
      include: { tripCover: true },
    });
  }

  if (!payment) {
    return { ok: false, reason: 'payment_not_found' as const };
  }

  // ── Do not re-process terminal payments (other than idempotent success).
  if (TERMINAL_STATUSES.includes(payment.status)) {
    if (payment.status === 'succeeded' && input.status === 'succeeded') {
      return { ok: true as const, payment, idempotent: true };
    }
    return { ok: false, reason: 'already_terminal' as const };
  }

  // ── Amount verification (when provider sends it — reject mismatches).
  if (input.amount != null && payment.amount !== input.amount) {
    await prisma.auditLog.create({
      data: {
        action: 'payment.webhook.amount_mismatch',
        entityType: 'Payment',
        entityId: payment.id,
        meta: JSON.stringify({
          expected: payment.amount,
          received: input.amount,
          providerReference: input.providerReference ?? null,
        }),
      },
    });
    return { ok: false, reason: 'amount_mismatch' as const };
  }

  // ── Currency verification.
  if (input.currency && payment.currency !== input.currency) {
    await prisma.auditLog.create({
      data: {
        action: 'payment.webhook.currency_mismatch',
        entityType: 'Payment',
        entityId: payment.id,
        meta: JSON.stringify({
          expected: payment.currency,
          received: input.currency,
          providerReference: input.providerReference ?? null,
        }),
      },
    });
    return { ok: false, reason: 'currency_mismatch' as const };
  }

  const now = new Date();

  // ── Persist providerReference before processing (enables idempotency on retries).
  if (input.providerReference) {
    await (prisma.payment as any).update({
      where: { id: payment.id },
      data: { providerReference: input.providerReference },
    });
  }

  // ── Succeeded: route through the single activation gate.
  if (input.status === 'succeeded') {
    try {
      const result = await activateCoverFromPayment(payment.id, 'provider_webhook');
      return { ok: true as const, payment: result.payment };
    } catch (err) {
      return {
        ok: false,
        reason: 'activation_failed' as const,
        detail: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ── Failed: cancel cover.
  if (input.status === 'failed') {
    const [updated] = await prisma.$transaction([
      (prisma.payment as any).update({
        where: { id: payment.id },
        data: { status: 'failed', failedAt: now },
        include: { tripCover: true },
      }),
      prisma.tripCover.update({
        where: { id: payment.tripCoverId },
        data: { status: 'cancelled' },
      }),
      prisma.auditLog.create({
        data: {
          action: 'payment.failed.provider_webhook',
          entityType: 'Payment',
          entityId: payment.id,
          meta: JSON.stringify({ providerReference: input.providerReference ?? null }),
        },
      }),
    ]);
    return { ok: true as const, payment: updated };
  }

  // ── Reversed / disputed: flag fraud, log, but do NOT automatically deactivate
  //    the cover — that requires a human decision. The fraud flag surfaces it in dashboard.
  if (input.status === 'reversed' || input.status === 'disputed') {
    const [updated] = await prisma.$transaction([
      (prisma.payment as any).update({
        where: { id: payment.id },
        data: { status: input.status, reversedAt: now },
        include: { tripCover: true },
      }),
      prisma.auditLog.create({
        data: {
          action: `payment.${input.status}.provider_webhook`,
          entityType: 'Payment',
          entityId: payment.id,
          meta: JSON.stringify({
            coverId: payment.tripCoverId,
            providerReference: input.providerReference ?? null,
          }),
        },
      }),
      prisma.fraudFlag.create({
        data: {
          severity: 'high',
          reason: `Payment ${input.status} received for cover ${payment.tripCoverId} — manual review required.`,
          userId: payment.tripCover?.passengerUserId ?? null,
        },
      }),
    ]);
    return { ok: true as const, payment: updated };
  }

  return { ok: false, reason: 'invalid_status' as const };
}

export function paymentWebhookPlaceholderInfo() {
  return {
    enabled: env.paymentGatewayEnabled,
    simulateSuccess: env.paymentSimulateSuccess,
    note: 'Wire your payment gateway to POST status updates here. Include providerReference for idempotency and amount+currency for verification.',
    expectedBody: {
      paymentId: 'our internal payment cuid (OR)',
      reference: 'our internalReference (SAFE-PAY-YYYYMMDD-XXXXXX)',
      providerReference: 'provider transaction id — used for idempotency',
      amount: 'integer in smallest currency unit for verification',
      currency: 'ZMW for verification',
      status: 'succeeded | failed | reversed | disputed',
    },
  };
}
