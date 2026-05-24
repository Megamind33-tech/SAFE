import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { hashPassword } from '../lib/auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireRole(['admin', 'super_admin', 'transport_partner', 'insurance_partner']));

dashboardRouter.get('/metrics', async (_req, res) => {
  const [users, activeCovers, claimsPending, fraudFlags, purchases] = await Promise.all([
    prisma.user.count(),
    prisma.tripCover.count({ where: { status: 'active' } }),
    prisma.claim.count({ where: { status: { in: ['submitted', 'processing'] } } }),
    prisma.fraudFlag.count(),
    prisma.tripCover.count(),
  ]);

  // Simulate scans as purchases + some failed/started checkouts
  const scans = purchases + 14;

  res.json({
    metrics: {
      users,
      activeCovers,
      claimsPending,
      fraudFlags,
      purchases,
      scans,
    },
  });
});

dashboardRouter.get('/vehicles', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { route: true, transportPartner: true, driver: true },
  });
  res.json({ vehicles });
});

dashboardRouter.patch('/vehicles/:id/location', requireRole(['admin', 'super_admin', 'transport_partner']), async (req, res) => {
  const schema = z.object({
    lat: z.number(),
    lng: z.number(),
    heading: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const vehicle = await prisma.vehicle.update({
    where: { id: String(req.params.id) },
    data: {
      lastLat: parsed.data.lat,
      lastLng: parsed.data.lng,
      lastHeading: parsed.data.heading ?? null,
      locationAt: new Date(),
    },
    include: { route: true },
  });
  res.json({ vehicle });
});

dashboardRouter.get('/claims', async (_req, res) => {
  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      tripCover: { include: { vehicle: true, route: true } },
      passengerUser: { include: { passengerProfile: true } },
    },
  });
  res.json({ claims });
});

dashboardRouter.get('/fraud/flags', async (_req, res) => {
  const flags = await prisma.fraudFlag.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ flags });
});

dashboardRouter.get('/payouts', async (_req, res) => {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { claim: true },
  });
  res.json({ payouts });
});

dashboardRouter.post('/claims/:id/approve', requireRole(['admin', 'super_admin']), async (req, res) => {
  const claimId = String(req.params.id);
  const claim = await prisma.claim.findUnique({ where: { id: claimId } });
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status: 'approved' },
  });

  const payout = await prisma.payout.upsert({
    where: { claimId },
    create: { claimId, amount: 1200, currency: 'ZMW', status: 'pending' },
    update: { status: 'pending' },
  });

  res.json({ claim: updated, payout });
});

dashboardRouter.post('/claims/:id/reject', requireRole(['admin', 'super_admin']), async (req, res) => {
  const claimId = String(req.params.id);
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
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isActive: true,
        },
      },
      vehicles: {
        include: {
          route: true,
        },
      },
    },
  });
  res.json({ drivers });
});

dashboardRouter.post('/drivers', async (req, res) => {
  const { fullName, phone, email, password, licenseNumber, plateNumber } = req.body;

  if (!fullName || !phone || !password) {
    res.status(400).json({ error: 'fullName, phone, and password are required' });
    return;
  }

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
            licenseNumber,
          },
        },
      },
      include: {
        driverProfile: true,
      },
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
      } else {
        let routeId = 'route-matero-town';
        const defaultRoute = await prisma.route.findUnique({ where: { id: routeId } });
        if (!defaultRoute) {
          const newRoute = await prisma.route.create({
            data: { id: routeId, origin: 'Matero', destination: 'Town' },
          });
          routeId = newRoute.id;
        }

        vehicle = await prisma.vehicle.create({
          data: {
            plateNumber,
            busId: plateNumber.replace(/\s+/g, '-'),
            routeId,
            driverId: driverProfileId,
          },
        });
      }
    }

    const updatedProfile = await prisma.driverProfile.findUnique({
      where: { id: driverProfileId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            isActive: true,
          },
        },
        vehicles: {
          include: {
            route: true,
          },
        },
      },
    });

    res.json({ driver: updatedProfile });
  } catch (err: any) {
    if (String(err?.code) === 'P2002') {
      res.status(409).json({ error: 'User with this phone/email or plate number already exists' });
      return;
    }
    console.error('Failed to onboard driver:', err);
    res.status(500).json({ error: 'Failed to onboard driver' });
  }
});
