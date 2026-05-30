import { Router } from 'express';
import { z } from 'zod';
import type { ClaimStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, getAuthed } from '../middleware/requireAuth.js';
import {
  requireDashboardAccess,
  requireDashboardPermission,
} from '../middleware/requireDashboardPermission.js';
import { requireClaimMutationPermission } from '../middleware/requireClaimMutationPermission.js';
import { listPermissionsForRole } from '../lib/dashboardPermissions.js';
import { dashboardStaffRouter } from './dashboardStaff.js';
import { hashPassword } from '../lib/auth.js';
import { disableVehicleQr, getOrCreateVehicleQr, regenerateVehicleQr } from '../lib/qrCodes.js';
import { generateQrPngDataUrl, generateQrSvg, serializeQrRecord } from '../lib/qrImage.js';
import {
  serializeCoverRow,
  serializePartnerRow,
  serializePaymentRow,
  serializeScanLog,
  serializeSupportReport,
  serializeVehicleRow,
  mapLegacyClaimStatus,
} from '../lib/dashboardSerializers.js';
import { loadDashboardClaimDetail, updateClaimAdminStatus } from '../lib/claimAdmin.js';
import { applyPaymentWebhookUpdate, paymentWebhookPlaceholderInfo } from '../lib/paymentWebhook.js';
import { activateCoverFromPayment } from '../lib/coverPurchase.js';
import {
  buildReadinessReport,
  loadDashboardMetrics,
  loadOverviewPanels,
  serializeDashboardTripRow,
} from '../lib/dashboardAdmin.js';
import { maskPhoneNumber } from '../lib/paymentMethods.js';
import { env } from '../lib/env.js';
import { CLAIMS_UPLOAD_ENABLED } from '../lib/claims.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireDashboardAccess());

dashboardRouter.get('/session', async (req, res) => {
  const authed = getAuthed(req);
  const user = await prisma.user.findUnique({
    where: { id: authed.user.id },
    include: { passengerProfile: true },
  });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      fullName: user.passengerProfile?.fullName ?? null,
    },
    permissions: listPermissionsForRole(user.role),
  });
});

dashboardRouter.use('/staff', dashboardStaffRouter);

dashboardRouter.get('/metrics', requireDashboardPermission('overview.view'), async (_req, res) => {
  const metrics = await loadDashboardMetrics();
  res.json({ metrics });
});

dashboardRouter.get('/overview', requireDashboardPermission('overview.view'), async (_req, res) => {
  const [metrics, panels] = await Promise.all([loadDashboardMetrics(), loadOverviewPanels()]);
  res.json({ metrics, panels });
});

dashboardRouter.get('/readiness', requireDashboardPermission('settings.view'), async (_req, res) => {
  res.json({ readiness: buildReadinessReport() });
});

dashboardRouter.get('/vehicles', requireDashboardPermission('vehicles.view'), async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const partnerId = req.query.partnerId ? String(req.query.partnerId) : undefined;
  const qrStatus = String(req.query.qrStatus ?? 'all');

  const where: Record<string, unknown> = {};
  if (search) {
    where.plateNumber = { contains: search };
  }
  if (partnerId) {
    where.transportPartnerId = partnerId;
  }
  if (status === 'active') {
    where.isSuspended = false;
  } else if (status === 'suspended') {
    where.isSuspended = true;
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      route: true,
      transportPartner: true,
      driver: true,
      qrCodes: { orderBy: { createdAt: 'desc' }, take: 3 },
      _count: { select: { tripCovers: true } },
    },
  });

  let rows = vehicles.map(serializeVehicleRow);
  if (qrStatus !== 'all') {
    rows = rows.filter((v) => v.qrStatus === qrStatus);
  }

  res.json({ vehicles: rows });
});

dashboardRouter.get('/vehicles/:vehicleId', requireDashboardPermission('vehicles.view'), async (req, res) => {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: String(req.params.vehicleId) },
    include: {
      route: true,
      transportPartner: true,
      driver: true,
      qrCodes: { orderBy: { createdAt: 'desc' }, take: 5 },
      _count: { select: { tripCovers: true, qrCodes: true } },
    },
  });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }
  res.json({ vehicle: serializeVehicleRow(vehicle) });
});

