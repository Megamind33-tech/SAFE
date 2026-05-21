import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

export const mobileRouter = Router();

mobileRouter.use(requireAuth);
mobileRouter.use(requireRole(['passenger']));

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
  const schema = z.object({
    plateNumber: z.string().min(3).optional(),
    busId: z.string().min(3).optional(),
    qrCode: z.string().min(3).optional(),
    origin: z.string().min(2).optional(),
    destination: z.string().min(2).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { plateNumber, busId, qrCode, origin, destination } = parsed.data;
  if (!plateNumber && !busId && !qrCode) {
    res.status(400).json({ error: 'Provide plateNumber, busId, or qrCode' });
    return;
  }

  let vehicleId: string | null = null;
  if (qrCode) {
    const record = await prisma.qRCode.findUnique({ where: { code: qrCode } });
    vehicleId = record?.vehicleId ?? null;
  }

  let vehicle = vehicleId
    ? await prisma.vehicle.findUnique({ where: { id: vehicleId }, include: { route: true } })
    : null;

  if (!vehicle) {
    vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          plateNumber ? { plateNumber } : undefined,
          busId ? { busId } : undefined,
        ].filter(Boolean) as any,
      },
      include: { route: true },
    });
  }

  if (!vehicle) {
    const route = await prisma.route.create({
      data: { origin: origin ?? 'Matero', destination: destination ?? 'Town' },
    });
    vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: plateNumber ?? `TMP-${Math.random().toString(16).slice(2, 7).toUpperCase()}`,
        busId: busId ?? null,
        routeId: route.id,
      },
      include: { route: true },
    });
  }

  res.json({
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      busId: vehicle.busId,
    },
    route: vehicle.route
      ? { id: vehicle.route.id, origin: vehicle.route.origin, destination: vehicle.route.destination }
      : null,
  });
});

mobileRouter.post('/cover/buy', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    plan: z.enum(['basic', 'plus']),
    durationMinutes: z.number().int().min(30).max(24 * 60).optional(),
    vehicleId: z.string().min(1).optional(),
    plateNumber: z.string().min(3).optional(),
    paymentMethod: z.string().min(2).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const durationMinutes = parsed.data.durationMinutes ?? 240;
  const endsAt = new Date(Date.now() + durationMinutes * 60_000);
  const amount = parsed.data.plan === 'basic' ? 3 : 5;

  const vehicle =
    parsed.data.vehicleId
      ? await prisma.vehicle.findUnique({ where: { id: parsed.data.vehicleId }, include: { route: true } })
      : parsed.data.plateNumber
        ? await prisma.vehicle.findUnique({ where: { plateNumber: parsed.data.plateNumber }, include: { route: true } })
        : null;

  const cover = await prisma.tripCover.create({
    data: {
      passengerUserId: authed.user.id,
      plan: parsed.data.plan,
      amount,
      currency: 'ZMW',
      endsAt,
      vehicleId: vehicle?.id ?? null,
      routeId: vehicle?.routeId ?? null,
      payment: {
        create: {
          amount,
          currency: 'ZMW',
          method: parsed.data.paymentMethod ?? 'mobile_money',
          status: 'pending',
        },
      },
    },
    include: { payment: true, vehicle: { include: { route: true } }, route: true },
  });

  res.json({
    cover: {
      id: cover.id,
      plan: cover.plan,
      status: cover.status,
      amount: cover.amount,
      currency: cover.currency,
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
      ? { id: cover.payment.id, status: cover.payment.status, method: cover.payment.method, amount: cover.payment.amount }
      : null,
  });
});

mobileRouter.get('/cover/active', async (req, res) => {
  const authed = req as AuthedRequest;
  const now = new Date();
  const cover = await prisma.tripCover.findFirst({
    where: { passengerUserId: authed.user.id, status: 'active', endsAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    include: { vehicle: { include: { route: true } }, route: true, payment: true },
  });
  res.json({ cover });
});

mobileRouter.get('/cover/history', async (req, res) => {
  const authed = req as AuthedRequest;
  const covers = await prisma.tripCover.findMany({
    where: { passengerUserId: authed.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { vehicle: true, route: true, payment: true },
  });
  res.json({ covers });
});

mobileRouter.post('/claims/create', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    tripCoverId: z.string().min(1).optional(),
    description: z.string().min(10).max(1000),
    policeReference: z.string().min(3).optional(),
    hospitalSlipUrl: z.string().min(3).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const coverId = parsed.data.tripCoverId
    ? parsed.data.tripCoverId
    : (
        await prisma.tripCover.findFirst({
          where: { passengerUserId: authed.user.id },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
      )?.id;

  if (!coverId) {
    res.status(400).json({ error: 'No trip cover found to attach claim' });
    return;
  }

  const claim = await prisma.claim.create({
    data: {
      tripCoverId: coverId,
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
  });
  res.json({ claims });
});

