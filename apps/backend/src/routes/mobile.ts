import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

export const mobileRouter = Router();

mobileRouter.use(requireAuth);
mobileRouter.use(requireRole(['passenger']));

function generatePolicyNumber(): string {
  const d = new Date();
  const datePart = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SAFE-${datePart}-${rand}`;
}

async function expireOverdueCovers() {
  const now = new Date();
  await prisma.tripCover.updateMany({
    where: { status: 'active', endsAt: { lte: now } },
    data: { status: 'expired' },
  });
}

mobileRouter.get('/profile', async (req, res) => {
  const authed = req as AuthedRequest;
  const profile = await prisma.passengerProfile.findUnique({
    where: { userId: authed.user.id },
  });
  res.json({ profile });
});

mobileRouter.patch('/profile', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({ fullName: z.string().min(2).max(80) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const profile = await prisma.passengerProfile.upsert({
    where: { userId: authed.user.id },
    create: { userId: authed.user.id, fullName: parsed.data.fullName },
    update: { fullName: parsed.data.fullName },
  });

  res.json({ profile });
});

mobileRouter.post('/vehicle/verify', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    plateNumber: z.string().min(3).optional(),
    busId: z.string().min(3).optional(),
    qrCode: z.string().min(3).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { plateNumber, busId, qrCode } = parsed.data;
  if (!plateNumber && !busId && !qrCode) {
    res.status(400).json({ error: 'Provide plateNumber, busId, or qrCode' });
    return;
  }

  let vehicleId: string | null = null;
  let qrCodeRecord: { id: string } | null = null;

  if (qrCode) {
    const record = await prisma.qRCode.findUnique({ where: { code: qrCode } });
    if (!record || !record.isActive) {
      res.status(404).json({ error: 'QR code not found or inactive' });
      return;
    }
    vehicleId = record.vehicleId;
    qrCodeRecord = record;
  }

  let vehicle = vehicleId
    ? await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { route: true, driver: true, transportPartner: true } })
    : null;

  if (!vehicle) {
    vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          plateNumber ? { plateNumber } : undefined,
          busId ? { busId } : undefined,
        ].filter(Boolean) as any,
      },
      include: { route: true, driver: true, transportPartner: true },
    });
  }

  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found. Please check the plate number or QR code.' });
    return;
  }

  await prisma.qRScan.create({
    data: {
      scannedByUserId: authed.user.id,
      vehicleId: vehicle.id,
      qrCodeId: qrCodeRecord?.id ?? null,
      result: 'valid',
    },
  });

  res.json({
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      busId: vehicle.busId,
    },
    route: vehicle.route
      ? { id: vehicle.route.id, origin: vehicle.route.origin, destination: vehicle.route.destination }
      : null,
    driver: vehicle.driver
      ? { fullName: vehicle.driver.fullName }
      : null,
    transportPartner: vehicle.transportPartner
      ? { name: vehicle.transportPartner.name }
      : null,
  });
});

mobileRouter.post('/cover/buy', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    coverProductId: z.string().min(1),
    vehicleId: z.string().min(1).optional(),
    plateNumber: z.string().min(3).optional(),
    paymentMethod: z.string().min(2).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const product = await prisma.coverProduct.findUnique({ where: { id: parsed.data.coverProductId } });
  if (!product || !product.isActive) {
    res.status(404).json({ error: 'Cover product not found or inactive' });
    return;
  }

  const vehicle =
    parsed.data.vehicleId
      ? await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId }, include: { route: true } })
      : parsed.data.plateNumber
        ? await prisma.vehicle.findUnique({ where: { plateNumber: parsed.data.plateNumber }, include: { route: true } })
        : null;

  const policyNumber = generatePolicyNumber();
  const endsAt = new Date(Date.now() + product.durationMinutes * 60_000);
  const paymentRef = `SBX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const cover = await prisma.tripCover.create({
    data: {
      passengerUserId: authed.user.id,
      plan: product.name,
      coverProductId: product.id,
      policyNumber,
      status: 'pending_payment',
      amount: product.price,
      currency: product.currency,
      endsAt,
      vehicleId: vehicle?.id ?? null,
      routeId: vehicle?.routeId ?? null,
      payment: {
        create: {
          amount: product.price,
          currency: product.currency,
          method: parsed.data.paymentMethod ?? 'mobile_money',
          status: 'initiated',
          reference: paymentRef,
        },
      },
    },
    include: { payment: true, vehicle: { include: { route: true } }, route: true, coverProduct: true },
  });

  res.json({
    cover: {
      id: cover.id,
      plan: cover.plan,
      policyNumber: cover.policyNumber,
      status: cover.status,
      amount: cover.amount,
      currency: cover.currency,
      coverageAmount: cover.coverProduct?.coverageAmount ?? 0,
      durationMinutes: cover.coverProduct?.durationMinutes ?? 0,
      startedAt: cover.startedAt,
      endsAt: cover.endsAt,
      route: cover.route
        ? { origin: cover.route.origin, destination: cover.route.destination }
        : cover.vehicle?.route
          ? { origin: cover.vehicle.route.origin, destination: cover.vehicle.route.destination }
          : null,
      vehicle: cover.vehicle ? { plateNumber: cover.vehicle.plateNumber, busId: cover.vehicle.busId } : null,
    },
    payment: cover.payment
      ? { id: cover.payment.id, status: cover.payment.status, method: cover.payment.method, amount: cover.payment.amount, reference: cover.payment.reference }
      : null,
  });
});