dashboardRouter.post('/vehicles', requireDashboardPermission('vehicles.create'), async (req, res) => {
  const schema = z.object({
    plateNumber: z.string().min(3),
    busId: z.string().optional(),
    routeId: z.string().optional(),
    transportPartnerId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber: parsed.data.plateNumber.trim().toUpperCase(),
        busId: parsed.data.busId?.trim() || parsed.data.plateNumber.replace(/\s+/g, '-'),
        routeId: parsed.data.routeId,
        transportPartnerId: parsed.data.transportPartnerId,
      },
      include: {
        route: true,
        transportPartner: true,
        driver: true,
        qrCodes: { take: 1, orderBy: { createdAt: 'desc' } },
        _count: { select: { tripCovers: true } },
      },
    });
    res.status(201).json({ vehicle: serializeVehicleRow(vehicle) });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && String((err as { code: string }).code) === 'P2002') {
      res.status(409).json({ error: 'Vehicle with this plate already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

dashboardRouter.patch('/vehicles/:vehicleId', requireDashboardPermission('vehicles.update'), async (req, res) => {
  const schema = z.object({
    isSuspended: z.boolean().optional(),
    routeId: z.string().nullable().optional(),
    transportPartnerId: z.string().nullable().optional(),
    driverId: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const vehicle = await prisma.vehicle.update({
    where: { id: String(req.params.vehicleId) },
    data: {
      ...(parsed.data.isSuspended !== undefined ? { isSuspended: parsed.data.isSuspended } : {}),
      ...(parsed.data.routeId !== undefined ? { routeId: parsed.data.routeId } : {}),
      ...(parsed.data.transportPartnerId !== undefined
        ? { transportPartnerId: parsed.data.transportPartnerId }
        : {}),
      ...(parsed.data.driverId !== undefined ? { driverId: parsed.data.driverId } : {}),
    },
    include: {
      route: true,
      transportPartner: true,
      driver: true,
      qrCodes: { take: 3, orderBy: { createdAt: 'desc' } },
      _count: { select: { tripCovers: true } },
    },
  });
  res.json({ vehicle: serializeVehicleRow(vehicle) });
});

dashboardRouter.get('/vehicles/:vehicleId/covers', requireDashboardPermission('covers.view'), async (req, res) => {
  const covers = await prisma.tripCover.findMany({
    where: { vehicleId: String(req.params.vehicleId) },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      payment: true,
      vehicle: true,
      route: true,
      passengerUser: { include: { passengerProfile: true } },
    },
  });
  res.json({ covers: covers.map(serializeCoverRow) });
});

dashboardRouter.get('/vehicles/:vehicleId/qr', requireDashboardPermission('qr.view'), async (req, res) => {
  const vehicleId = String(req.params.vehicleId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const qr = await getOrCreateVehicleQr(vehicleId);
  const svg = await generateQrSvg(qr.code);
  const pngDataUrl = await generateQrPngDataUrl(qr.code);
  res.json({
    qr: serializeQrRecord(qr),
    qrImageSvg: svg,
    qrImagePngDataUrl: pngDataUrl,
  });
});

dashboardRouter.post('/vehicles/:vehicleId/qr', requireDashboardPermission('qr.generate'), async (req, res) => {
  const authed = getAuthed(req);
  const vehicleId = String(req.params.vehicleId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const qr = await getOrCreateVehicleQr(vehicleId, authed.user.id);
  const svg = await generateQrSvg(qr.code);
  const pngDataUrl = await generateQrPngDataUrl(qr.code);
  res.status(201).json({
    qr: serializeQrRecord(qr),
    qrImageSvg: svg,
    qrImagePngDataUrl: pngDataUrl,
  });
});

dashboardRouter.post('/vehicles/:vehicleId/qr/regenerate', requireDashboardPermission('qr.regenerate'), async (req, res) => {
  const authed = getAuthed(req);
  const vehicleId = String(req.params.vehicleId);
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle not found' });
    return;
  }

  const qr = await regenerateVehicleQr(vehicleId, authed.user.id);
  const svg = await generateQrSvg(qr.code);
  const pngDataUrl = await generateQrPngDataUrl(qr.code);
  res.status(201).json({
    qr: serializeQrRecord(qr),
    qrImageSvg: svg,
    qrImagePngDataUrl: pngDataUrl,
  });
});

dashboardRouter.patch('/vehicles/:vehicleId/qr', requireDashboardPermission('qr.disable'), async (req, res) => {
  const schema = z.object({ qrId: z.string(), action: z.enum(['disable', 'enable']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: parsed.data.qrId } });
  if (!qr || qr.vehicleId !== String(req.params.vehicleId)) {
    res.status(404).json({ error: 'QR code not found for this vehicle' });
    return;
  }

  const updated =
    parsed.data.action === 'disable'
      ? await disableVehicleQr(qr.id)
      : await prisma.qRCode.update({
          where: { id: qr.id },
          data: { status: 'active', isActive: true },
        });

  res.json({ qr: serializeQrRecord(updated) });
});

dashboardRouter.get('/vehicles/:vehicleId/qr/scans', requireDashboardPermission('qr.scans.view'), async (req, res) => {
  const vehicleId = String(req.params.vehicleId);
  const qrIds = (
    await prisma.qRCode.findMany({ where: { vehicleId }, select: { id: true } })
  ).map((q) => q.id);

  const logs = await prisma.qrScanLog.findMany({
    where: { qrCodeId: { in: qrIds } },
    orderBy: { scannedAt: 'desc' },
    take: 50,
    include: {
      qrCode: { select: { code: true, vehicleId: true, vehicle: { select: { id: true, plateNumber: true } } } },
    },
  });

  res.json({ scans: logs.map(serializeScanLog) });
});

dashboardRouter.get('/qr/scans', requireDashboardPermission('qr.scans.view'), async (req, res) => {
  const result = req.query.result ? String(req.query.result) : undefined;
  const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
  const search = String(req.query.search ?? '').trim();

  const where: Record<string, unknown> = {};
  if (result) where.result = result;
  if (vehicleId) where.qrCode = { vehicleId };

  const logs = await prisma.qrScanLog.findMany({
    where,
    orderBy: { scannedAt: 'desc' },
    take: 100,
    include: {
      qrCode: {
        include: { vehicle: { select: { id: true, plateNumber: true } } },
      },
    },
  });

  let scans = logs.map(serializeScanLog);
  if (search) {
    const q = search.toLowerCase();
    scans = scans.filter(
      (s) =>
        s.qrCode?.toLowerCase().includes(q) ||
        s.vehiclePlate?.toLowerCase().includes(q) ||
        s.result.toLowerCase().includes(q),
    );
  }

  const counts = await prisma.qrScanLog.groupBy({
    by: ['result'],
    _count: { _all: true },
  });

  res.json({
    scans,
    resultCounts: Object.fromEntries(counts.map((c) => [c.result, c._count._all])),
  });
});

dashboardRouter.patch('/vehicles/:id/location', requireDashboardPermission('vehicles.update'), async (req, res) => {
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

dashboardRouter.get('/partners', requireDashboardPermission('partners.view'), async (_req, res) => {
  const partners = await prisma.transportPartner.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { vehicles: true, drivers: true, qrCodes: true } } },
  });
  res.json({ partners: partners.map(serializePartnerRow) });
});

dashboardRouter.get('/partners/:partnerId', requireDashboardPermission('partners.view'), async (req, res) => {
  const partner = await prisma.transportPartner.findUnique({
    where: { id: String(req.params.partnerId) },
    include: {
      vehicles: {
        include: {
          route: true,
          qrCodes: { where: { status: 'active' }, take: 1 },
          _count: { select: { tripCovers: true } },
        },
      },
      drivers: { include: { user: { select: { phone: true, email: true } } } },
      _count: { select: { vehicles: true, drivers: true, qrCodes: true } },
    },
  });
  if (!partner) {
    res.status(404).json({ error: 'Partner not found' });
    return;
  }

  const vehicleIds = partner.vehicles.map((v) => v.id);
  const [activeCovers, scanCount] = await Promise.all([
    prisma.tripCover.count({
      where: {
        vehicleId: { in: vehicleIds },
        status: 'active',
        payment: { status: 'succeeded' },
      },
    }),
    prisma.qrScanLog.count({
      where: { qrCode: { vehicleId: { in: vehicleIds } }, result: 'verified' },
    }),
  ]);

  res.json({
    partner: {
      ...serializePartnerRow(partner),
      vehicles: partner.vehicles.map(serializeVehicleRow),
      drivers: partner.drivers.map((d) => ({
        id: d.id,
        fullName: d.fullName,
        phone: d.user.phone,
        email: d.user.email,
      })),
      stats: {
        activeCovers,
        verifiedScans: scanCount,
        commissionNote: 'Commission tracking not configured — counts are from real cover and scan data only.',
      },
    },
  });
});

dashboardRouter.get('/covers', requireDashboardPermission('covers.view'), async (req, res) => {
  const status = String(req.query.status ?? 'all');
  const plan = req.query.plan ? String(req.query.plan) : undefined;
  const search = String(req.query.search ?? '').trim();
  const vehicleId = req.query.vehicleId ? String(req.query.vehicleId) : undefined;
  const partnerId = req.query.partnerId ? String(req.query.partnerId) : undefined;
  const now = new Date();
  let where: Record<string, unknown> = {};

  if (status === 'active') {
    where = { status: 'active', endsAt: { gt: now }, payment: { status: 'succeeded' } };
  } else if (status === 'expired') {
    where = { OR: [{ endsAt: { lte: now } }, { status: 'expired' }] };
  } else if (status === 'pending') {
    where = { payment: { status: 'pending' } };
  } else if (status === 'failed') {
    where = { payment: { status: 'failed' } };
  }

  if (plan) where.plan = plan;
  if (vehicleId) where.vehicleId = vehicleId;
  if (partnerId) where.vehicle = { transportPartnerId: partnerId };
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { passengerUser: { phone: { contains: search } } },
      { passengerUser: { passengerProfile: { fullName: { contains: search } } } },
    ];
  }

  const covers = await prisma.tripCover.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      payment: true,
      vehicle: true,
      route: true,
      passengerUser: { include: { passengerProfile: true } },
    },
  });

  res.json({ covers: covers.map(serializeCoverRow) });
});

