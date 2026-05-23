import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { hashPassword } from '../lib/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireRole(['admin', 'super_admin', 'transport_partner', 'insurance_partner']));

async function expireOverdueCovers() {
  const now = new Date();
  await prisma.tripCover.updateMany({
    where: { status: 'active', endsAt: { lte: now } },
    data: { status: 'expired' },
  });
}

dashboardRouter.get('/metrics', async (_req, res) => {
  await expireOverdueCovers();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const [
    totalUsers,
    totalPassengers,
    activeCovers,
    expiredCovers,
    claimsPending,
    claimsTotal,
    claimsApproved,
    claimsRejected,
    fraudFlags,
    totalCovers,
    totalVehicles,
    totalDrivers,
    totalQRScans,
    coversToday,
    coversThisWeek,
    payments,
    successfulPayments,
    failedPayments,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'passenger' } }),
    prisma.tripCover.count({ where: { status: 'active' } }),
    prisma.tripCover.count({ where: { status: 'expired' } }),
    prisma.claim.count({ where: { status: { in: ['submitted', 'processing'] } } }),
    prisma.claim.count(),
    prisma.claim.count({ where: { status: 'approved' } }),
    prisma.claim.count({ where: { status: 'rejected' } }),
    prisma.fraudFlag.count(),
    prisma.tripCover.count(),
    prisma.vehicle.count(),
    prisma.driverProfile.count(),
    prisma.qRScan.count(),
    prisma.tripCover.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.tripCover.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.payment.count(),
    prisma.payment.count({ where: { status: 'succeeded' } }),
    prisma.payment.count({ where: { status: 'failed' } }),
  ]);

  const revenueResult = await prisma.payment.aggregate({
    where: { status: 'succeeded' },
    _sum: { amount: true },
  });
  const totalRevenue = revenueResult._sum.amount ?? 0;

  const payoutResult = await prisma.payout.aggregate({
    where: { status: 'succeeded' },
    _sum: { amount: true },
  });
  const totalPayouts = payoutResult._sum.amount ?? 0;

  res.json({
    metrics: {
      totalUsers,
      totalPassengers,
      activeCovers,
      expiredCovers,
      claimsPending,
      claimsTotal,
      claimsApproved,
      claimsRejected,
      fraudFlags,
      totalCovers,
      totalVehicles,
      totalDrivers,
      totalQRScans,
      coversToday,
      coversThisWeek,
      payments,
      successfulPayments,
      failedPayments,
      totalRevenue,
      totalPayouts,
    },
  });
});

dashboardRouter.get('/vehicles', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { route: true, transportPartner: true, driver: true, _count: { select: { tripCovers: true, qrScans: true } } },
  });
  res.json({ vehicles });
});

dashboardRouter.get('/claims', async (_req, res) => {
  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      tripCover: { include: { vehicle: true, route: true, coverProduct: true, payment: true } },
      passengerUser: { include: { passengerProfile: true } },
      payout: true,
    },
  });
  res.json({ claims });
});

dashboardRouter.get('/fraud/flags', async (_req, res) => {
  const flags = await prisma.fraudFlag.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { id: true, email: true, phone: true } } },
  });
  res.json({ flags });
});

dashboardRouter.get('/payouts', async (_req, res) => {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { claim: { include: { passengerUser: { select: { id: true, phone: true, passengerProfile: { select: { fullName: true } } } } } } },
  });
  res.json({ payouts });
});

dashboardRouter.get('/payments', async (_req, res) => {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      tripCover: {
        select: {
          id: true, plan: true, policyNumber: true, status: true,
          passengerUser: { select: { id: true, phone: true, passengerProfile: { select: { fullName: true } } } },
          vehicle: { select: { plateNumber: true } },
          route: { select: { origin: true, destination: true } },
        },
      },
    },
  });
  res.json({ payments });
});

dashboardRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true, email: true, phone: true, role: true, isActive: true, createdAt: true,
      passengerProfile: { select: { fullName: true } },
      driverProfile: { select: { fullName: true } },
      _count: { select: { passengerTripCovers: true, passengerClaims: true } },
    },
  });
  res.json({ users });
});

dashboardRouter.get('/qr-scans', async (_req, res) => {
  const scans = await prisma.qRScan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      scannedByUser: { select: { id: true, phone: true, passengerProfile: { select: { fullName: true } } } },
      vehicle: { select: { plateNumber: true, busId: true } },
      qrCode: { select: { code: true } },
    },
  });
  res.json({ scans });
});

dashboardRouter.get('/covers', async (_req, res) => {
  await expireOverdueCovers();
  const covers = await prisma.tripCover.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      passengerUser: { select: { id: true, phone: true, passengerProfile: { select: { fullName: true } } } },
      vehicle: { select: { plateNumber: true } },
      route: { select: { origin: true, destination: true } },
      coverProduct: { select: { name: true, coverageAmount: true } },
      payment: { select: { status: true, method: true } },
    },
  });
  res.json({ covers });
});

dashboardRouter.get('/routes', async (_req, res) => {
  const routes = await prisma.route.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { vehicles: true, tripCovers: true } } },
  });
  res.json({ routes });
});

dashboardRouter.post('/claims/:id/approve', requireRole(['admin', 'super_admin']), async (req, res) => {
  const claimId = String(req.params.id);
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { tripCover: { include: { coverProduct: true } } },
  });
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }

  const payoutAmount = claim.tripCover.coverProduct?.coverageAmount ?? claim.tripCover.amount * 100;

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status: 'approved' },
  });

  const payout = await prisma.payout.upsert({
    where: { claimId },
    create: { claimId, amount: payoutAmount, currency: 'ZMW', status: 'pending' },
    update: { status: 'pending', amount: payoutAmount },
  });

  res.json({ claim: updated, payout });
});

dashboardRouter.post('/claims/:id/reject', requireRole(['admin', 'super_admin']), async (req, res) => {
  const claimId = String(req.params.id);
  const schema = z.object({ reason: z.string().min(3).optional() });
  const parsed = schema.safeParse(req.body);

  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status: 'rejected' },
  });

  res.json({ claim: updated });
});

dashboardRouter.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, phone: true, isActive: true } },
      vehicles: { include: { route: true, _count: { select: { tripCovers: true } } } },
      transportPartner: { select: { name: true } },
    },
  });
  res.json({ drivers });
});

dashboardRouter.post('/drivers', async (req, res) => {
  const schema = z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional(),
    password: z.string().min(6),
    licenseNumber: z.string().optional(),
    plateNumber: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { fullName, phone, email, password, licenseNumber, plateNumber } = parsed.data;
  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email: email || null,
        phone,
        passwordHash,
        role: 'driver',
        driverProfile: {
          create: {
            fullName,
            licenseNumber: licenseNumber || null,
          },
        },
      },
      include: { driverProfile: true },
    });

    const driverProfileId = user.driverProfile?.id;

    let vehicle = null;
    if (plateNumber && driverProfileId) {
      vehicle = await prisma.vehicle.findUnique({ where: { plateNumber } });
      if (vehicle) {
        vehicle = await prisma.vehicle.update({
          where: { id: vehicle.id },
          data: { driverId: driverProfileId },
        });
      }
    }

    const updatedProfile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        user: { select: { id: true, email: true, phone: true, isActive: true } },
        vehicles: { include: { route: true } },
      },
    });

    res.json({ driver: updatedProfile });
  } catch (err: any) {
    if (String(err?.code) === 'P2002') {
      res.status(409).json({ error: 'User with this phone/email already exists' });
      return;
    }
    console.error('Failed to onboard driver:', err);
    res.status(500).json({ error: 'Failed to onboard driver' });
  }
});
