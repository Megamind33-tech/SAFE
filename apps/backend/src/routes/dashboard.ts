import { Router } from 'express';
import { z } from 'zod';
import type { ClaimStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireAuth, getAuthed } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
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
import { env } from '../lib/env.js';
import { CLAIMS_UPLOAD_ENABLED } from '../lib/claims.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.use(requireRole(['admin', 'super_admin', 'transport_partner', 'insurance_partner']));

dashboardRouter.get('/metrics', async (_req, res) => {
  const [users, activeCovers, claimsPending, fraudFlags, purchases, scans, openSupport] = await Promise.all([
    prisma.user.count(),
    prisma.tripCover.count({
      where: { status: 'active', endsAt: { gt: new Date() }, payment: { status: 'succeeded' } },
    }),
    prisma.claim.count({ where: { status: { in: ['submitted', 'under_review', 'needs_action'] } } }),
    prisma.fraudFlag.count(),
    prisma.tripCover.count({ where: { payment: { status: 'succeeded' } } }),
    prisma.qrScanLog.count(),
    prisma.supportReport.count({ where: { status: { in: ['submitted', 'open', 'in_progress'] } } }),
  ]);

  res.json({
    metrics: {
      users,
      activeCovers,
      claimsPending,
      fraudFlags,
      purchases,
      scans,
      openSupport,
      paymentGatewayEnabled: env.paymentGatewayEnabled,
      claimsUploadEnabled: CLAIMS_UPLOAD_ENABLED,
    },
  });
});

dashboardRouter.get('/vehicles', async (_req, res) => {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      route: true,
      transportPartner: true,
      driver: true,
      qrCodes: { where: { status: 'active' }, take: 1, orderBy: { createdAt: 'desc' } },
      _count: { select: { tripCovers: true } },
    },
  });
  res.json({ vehicles: vehicles.map(serializeVehicleRow) });
});

dashboardRouter.get('/vehicles/:vehicleId', async (req, res) => {
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

dashboardRouter.get('/vehicles/:vehicleId/qr', async (req, res) => {
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

dashboardRouter.post('/vehicles/:vehicleId/qr', requireRole(['admin', 'super_admin', 'transport_partner']), async (req, res) => {
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

dashboardRouter.post('/vehicles/:vehicleId/qr/regenerate', requireRole(['admin', 'super_admin', 'transport_partner']), async (req, res) => {
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

dashboardRouter.patch('/vehicles/:vehicleId/qr', requireRole(['admin', 'super_admin', 'transport_partner']), async (req, res) => {
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

dashboardRouter.get('/vehicles/:vehicleId/qr/scans', async (req, res) => {
  const vehicleId = String(req.params.vehicleId);
  const qrIds = (
    await prisma.qRCode.findMany({ where: { vehicleId }, select: { id: true } })
  ).map((q) => q.id);

  const logs = await prisma.qrScanLog.findMany({
    where: { qrCodeId: { in: qrIds } },
    orderBy: { scannedAt: 'desc' },
    take: 50,
    include: { qrCode: { select: { code: true, vehicleId: true } } },
  });

  res.json({ scans: logs.map(serializeScanLog) });
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

dashboardRouter.get('/partners', async (_req, res) => {
  const partners = await prisma.transportPartner.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { vehicles: true, drivers: true, qrCodes: true } } },
  });
  res.json({ partners: partners.map(serializePartnerRow) });
});

dashboardRouter.get('/partners/:partnerId', async (req, res) => {
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

dashboardRouter.get('/covers', async (req, res) => {
  const status = String(req.query.status ?? 'all');
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

  const covers = await prisma.tripCover.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      payment: true,
      vehicle: true,
      route: true,
      passengerUser: { include: { passengerProfile: true } },
    },
  });

  res.json({ covers: covers.map(serializeCoverRow) });
});

dashboardRouter.get('/covers/:coverId', async (req, res) => {
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

dashboardRouter.get('/payments', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const payments = await prisma.payment.findMany({
    where: status ? { status: status as 'pending' | 'succeeded' | 'failed' } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
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

dashboardRouter.get('/payments/config', async (_req, res) => {
  res.json({
    paymentGatewayEnabled: env.paymentGatewayEnabled,
    paymentSimulateSuccess: env.paymentSimulateSuccess,
    cardPaymentsEnabled: env.cardPaymentsEnabled,
    webhook: paymentWebhookPlaceholderInfo(),
  });
});

dashboardRouter.get('/claims', async (req, res) => {
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

dashboardRouter.get('/claims/:id', async (req, res) => {
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

dashboardRouter.patch('/claims/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
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

dashboardRouter.post('/claims/:id/approve', requireRole(['admin', 'super_admin']), async (req, res) => {
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

dashboardRouter.post('/claims/:id/reject', requireRole(['admin', 'super_admin']), async (req, res) => {
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

dashboardRouter.get('/support-reports', async (req, res) => {
  const status = req.query.status ? String(req.query.status) : undefined;
  const reports = await prisma.supportReport.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { include: { passengerProfile: true } } },
  });
  res.json({ reports: reports.map(serializeSupportReport) });
});

dashboardRouter.patch('/support-reports/:id', requireRole(['admin', 'super_admin']), async (req, res) => {
  const schema = z.object({ status: z.enum(['open', 'in_progress', 'resolved', 'submitted']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const report = await prisma.supportReport.update({
    where: { id: String(req.params.id) },
    data: { status: parsed.data.status },
    include: { user: { include: { passengerProfile: true } } },
  });
  res.json({ report: serializeSupportReport(report) });
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

dashboardRouter.get('/drivers', async (_req, res) => {
  const drivers = await prisma.driverProfile.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, email: true, phone: true, isActive: true } },
      vehicles: { include: { route: true } },
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