dashboardRouter.get('/covers/:coverId', requireDashboardPermission('covers.view'), async (req, res) => {
  const cover = await prisma.tripCover.findUnique({
    where: { id: String(req.params.coverId) },
    include: {
      payment: true,
      vehicle: true,
      route: true,
      passengerUser: { include: { passengerProfile: true } },
    },
  });
  if (!cover) {
    res.status(404).json({ error: 'Cover not found' });
    return;
  }
  res.json({ cover: serializeCoverRow(cover) });
});

dashboardRouter.get('/payments', requireDashboardPermission('payments.view'), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const search = String(req.query.search ?? '').trim();

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { reference: { contains: search } },
      { tripCoverId: { contains: search } },
      { tripCover: { passengerUser: { phone: { contains: search } } } },
    ];
  }

  const payments = await (prisma.payment as any).findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      tripCover: {
        include: {
          passengerUser: { include: { passengerProfile: true } },
          vehicle: true,
        },
      },
    },
  });
  res.json({
    payments: payments.map(serializePaymentRow),
    reconciliationNote:
      'Payments reconcile against trip covers. Wire provider webhooks to /api/shared/webhooks/payment before production.',
  });
});

dashboardRouter.get('/payments/config', requireDashboardPermission('payments.view'), async (_req, res) => {
  res.json({
    paymentGatewayEnabled: env.paymentGatewayEnabled,
    paymentSimulateSuccess: env.paymentSimulateSuccess,
    cardPaymentsEnabled: env.cardPaymentsEnabled,
    webhook: paymentWebhookPlaceholderInfo(),
  });
});

