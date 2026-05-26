import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { serializeActiveTrip } from '../lib/activeTrip.js';
import {
  maskPhoneNumber,
  normalizeZambianPhone,
  providerToType,
  serializePaymentMethod,
  typeToLabel,
} from '../lib/paymentMethods.js';
import {
  isValidRelationship,
  maskPhoneNumber as maskTrustedPhone,
  normalizeZambianPhone as normalizeTrustedPhone,
  serializeTrustedContact,
  TRUSTED_CONTACT_RELATIONSHIPS,
} from '../lib/trustedContacts.js';
import {
  getSettingsConfigPayload,
  serializeAccountDetails,
} from '../lib/settings.js';
import { getHelpSafetyConfig, SUPPORT_PROBLEM_TYPES } from '../lib/helpSafety.js';
import {
  defaultNotificationPreferences,
  pickPreferenceUpdates,
  serializeNotificationPreferences,
} from '../lib/notificationPreferences.js';
import { listAvailableCoverPlans } from '../lib/coverPlans.js';
import {
  coverCapabilities,
  getPurchaseStatus,
  loadActiveCoverForUser,
  loadLastEndedCoverForUser,
  loadPendingCoverForUser,
  serializeActiveCover,
  startCoverPurchase,
} from '../lib/coverPurchase.js';
import { getAuthed, requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { env } from '../lib/env.js';
import { requireRole } from '../middleware/requireRole.js';
import { buildHomeSummary } from '../lib/homeSummary.js';
import { verifyQrCode } from '../lib/qrCodes.js';
import {
  appendTimeline,
  assertCoverEligibleForUser,
  checkDuplicateClaim,
  CLAIMS_UPLOAD_ENABLED,
  ensureUniqueReference,
  generateClaimReference,
  loadEligibleCovers,
  serializeClaimDetail,
  serializeClaimListItem,
  validateIncidentWithinCover,
} from '../lib/claims.js';

export const mobileRouter = Router();

mobileRouter.use(requireAuth);
mobileRouter.use(requireRole(['passenger']));

async function loadActiveCover(userId: string) {
  return loadActiveCoverForUser(userId);
}

mobileRouter.get('/profile', async (req, res) => {
  const authed = getAuthed(req);
  const profile = await prisma.passengerProfile.findUnique({
    where: { userId: authed.user.id },
  });
  res.json({ profile });
});

mobileRouter.patch('/profile', async (req, res) => {
  const authed = getAuthed(req);
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

mobileRouter.get('/qr/verify/:code', async (req, res) => {
  const authed = getAuthed(req);
  const rawCode = String(req.params.code ?? '');
  const result = await verifyQrCode(rawCode, {
    userId: authed.user.id,
    userAgent: req.get('user-agent') ?? null,
    approximateLat: req.query.lat ? Number(req.query.lat) : undefined,
    approximateLng: req.query.lng ? Number(req.query.lng) : undefined,
  });
  res.json(result);
});

mobileRouter.post('/qr/scan', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    code: z.string().min(3),
    approximateLat: z.number().optional(),
    approximateLng: z.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const result = await verifyQrCode(parsed.data.code, {
    userId: authed.user.id,
    userAgent: req.get('user-agent') ?? null,
    approximateLat: parsed.data.approximateLat,
    approximateLng: parsed.data.approximateLng,
  });
  res.json(result);
});

mobileRouter.get('/cover/plans', async (_req, res) => {
  res.json({
    plans: listAvailableCoverPlans(),
    capabilities: coverCapabilities(),
  });
});

mobileRouter.get('/cover/active', async (req, res) => {
  const authed = getAuthed(req);
  const cover = await loadActiveCover(authed.user.id);
  const pending = await loadPendingCoverForUser(authed.user.id);
  const lastEnded = cover ? null : await loadLastEndedCoverForUser(authed.user.id);
  res.json({
    cover: serializeActiveCover(cover),
    lastEndedCover: lastEnded ? serializeActiveCover(lastEnded) : null,
    pendingCover: pending ? serializeActiveCover(pending) : null,
    trip: serializeActiveTrip(cover),
    capabilities: coverCapabilities(),
  });
});

mobileRouter.post('/cover/purchase', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    planId: z.string().min(1),
    paymentMethodId: z.string().min(1),
    vehicleId: z.string().min(1).optional(),
    routeId: z.string().min(1).optional(),
    qrCodeId: z.string().min(1).optional(),
    startMode: z.literal('after_payment_confirmation').optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await startCoverPurchase(authed.user.id, parsed.data);
    res.status(result.purchase.status === 'not_configured' ? 501 : 201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode === 409) {
      res.status(409).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
});

mobileRouter.post('/cover/buy', async (req, res) => {
  const authed = getAuthed(req);
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

  let paymentMethodId = parsed.data.paymentMethod;
  if (paymentMethodId && !paymentMethodId.startsWith('c')) {
    const type =
      paymentMethodId === 'airtel'
        ? 'airtel_money'
        : paymentMethodId === 'mtn'
          ? 'mtn_mobile_money'
          : 'card';
    const saved = await prisma.savedPaymentMethod.findFirst({
      where: { userId: authed.user.id, type },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    if (!saved) {
      res.status(400).json({ error: 'Save a payment method before purchasing cover.' });
      return;
    }
    paymentMethodId = saved.id;
  }

  if (!paymentMethodId) {
    res.status(400).json({ error: 'paymentMethodId is required' });
    return;
  }

  let vehicleId = parsed.data.vehicleId;
  if (!vehicleId && parsed.data.plateNumber) {
    const vehicle = await prisma.vehicle.findUnique({ where: { plateNumber: parsed.data.plateNumber } });
    vehicleId = vehicle?.id;
  }

  try {
    const result = await startCoverPurchase(authed.user.id, {
      planId: parsed.data.plan,
      paymentMethodId,
      vehicleId,
      startMode: 'after_payment_confirmation',
    });
    res.status(result.purchase.status === 'not_configured' ? 501 : 201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    const statusCode = (err as Error & { statusCode?: number }).statusCode;
    if (statusCode === 409) {
      res.status(409).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
});

mobileRouter.get('/cover/purchase/:purchaseId/status', async (req, res) => {
  const authed = getAuthed(req);
  const status = await getPurchaseStatus(authed.user.id, req.params.purchaseId);
  if (!status) {
    res.status(404).json({ error: 'Purchase not found' });
    return;
  }
  res.json(status);
});

mobileRouter.get('/trips/:tripId/route', async (req, res) => {
  const authed = getAuthed(req);
  const cover = await prisma.tripCover.findFirst({
    where: { id: req.params.tripId, passengerUserId: authed.user.id },
    include: { vehicle: { include: { route: true, driver: true } }, route: true, payment: true },
  });
  if (!cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ trip: serializeActiveTrip(cover) });
});

mobileRouter.get('/trips/:tripId/location', async (req, res) => {
  const authed = getAuthed(req);
  const cover = await prisma.tripCover.findFirst({
    where: { id: req.params.tripId, passengerUserId: authed.user.id },
    include: { vehicle: true },
  });
  if (!cover?.vehicle) {
    res.status(404).json({ error: 'Vehicle not found for trip' });
    return;
  }
  const vehicle = cover.vehicle;
  if (vehicle.lastLat == null || vehicle.lastLng == null) {
    res.json({ location: null });
    return;
  }
  res.json({
    location: {
      lat: vehicle.lastLat,
      lng: vehicle.lastLng,
      heading: vehicle.lastHeading,
      updatedAt: vehicle.locationAt?.toISOString() ?? null,
    },
  });
});

mobileRouter.get('/cover/history', async (req, res) => {
  const authed = getAuthed(req);
  const covers = await prisma.tripCover.findMany({
    where: { passengerUserId: authed.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { vehicle: true, route: true, payment: true },
  });
  res.json({ covers });
});

const claimDraftBodySchema = z.object({
  tripCoverId: z.string().min(1).optional(),
  accidentDate: z.string().min(8).optional(),
  accidentTime: z.string().min(4).optional(),
  location: z.string().min(2).max(200).optional(),
  description: z.string().min(20).max(2000).optional(),
  injured: z.boolean().optional(),
  vehicleInvolved: z.boolean().optional(),
  driverDetails: z.string().max(500).optional(),
  policeReference: z.string().max(120).optional(),
  medicalReference: z.string().max(120).optional(),
  vehiclePlate: z.string().max(40).optional(),
  driverPhone: z.string().max(40).optional(),
  trustedContactNote: z.string().max(500).optional(),
});

function parseIncidentDateTime(accidentDate?: string, accidentTime?: string) {
  if (!accidentDate || !accidentTime) return null;
  const iso = `${accidentDate}T${accidentTime}:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function loadUserClaim(claimId: string, userId: string) {
  return prisma.claim.findFirst({
    where: { id: claimId, passengerUserId: userId },
    include: {
      tripCover: { include: { payment: true, route: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  });
}

mobileRouter.get('/claims/eligibility', async (req, res) => {
  const authed = getAuthed(req);
  const covers = await loadEligibleCovers(authed.user.id);
  res.json({
    covers,
    uploadEnabled: CLAIMS_UPLOAD_ENABLED,
    claimWindowHours: env.claimWindowHours,
  });
});

mobileRouter.post('/claims/duplicate-check', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    tripCoverId: z.string().min(1).optional(),
    incidentDateTime: z.string().optional(),
    location: z.string().optional(),
    policeReference: z.string().optional(),
    excludeClaimId: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  const result = await checkDuplicateClaim(authed.user.id, parsed.data);
  res.json(result);
});

mobileRouter.get('/claims', async (req, res) => {
  const authed = getAuthed(req);
  const claims = await prisma.claim.findMany({
    where: { passengerUserId: authed.user.id },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    include: { tripCover: { include: { payment: true, route: true } } },
  });
  res.json({ claims: claims.map(serializeClaimListItem) });
});

mobileRouter.get('/claims/:claimId', async (req, res) => {
  const authed = getAuthed(req);
  const claim = await loadUserClaim(req.params.claimId, authed.user.id);
  if (!claim) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  res.json({ claim: serializeClaimDetail(claim) });
});

mobileRouter.post('/claims', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({ tripCoverId: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const eligible = await assertCoverEligibleForUser(authed.user.id, parsed.data.tripCoverId);
  if (!eligible.ok) {
    res.status(400).json({ error: eligible.error });
    return;
  }

  const reference = await ensureUniqueReference(generateClaimReference());
  const claim = await prisma.claim.create({
    data: {
      reference,
      tripCoverId: parsed.data.tripCoverId,
      passengerUserId: authed.user.id,
      status: 'draft',
      description: '',
    },
    include: { tripCover: { include: { payment: true, route: true } } },
  });

  await appendTimeline(claim.id, 'draft', 'Claim created', 'Draft saved on your device.');

  res.status(201).json({ claim: serializeClaimDetail({ ...claim, documents: [], timeline: [] }) });
});

mobileRouter.patch('/claims/:claimId', async (req, res) => {
  const authed = getAuthed(req);
  const parsed = claimDraftBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const existing = await loadUserClaim(req.params.claimId, authed.user.id);
  if (!existing) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  if (existing.status !== 'draft' && existing.status !== 'needs_action') {
    res.status(400).json({ error: 'Claim cannot be edited in its current status' });
    return;
  }

  const tripCoverId = parsed.data.tripCoverId ?? existing.tripCoverId;
  const eligible = await assertCoverEligibleForUser(authed.user.id, tripCoverId);
  if (!eligible.ok) {
    res.status(400).json({ error: eligible.error });
    return;
  }

  const incidentAt =
    parseIncidentDateTime(parsed.data.accidentDate, parsed.data.accidentTime) ??
    existing.incidentAt;

  if (incidentAt && incidentAt > new Date()) {
    res.status(400).json({ error: 'Incident date and time cannot be in the future' });
    return;
  }

  if (incidentAt && existing.tripCover) {
    const windowCheck = validateIncidentWithinCover(existing.tripCover, incidentAt);
    if (!windowCheck.ok) {
      res.status(400).json({ error: windowCheck.error });
      return;
    }
  }

  const claim = await prisma.claim.update({
    where: { id: existing.id },
    data: {
      tripCoverId,
      description: parsed.data.description ?? existing.description,
      location: parsed.data.location ?? existing.location,
      injured: parsed.data.injured ?? existing.injured,
      vehicleInvolved: parsed.data.vehicleInvolved ?? existing.vehicleInvolved,
      driverDetails: parsed.data.driverDetails ?? existing.driverDetails,
      policeReference: parsed.data.policeReference ?? existing.policeReference,
      medicalReference: parsed.data.medicalReference ?? existing.medicalReference,
      vehiclePlate: parsed.data.vehiclePlate ?? existing.vehiclePlate,
      driverPhone: parsed.data.driverPhone ?? existing.driverPhone,
      trustedContactNote: parsed.data.trustedContactNote ?? existing.trustedContactNote,
      incidentAt: incidentAt ?? existing.incidentAt,
    },
    include: {
      tripCover: { include: { payment: true, route: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  });

  res.json({ claim: serializeClaimDetail(claim) });
});

mobileRouter.post('/claims/:claimId/submit', async (req, res) => {
  const authed = getAuthed(req);
  const existing = await loadUserClaim(req.params.claimId, authed.user.id);
  if (!existing) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }
  if (existing.status !== 'draft' && existing.status !== 'needs_action') {
    res.status(400).json({ error: 'Claim has already been submitted' });
    return;
  }

  if (!existing.description || existing.description.trim().length < 20) {
    res.status(400).json({ error: 'Description must be at least 20 characters' });
    return;
  }
  if (!existing.location?.trim()) {
    res.status(400).json({ error: 'Location is required' });
    return;
  }
  if (!existing.incidentAt) {
    res.status(400).json({ error: 'Incident date and time are required' });
    return;
  }
  if (existing.incidentAt > new Date()) {
    res.status(400).json({ error: 'Incident date and time cannot be in the future' });
    return;
  }
  if (existing.injured == null || existing.vehicleInvolved == null) {
    res.status(400).json({ error: 'Injury and vehicle questions must be answered' });
    return;
  }

  const dup = await checkDuplicateClaim(authed.user.id, {
    tripCoverId: existing.tripCoverId,
    incidentDateTime: existing.incidentAt.toISOString(),
    location: existing.location,
    policeReference: existing.policeReference ?? undefined,
    excludeClaimId: existing.id,
  });
  if (dup.duplicateDecision === 'block') {
    res.status(409).json({
      error: 'Possible duplicate claim',
      duplicate: dup,
    });
    return;
  }

  const claim = await prisma.claim.update({
    where: { id: existing.id },
    data: { status: 'submitted' },
    include: {
      tripCover: { include: { payment: true, route: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  });

  await appendTimeline(claim.id, 'submitted', 'Claim submitted', 'SAFE has received your claim.');

  res.json({
    claim: serializeClaimDetail(claim),
    duplicate: dup.duplicate ? dup : undefined,
  });
});

mobileRouter.post('/claims/:claimId/documents', async (req, res) => {
  const authed = getAuthed(req);
  if (!CLAIMS_UPLOAD_ENABLED) {
    res.status(501).json({
      error: 'Document upload is not connected yet',
      code: 'not_connected',
    });
    return;
  }

  const schema = z.object({
    type: z.enum(['police_report', 'medical_note', 'photo', 'other']),
    filename: z.string().min(1).max(200),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const existing = await loadUserClaim(req.params.claimId, authed.user.id);
  if (!existing) {
    res.status(404).json({ error: 'Claim not found' });
    return;
  }

  const doc = await prisma.claimDocument.create({
    data: {
      claimId: existing.id,
      type: parsed.data.type,
      filename: parsed.data.filename,
      status: 'uploaded',
    },
  });

  res.status(201).json({ document: doc });
});

/** @deprecated Use POST /claims then PATCH + POST /claims/:id/submit */
mobileRouter.post('/claims/create', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    tripCoverId: z.string().min(1).optional(),
    description: z.string().min(20).max(2000),
    policeReference: z.string().min(3).optional(),
    hospitalSlipUrl: z.string().min(3).optional(),
    medicalReference: z.string().min(3).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const coverId = parsed.data.tripCoverId;
  if (!coverId) {
    res.status(400).json({ error: 'tripCoverId is required' });
    return;
  }

  const eligible = await assertCoverEligibleForUser(authed.user.id, coverId);
  if (!eligible.ok) {
    res.status(400).json({ error: eligible.error });
    return;
  }

  const reference = await ensureUniqueReference(generateClaimReference());
  const claim = await prisma.claim.create({
    data: {
      reference,
      tripCoverId: coverId,
      passengerUserId: authed.user.id,
      status: 'submitted',
      description: parsed.data.description,
      policeReference: parsed.data.policeReference ?? null,
      medicalReference:
        parsed.data.medicalReference ?? parsed.data.hospitalSlipUrl ?? null,
    },
    include: { tripCover: { include: { payment: true, route: true } } },
  });

  await appendTimeline(claim.id, 'submitted', 'Claim submitted', 'Submitted via legacy endpoint.');

  res.json({ claim: serializeClaimListItem(claim) });
});



mobileRouter.get('/home-summary', async (req, res) => {
  const authed = getAuthed(req);
  const summary = await buildHomeSummary(authed.user.id);
  res.json({ summary });
});

mobileRouter.get('/payment-methods', async (req, res) => {
  const authed = getAuthed(req);
  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ paymentMethods: methods.map(serializePaymentMethod) });
});

mobileRouter.post('/payment-methods', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    provider: z.enum(['airtel', 'mtn']),
    phoneNumber: z.string().min(9),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const normalizedPhone = normalizeZambianPhone(parsed.data.phoneNumber);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Use +260XXXXXXXXX or 09XXXXXXXX.' });
    return;
  }

  const type = providerToType(parsed.data.provider);
  const { label, subtitle } = typeToLabel(type);
  const maskedValue = maskPhoneNumber(normalizedPhone);

  const duplicate = await prisma.savedPaymentMethod.findFirst({
    where: {
      userId: authed.user.id,
      type,
      phoneNumber: normalizedPhone,
    },
  });
  if (duplicate) {
    res.status(409).json({ error: 'This mobile money number is already saved.' });
    return;
  }

  const existingCount = await prisma.savedPaymentMethod.count({
    where: { userId: authed.user.id },
  });

  const method = await prisma.$transaction(async (tx) => {
    if (existingCount === 0) {
      await tx.savedPaymentMethod.updateMany({
        where: { userId: authed.user.id },
        data: { isDefault: false },
      });
    }

    return tx.savedPaymentMethod.create({
      data: {
        userId: authed.user.id,
        type,
        label,
        subtitle,
        maskedValue,
        phoneNumber: normalizedPhone,
        isDefault: existingCount === 0,
        status: 'active',
      },
    });
  });

  res.status(201).json({ paymentMethod: serializePaymentMethod(method) });
});

mobileRouter.put('/payment-methods/:methodId/default', async (req, res) => {
  const authed = getAuthed(req);
  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id: req.params.methodId, userId: authed.user.id },
  });
  if (!method) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  await prisma.$transaction([
    prisma.savedPaymentMethod.updateMany({
      where: { userId: authed.user.id },
      data: { isDefault: false },
    }),
    prisma.savedPaymentMethod.update({
      where: { id: method.id },
      data: { isDefault: true },
    }),
  ]);

  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ paymentMethods: methods.map(serializePaymentMethod) });
});

mobileRouter.delete('/payment-methods/:methodId', async (req, res) => {
  const authed = getAuthed(req);
  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id: req.params.methodId, userId: authed.user.id },
  });
  if (!method) {
    res.status(404).json({ error: 'Payment method not found' });
    return;
  }

  await prisma.savedPaymentMethod.delete({ where: { id: method.id } });

  if (method.isDefault) {
    const next = await prisma.savedPaymentMethod.findFirst({
      where: { userId: authed.user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (next) {
      await prisma.savedPaymentMethod.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ paymentMethods: methods.map(serializePaymentMethod) });
});

const trustedContactBodySchema = z.object({
  name: z.string().trim().min(2),
  relationship: z.enum(TRUSTED_CONTACT_RELATIONSHIPS as unknown as [string, ...string[]]),
  phoneNumber: z.string().min(9),
  isPrimary: z.boolean().optional(),
});

mobileRouter.get('/trusted-contacts', async (req, res) => {
  const authed = getAuthed(req);
  const contacts = await prisma.trustedContact.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ trustedContacts: contacts.map(serializeTrustedContact) });
});

mobileRouter.post('/trusted-contacts', async (req, res) => {
  const authed = getAuthed(req);
  const parsed = trustedContactBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  if (!isValidRelationship(parsed.data.relationship)) {
    res.status(400).json({ error: 'Invalid relationship.' });
    return;
  }

  const normalizedPhone = normalizeTrustedPhone(parsed.data.phoneNumber);
  if (!normalizedPhone) {
    res.status(400).json({ error: 'Use +260XXXXXXXXX, 09XXXXXXXX, or 9XXXXXXXX.' });
    return;
  }

  const duplicate = await prisma.trustedContact.findFirst({
    where: { userId: authed.user.id, phoneNumber: normalizedPhone },
  });
  if (duplicate) {
    res.status(409).json({ error: 'This phone number is already saved as a trusted contact.' });
    return;
  }

  const existingCount = await prisma.trustedContact.count({
    where: { userId: authed.user.id },
  });
  const shouldBePrimary = parsed.data.isPrimary === true || existingCount === 0;

  const contact = await prisma.$transaction(async (tx) => {
    if (shouldBePrimary) {
      await tx.trustedContact.updateMany({
        where: { userId: authed.user.id },
        data: { isPrimary: false },
      });
    }

    return tx.trustedContact.create({
      data: {
        userId: authed.user.id,
        name: parsed.data.name.trim(),
        relationship: parsed.data.relationship,
        phoneNumber: normalizedPhone,
        maskedPhone: maskTrustedPhone(normalizedPhone),
        isPrimary: shouldBePrimary,
        isVerified: false,
      },
    });
  });

  res.status(201).json({ trustedContact: serializeTrustedContact(contact) });
});

mobileRouter.patch('/trusted-contacts/:contactId', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    name: z.string().trim().min(2).optional(),
    relationship: z.enum(TRUSTED_CONTACT_RELATIONSHIPS as unknown as [string, ...string[]]).optional(),
    phoneNumber: z.string().min(9).optional(),
    isPrimary: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.trustedContact.findFirst({
    where: { id: req.params.contactId, userId: authed.user.id },
  });
  if (!existing) {
    res.status(404).json({ error: 'Trusted contact not found' });
    return;
  }

  let normalizedPhone = existing.phoneNumber;
  if (parsed.data.phoneNumber) {
    const nextPhone = normalizeTrustedPhone(parsed.data.phoneNumber);
    if (!nextPhone) {
      res.status(400).json({ error: 'Use +260XXXXXXXXX, 09XXXXXXXX, or 9XXXXXXXX.' });
      return;
    }
    const duplicate = await prisma.trustedContact.findFirst({
      where: {
        userId: authed.user.id,
        phoneNumber: nextPhone,
        NOT: { id: existing.id },
      },
    });
    if (duplicate) {
      res.status(409).json({ error: 'This phone number is already saved as a trusted contact.' });
      return;
    }
    normalizedPhone = nextPhone;
  }

  const wantsPrimary = parsed.data.isPrimary === true;

  const updated = await prisma.$transaction(async (tx) => {
    if (wantsPrimary) {
      await tx.trustedContact.updateMany({
        where: { userId: authed.user.id },
        data: { isPrimary: false },
      });
    }

    return tx.trustedContact.update({
      where: { id: existing.id },
      data: {
        ...(parsed.data.name ? { name: parsed.data.name.trim() } : {}),
        ...(parsed.data.relationship ? { relationship: parsed.data.relationship } : {}),
        ...(parsed.data.phoneNumber
          ? {
              phoneNumber: normalizedPhone,
              maskedPhone: maskTrustedPhone(normalizedPhone),
            }
          : {}),
        ...(parsed.data.isPrimary !== undefined ? { isPrimary: parsed.data.isPrimary } : {}),
      },
    });
  });

  res.json({ trustedContact: serializeTrustedContact(updated) });
});

mobileRouter.put('/trusted-contacts/:contactId/primary', async (req, res) => {
  const authed = getAuthed(req);
  const contact = await prisma.trustedContact.findFirst({
    where: { id: req.params.contactId, userId: authed.user.id },
  });
  if (!contact) {
    res.status(404).json({ error: 'Trusted contact not found' });
    return;
  }

  await prisma.$transaction([
    prisma.trustedContact.updateMany({
      where: { userId: authed.user.id },
      data: { isPrimary: false },
    }),
    prisma.trustedContact.update({
      where: { id: contact.id },
      data: { isPrimary: true },
    }),
  ]);

  const contacts = await prisma.trustedContact.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ trustedContacts: contacts.map(serializeTrustedContact) });
});

mobileRouter.delete('/trusted-contacts/:contactId', async (req, res) => {
  const authed = getAuthed(req);
  const contact = await prisma.trustedContact.findFirst({
    where: { id: req.params.contactId, userId: authed.user.id },
  });
  if (!contact) {
    res.status(404).json({ error: 'Trusted contact not found' });
    return;
  }

  await prisma.trustedContact.delete({ where: { id: contact.id } });

  if (contact.isPrimary) {
    const next = await prisma.trustedContact.findFirst({
      where: { userId: authed.user.id },
      orderBy: { createdAt: 'asc' },
    });
    if (next) {
      await prisma.trustedContact.update({
        where: { id: next.id },
        data: { isPrimary: true },
      });
    }
  }

  const contacts = await prisma.trustedContact.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ trustedContacts: contacts.map(serializeTrustedContact) });
});

mobileRouter.get('/settings/config', async (_req, res) => {
  res.json({ config: getSettingsConfigPayload() });
});

mobileRouter.get('/settings/account', async (req, res) => {
  const authed = getAuthed(req);
  const account = await serializeAccountDetails(authed.user.id);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ account });
});

mobileRouter.patch('/settings/account', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({ fullName: z.string().min(2).max(80) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  await prisma.passengerProfile.upsert({
    where: { userId: authed.user.id },
    create: { userId: authed.user.id, fullName: parsed.data.fullName },
    update: { fullName: parsed.data.fullName },
  });

  const account = await serializeAccountDetails(authed.user.id);
  res.json({ account });
});

mobileRouter.post('/settings/data-export', async (req, res) => {
  const authed = getAuthed(req);
  if (!env.dataExportEnabled) {
    res.status(501).json({ error: 'Data export is not connected yet.' });
    return;
  }

  res.json({
    message: 'Data request received. SAFE will prepare your account data.',
    requestedAt: new Date().toISOString(),
    userId: authed.user.id,
  });
});

mobileRouter.delete('/settings/account', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({ confirmText: z.literal('DELETE') });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Type DELETE to confirm account deletion.' });
    return;
  }

  if (!env.accountDeletionEnabled) {
    res.status(501).json({ error: 'Account deletion is not connected yet.' });
    return;
  }

  await prisma.user.update({
    where: { id: authed.user.id },
    data: { isActive: false },
  });

  res.json({ deleted: true });
});

mobileRouter.get('/trusted-contacts/:contactId/dial', async (req, res) => {
  const authed = getAuthed(req);
  const contact = await prisma.trustedContact.findFirst({
    where: { id: req.params.contactId, userId: authed.user.id },
  });
  if (!contact) {
    res.status(404).json({ error: 'Trusted contact not found' });
    return;
  }
  const digits = contact.phoneNumber.replace(/\D/g, '');
  res.json({ dialUrl: `tel:+${digits}` });
});

mobileRouter.get('/help-safety/config', async (_req, res) => {
  res.json({ config: getHelpSafetyConfig() });
});

mobileRouter.post('/support-reports', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    problemType: z.enum(SUPPORT_PROBLEM_TYPES as unknown as [string, ...string[]]),
    message: z.string().trim().min(10).max(2000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const report = await prisma.supportReport.create({
    data: {
      userId: authed.user.id,
      problemType: parsed.data.problemType,
      message: parsed.data.message.trim(),
    },
  });

  res.status(201).json({
    report: {
      id: report.id,
      problemType: report.problemType,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    },
  });
});

async function getOrCreateNotificationPreferences(userId: string) {
  const existing = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return prisma.notificationPreference.create({
    data: { userId, ...defaultNotificationPreferences() },
  });
}

mobileRouter.get('/notification-preferences', async (req, res) => {
  const authed = getAuthed(req);
  const pref = await getOrCreateNotificationPreferences(authed.user.id);
  res.json({ preferences: serializeNotificationPreferences(pref) });
});

mobileRouter.patch('/notification-preferences', async (req, res) => {
  const authed = getAuthed(req);
  const updates = pickPreferenceUpdates(req.body ?? {});
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No valid preference fields provided.' });
    return;
  }

  await getOrCreateNotificationPreferences(authed.user.id);
  const pref = await prisma.notificationPreference.update({
    where: { userId: authed.user.id },
    data: updates,
  });
  res.json({ preferences: serializeNotificationPreferences(pref) });
});

mobileRouter.post('/notification-preferences/permission-requested', async (req, res) => {
  const authed = getAuthed(req);
  const schema = z.object({
    granted: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  const granted = parsed.success ? Boolean(parsed.data.granted) : false;

  await getOrCreateNotificationPreferences(authed.user.id);
  const pref = await prisma.notificationPreference.update({
    where: { userId: authed.user.id },
    data: { pushEnabled: granted },
  });
  res.json({ preferences: serializeNotificationPreferences(pref) });
});