mobileRouter.post('/payment/confirm', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    paymentId: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { tripCover: true },
  });

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  if (payment.tripCover.passengerUserId !== authed.user.id) {
    res.status(403).json({ error: 'Not your payment' });
    return;
  }

  if (payment.status === 'succeeded') {
    res.json({ payment: { id: payment.id, status: payment.status }, alreadyConfirmed: true });
    return;
  }

  if (payment.status === 'failed') {
    res.status(400).json({ error: 'Payment already failed' });
    return;
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + (payment.tripCover.endsAt.getTime() - payment.tripCover.startedAt.getTime()));

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'succeeded', paidAt: now },
    }),
    prisma.tripCover.update({
      where: { id: payment.tripCoverId },
      data: { status: 'active', startedAt: now, endsAt },
    }),
  ]);

  res.json({
    payment: { id: updatedPayment.id, status: updatedPayment.status, paidAt: updatedPayment.paidAt },
    cover: {
      id: payment.tripCoverId,
      status: 'active',
      startedAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
    },
    serverTime: now.toISOString(),
  });
});

mobileRouter.get('/payment/:id/status', async (req: any, res) => {
  const authed = req as AuthedRequest;
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { tripCover: true },
  });

  if (!payment || payment.tripCover.passengerUserId !== authed.user.id) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  res.json({
    payment: {
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      reference: payment.reference,
      paidAt: payment.paidAt,
    },
    coverStatus: payment.tripCover.status,
  });
});

mobileRouter.get('/cover/active', async (req, res) => {
  const authed = req as AuthedRequest;
  await expireOverdueCovers();

  const now = new Date();
  const cover = await prisma.tripCover.findFirst({
    where: { passengerUserId: authed.user.id, status: 'active', endsAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    include: { vehicle: { include: { route: true } }, route: true, payment: true, coverProduct: true },
  });

  res.json({
    cover: cover ? {
      id: cover.id,
      plan: cover.plan,
      policyNumber: cover.policyNumber,
      status: cover.status,
      amount: cover.amount,
      currency: cover.currency,
      coverageAmount: cover.coverProduct?.coverageAmount ?? 0,
      startedAt: cover.startedAt,
      endsAt: cover.endsAt,
      route: cover.route
        ? { origin: cover.route.origin, destination: cover.route.destination }
        : cover.vehicle?.route
          ? { origin: cover.vehicle.route.origin, destination: cover.vehicle.route.destination }
          : null,
      vehicle: cover.vehicle ? { plateNumber: cover.vehicle.plateNumber, busId: cover.vehicle.busId } : null,
      payment: cover.payment ? { status: cover.payment.status } : null,
    } : null,
    serverTime: now.toISOString(),
  });
});

mobileRouter.get('/cover/history', async (req, res) => {
  const authed = req as AuthedRequest;
  await expireOverdueCovers();

  const covers = await prisma.tripCover.findMany({
    where: { passengerUserId: authed.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { vehicle: true, route: true, payment: true, coverProduct: true },
  });

  res.json({
    covers: covers.map(c => ({
      id: c.id,
      plan: c.plan,
      policyNumber: c.policyNumber,
      status: c.status,
      amount: c.amount,
      currency: c.currency,
      coverageAmount: c.coverProduct?.coverageAmount ?? 0,
      startedAt: c.startedAt,
      endsAt: c.endsAt,
      route: c.route
        ? { origin: c.route.origin, destination: c.route.destination }
        : null,
      vehicle: c.vehicle ? { plateNumber: c.vehicle.plateNumber } : null,
      paymentStatus: c.payment?.status ?? null,
    })),
  });
});

mobileRouter.post('/claims/create', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    tripCoverId: z.string().min(1),
    description: z.string().min(10).max(1000),
    policeReference: z.string().min(3).optional(),
    hospitalSlipUrl: z.string().min(3).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const cover = await prisma.tripCover.findUnique({ where: { id: parsed.data.tripCoverId } });
  if (!cover || cover.passengerUserId !== authed.user.id) {
    res.status(404).json({ error: 'Trip cover not found' });
    return;
  }

  if (cover.status !== 'active' && cover.status !== 'expired') {
    res.status(400).json({ error: 'Claims can only be submitted for active or recently expired cover' });
    return;
  }

  const claim = await prisma.claim.create({
    data: {
      tripCoverId: parsed.data.tripCoverId,
      passengerUserId: authed.user.id,
      description: parsed.data.description,
      policeReference: parsed.data.policeReference ?? null,
      hospitalSlipUrl: parsed.data.hospitalSlipUrl ?? null,
    },
  });

  res.json({ claim });
});

mobileRouter.get('/claims', async (req, res) => {
  const authed = req as AuthedRequest;
  const claims = await prisma.claim.findMany({
    where: { passengerUserId: authed.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      tripCover: {
        select: { plan: true, policyNumber: true, amount: true, currency: true, vehicle: { select: { plateNumber: true } }, route: { select: { origin: true, destination: true } } },
      },
    },
  });
  res.json({ claims });
});