dashboardRouter.get('/payments/:paymentId', requireDashboardPermission('payments.view'), async (req, res) => {
  const payment = await (prisma.payment as any).findUnique({
    where: { id: String(req.params.paymentId) },
    include: {
      tripCover: {
        include: {
          passengerUser: { include: { passengerProfile: true } },
          vehicle: true,
          route: true,
          payment: true,
        },
      },
    },
  });
  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }
  res.json({
    payment: {
      ...serializePaymentRow(payment),
      webhook: paymentWebhookPlaceholderInfo(),
    },
  });
});

const adminOverrideSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  category: z.enum([
    'payment_confirmed_offline',
    'provider_webhook_failed',
    'testing_or_demo',
    'dispute_resolved',
    'other',
  ]),
});

dashboardRouter.post(
  '/payments/:paymentId/admin-override',
  requireDashboardPermission('payments.admin_override'),
  async (req, res) => {
    const parsed = adminOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      return;
    }

    const actor = getAuthed(req);
    const adminNote = `[${parsed.data.category}] ${parsed.data.reason}`;

    const result = await activateCoverFromPayment(
      String(req.params.paymentId),
      'manual_admin_override',
      { actorUserId: actor.user.id, adminNote },
    );

    res.json({
      ok: true,
      payment: { id: result.payment.id, status: (result.payment as Record<string, unknown>).status },
      cover: {
        id: result.cover.id,
        status: result.cover.status,
        activationSource: (result.cover as Record<string, unknown>).activationSource,
      },
    });
  },
);

