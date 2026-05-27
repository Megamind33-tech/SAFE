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
  status: z.enum(['pending', 'succeeded', 'failed']),
  providerEventId: z.string().optional(),
});

webhooksRouter.post('/payment', async (req, res) => {
  const parsed = paymentWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid webhook payload', details: parsed.error.flatten() });
    return;
  }

  if (!parsed.data.paymentId && !parsed.data.reference) {
    res.status(400).json({ error: 'paymentId or reference is required' });
    return;
  }

  const result = await applyPaymentWebhookUpdate(parsed.data);
  if (!result.ok || !result.payment) {
    const status = result.reason === 'payment_not_found' ? 404 : 409;
    res.status(status).json({ error: result.reason });
    return;
  }

  const payment = result.payment;
  res.json({
    ok: true,
    payment: {
      id: payment.id,
      status: payment.status,
      tripCoverId: payment.tripCoverId,
    },
  });
});
