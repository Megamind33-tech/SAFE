import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireRole(['admin', 'super_admin', 'transport_partner', 'insurance_partner']));

dashboardRouter.get('/metrics', async (_req, res) => {
  const [users, activeCovers, claimsPending, fraudFlags] = await Promise.all([
    prisma.user.count(),
    prisma.tripCover.count({ where: { status: 'active' } }),
    prisma.claim.count({ where: { status: { in: ['submitted', 'processing'] } } }),
    prisma.fraudFlag.count(),
  ]);

  res.json({
    metrics: {
      users,
      activeCovers,
      claimsPending,
      fraudFlags,
    },
  });
});

dashboardRouter.get('/vehicles', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { route: true, transportPartner: true },
  });
  res.json({ vehicles });
});

dashboardRouter.get('/claims', async (_req, res) => {
  const claims = await prisma.claim.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { tripCover: { include: { vehicle: true, route: true } } },
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