dashboardRouter.get('/claims', requireDashboardPermission('claims.view'), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const claims = await prisma.claim.findMany({
    where: status ? { status: status as ClaimStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      tripCover: { include: { vehicle: true, route: true, payment: true } },
      passengerUser: { include: { passengerProfile: true } },
      documents: true,
      payout: true,
    },
  });
  res.json({
    claims: claims.map((claim) => ({
      ...claim,
      status: mapLegacyClaimStatus(claim.status),
      documentCount: claim.documents.length,
      payoutStatus: claim.payout?.status ?? null,
    })),
    documentsMetadataOnly: !CLAIMS_UPLOAD_ENABLED,
  });
});

dashboardRouter.get('/claims/:id', requireDashboardPermission('claims.view'), async (req, res) => {
  const claim = await loadDashboardClaimDetail(String(req.params.id));
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  res.json({ claim });
});

const claimStatusSchema = z.object({
  status: z.enum(['under_review', 'needs_action', 'approved', 'rejected', 'paid']),
  note: z.string().max(500).optional(),
});

dashboardRouter.patch('/claims/:id', requireClaimMutationPermission(), async (req, res) => {
  const parsed = claimStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  try {
    const authed = getAuthed(req);
    const claim = await updateClaimAdminStatus(String(req.params.id), {
      status: parsed.data.status,
      note: parsed.data.note,
      adminUserId: authed.user.id,
    });
    res.json({ claim });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

dashboardRouter.post('/claims/:id/approve', requireClaimMutationPermission(), async (req, res) => {
  try {
    const claim = await updateClaimAdminStatus(String(req.params.id), {
      status: 'approved',
      note: 'Approved via dashboard',
    });
    res.json({ claim });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Approve failed' });
  }
});

dashboardRouter.post('/claims/:id/reject', requireClaimMutationPermission(), async (req, res) => {
  const note = typeof req.body?.reason === 'string' ? req.body.reason : 'Rejected via dashboard';
  try {
    const claim = await updateClaimAdminStatus(String(req.params.id), {
      status: 'rejected',
      note,
    });
    res.json({ claim });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Reject failed' });
  }
});

dashboardRouter.get('/support-reports', requireDashboardPermission('support.view'), async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const reports = await prisma.supportReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { include: { passengerProfile: true } } },
  });
  res.json({ reports: reports.map(serializeSupportReport) });
});

dashboardRouter.patch('/support-reports/:id', requireDashboardPermission('support.update'), async (req, res) => {
  const schema = z.object({
    status: z.enum(['open', 'in_progress', 'resolved', 'submitted']).optional(),
    adminNote: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  if (!parsed.data.status && parsed.data.adminNote === undefined) {
    res.status(400).json({ error: 'Provide status and/or adminNote' });
    return;
  }
  const report = await prisma.supportReport.update({
    where: { id: String(req.params.id) },
    data: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.adminNote !== undefined ? { adminNote: parsed.data.adminNote } : {}),
    },
    include: { user: { include: { passengerProfile: true } } },
  });
  res.json({ report: serializeSupportReport(report) });
});

dashboardRouter.get('/trips', requireDashboardPermission('trips.view'), async (req, res) => {
  const bucket = String(req.query.bucket ?? 'all');

  const trackings = await prisma.tripTracking.findMany({
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      tripCover: {
        include: {
          passengerUser: { include: { passengerProfile: true } },
          payment: true,
          vehicle: { include: { route: true } },
          route: true,
        },
      },
    },
  });

  const rows = await Promise.all(trackings.map((t) => serializeDashboardTripRow(t)));
  const filtered =
    bucket === 'all'
      ? rows
      : rows.filter((r) => r.bucket === bucket);

  res.json({
    trips: filtered,
    staleLocationNote: 'Trips with no location update in 5 minutes are marked stale, not live.',
  });
});

dashboardRouter.get('/trips/:tripId', requireDashboardPermission('trips.view'), async (req, res) => {
  const tracking = await prisma.tripTracking.findUnique({
    where: { id: String(req.params.tripId) },
    include: {
      tripCover: {
        include: {
          passengerUser: { include: { passengerProfile: true } },
          payment: true,
          vehicle: { include: { route: true } },
          route: true,
        },
      },
    },
  });
  if (!tracking) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ trip: await serializeDashboardTripRow(tracking) });
});

