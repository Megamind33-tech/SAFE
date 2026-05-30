import { Router } from 'express';
import { z } from 'zod';
import { applyPaymentWebhookUpdate, paymentWebhookPlaceholderInfo } from '../lib/paymentWebhook.js';

export const webhooksRouter = Router();

webhooksRouter.get('/payment', (_req, res) => {
  res.json(paymentWebhookPlaceholderInfo());
});

const paymentWebhookSchema = z.object({
  paymentId: z.string().optional(),
  reference: z.string().optional(),
  providerReference: z.string().optional(),
  status: z.enum(['pending', 'succeeded', 'failed', 'reversed', 'disputed']),
  amount: z.number().int().positive().optional(),
  currency: z.string().length(3).optional(),
});

webhooksRouter.post('/payment', async (req, res) => {
  const parsed = paymentWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid webhook payload', details: parsed.error.flatten() });
    return;
  }

  if (!parsed.data.paymentId && !parsed.data.reference && !parsed.data.providerReference) {
    res.status(400).json({ error: 'paymentId, reference, or providerReference is required' });
    return;
  }

  // 'pending' status has no effect on our side — only terminal transitions matter.
  if (parsed.data.status === 'pending') {
    res.json({ ok: true, note: 'pending status acknowledged; no action taken' });
    return;
  }

  const result = await applyPaymentWebhookUpdate({
    paymentId: parsed.data.paymentId,
    reference: parsed.data.reference,
    providerReference: parsed.data.providerReference,
    status: parsed.data.status as 'succeeded' | 'failed' | 'reversed' | 'disputed',
    amount: parsed.data.amount,
    currency: parsed.data.currency,
  });

  if (!result.ok) {
    const httpStatus =
      result.reason === 'payment_not_found' ? 404
      : result.reason === 'amount_mismatch' || result.reason === 'currency_mismatch' ? 422
      : 409;
    res.status(httpStatus).json({ error: result.reason });
    return;
  }

  const p = result.payment as Record<string, unknown>;
  res.json({
    ok: true,
    idempotent: (result as Record<string, unknown>).idempotent ?? false,
    payment: {
      id: p.id,
      status: p.status,
      tripCoverId: p.tripCoverId,
    },
  });
});