dashboardRouter.get('/users', requireDashboardPermission('users.view'), async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const where: Record<string, unknown> = { role: 'passenger' };
  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { email: { contains: search } },
      { passengerProfile: { fullName: { contains: search } } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      passengerProfile: true,
      _count: {
        select: {
          passengerTripCovers: true,
          passengerClaims: true,
          savedPaymentMethods: true,
          trustedContacts: true,
          supportReports: true,
        },
      },
    },
  });

  res.json({
    users: users.map((u) => ({
      id: u.id,
      fullName: u.passengerProfile?.fullName ?? null,
      phone: u.phone ? maskPhoneNumber(u.phone) : null,
      email: u.email,
      isActive: u.isActive,
      createdAt: u.createdAt.toISOString(),
      coverCount: u._count.passengerTripCovers,
      claimCount: u._count.passengerClaims,
      paymentMethodCount: u._count.savedPaymentMethods,
      trustedContactCount: u._count.trustedContacts,
      supportReportCount: u._count.supportReports,
    })),
  });
});

dashboardRouter.get('/users/:userId', requireDashboardPermission('users.sensitive_view'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: String(req.params.userId) },
    include: {
      passengerProfile: true,
      passengerTripCovers: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { payment: true, vehicle: true, route: true },
      },
      passengerClaims: { orderBy: { createdAt: 'desc' }, take: 20 },
      savedPaymentMethods: true,
      trustedContacts: true,
      supportReports: { orderBy: { createdAt: 'desc' }, take: 20 },
      _count: {
        select: {
          passengerTripCovers: true,
          passengerClaims: true,
          savedPaymentMethods: true,
          trustedContacts: true,
          supportReports: true,
        },
      },
    },
  });
  if (!user || user.role !== 'passenger') {
    res.status(404).json({ error: 'Passenger not found' });
    return;
  }

  const scanCount = await prisma.qrScanLog.count({ where: { userId: user.id } });

  res.json({
    user: {
      id: user.id,
      fullName: user.passengerProfile?.fullName ?? null,
      phone: user.phone ? maskPhoneNumber(user.phone) : null,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      counts: {
        covers: user._count.passengerTripCovers,
        claims: user._count.passengerClaims,
        paymentMethods: user._count.savedPaymentMethods,
        trustedContacts: user._count.trustedContacts,
        supportReports: user._count.supportReports,
        qrScans: scanCount,
      },
      covers: user.passengerTripCovers.map(serializeCoverRow),
      claims: user.passengerClaims.map((c) => ({
        id: c.id,
        reference: c.reference,
        status: mapLegacyClaimStatus(c.status),
        createdAt: c.createdAt.toISOString(),
      })),
      paymentMethods: user.savedPaymentMethods.map((m) => ({
        id: m.id,
        type: m.type,
        label: m.label,
        maskedValue: m.maskedValue,
        isDefault: m.isDefault,
      })),
      trustedContacts: user.trustedContacts.map((c) => ({
        id: c.id,
        name: c.name,
        maskedPhone: c.maskedPhone,
        isPrimary: c.isPrimary,
      })),
      supportReports: user.supportReports.map((r) => ({
        id: r.id,
        problemType: r.problemType,
        message: r.message,
        status: r.status,
        adminNote: r.adminNote ?? null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        user: {
          id: user.id,
          phone: user.phone ? maskPhoneNumber(user.phone) : null,
          email: user.email,
          fullName: user.passengerProfile?.fullName ?? null,
        },
      })),
    },
  });
});

dashboardRouter.get('/fraud/flags', requireDashboardPermission('overview.view'), async (_req, res) => {
  const flags = await prisma.fraudFlag.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  res.json({ flags });
});

dashboardRouter.get('/payouts', requireDashboardPermission('payments.view'), async (_req, res) => {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { claim: true },
  });
  res.json({ payouts });
});

dashboardRouter.get('/drivers', requireDashboardPermission('drivers.view'), async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, phone: true, isActive: true } },
      vehicles: { include: { route: true } },
    },
  });
  res.json({ drivers });
});

dashboardRouter.post('/drivers', requireDashboardPermission('drivers.create'), async (req, res) => {
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
      } else if (env.allowDevVehicleAutoCreate) {
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
      } else {
        res.status(400).json({ error: 'Vehicle not found. Create the vehicle in fleet ops before linking a driver.' });
        return;
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

    res.json({ driver: updatedProfile, vehicle });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && String((err as { code: string }).code) === 'P2002') {
      res.status(409).json({ error: 'User with this phone/email or plate number already exists' });
      return;
    }
    console.error('Failed to onboard driver:', err);
    res.status(500).json({ error: 'Failed to onboard driver' });
  }
});
