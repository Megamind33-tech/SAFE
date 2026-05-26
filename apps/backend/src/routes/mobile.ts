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
import { listAvailableCoverPlans } from '../lib/coverPlans.js';
import {
  coverCapabilities,
  getPurchaseStatus,
  loadActiveCoverForUser,
  loadPendingCoverForUser,
  serializeActiveCover,
  startCoverPurchase,
} from '../lib/coverPurchase.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { env } from '../lib/env.js';
import { requireRole } from '../middleware/requireRole.js';

export const mobileRouter = Router();

mobileRouter.use(requireAuth);
mobileRouter.use(requireRole(['passenger']));

async function loadActiveCover(userId: string) {
  return loadActiveCoverForUser(userId);
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

mobileRouter.get('/cover/plans', async (_req, res) => {
  res.json({
    plans: listAvailableCoverPlans(),
    capabilities: coverCapabilities(),
  });
});

mobileRouter.get('/cover/active', async (req, res) => {
  const authed = req as AuthedRequest;
  const cover = await loadActiveCover(authed.user.id);
  const pending = await loadPendingCoverForUser(authed.user.id);
  res.json({
    cover: serializeActiveCover(cover),
    pendingCover: pending ? serializeActiveCover(pending) : null,
    trip: serializeActiveTrip(cover),
    capabilities: coverCapabilities(),
  });
});

mobileRouter.post('/cover/purchase', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    planId: z.string().min(1),
    paymentMethodId: z.string().min(1),
    vehicleId: z.string().min(1).optional(),
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
  const authed = req as AuthedRequest;
  const status = await getPurchaseStatus(authed.user.id, req.params.purchaseId);
  if (!status) {
    res.status(404).json({ error: 'Purchase not found' });
    return;
  }
  res.json(status);
});

mobileRouter.get('/trips/:tripId/route', async (req, res) => {
  const authed = req as AuthedRequest;
  const cover = await prisma.tripCover.findFirst({
    where: { id: req.params.tripId, passengerUserId: authed.user.id },
    include: { vehicle: { include: { route: true, driver: true } }, route: true },
  });
  if (!cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  res.json({ trip: serializeActiveTrip(cover) });
});

mobileRouter.get('/trips/:tripId/location', async (req, res) => {
  const authed = req as AuthedRequest;
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

mobileRouter.get('/payment-methods', async (req, res) => {
  const authed = req as AuthedRequest;
  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ paymentMethods: methods.map(serializePaymentMethod) });
});

mobileRouter.post('/payment-methods', async (req, res) => {
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
  const contacts = await prisma.trustedContact.findMany({
    where: { userId: authed.user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  });
  res.json({ trustedContacts: contacts.map(serializeTrustedContact) });
});

mobileRouter.post('/trusted-contacts', async (req, res) => {
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
  const account = await serializeAccountDetails(authed.user.id);
  if (!account) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  res.json({ account });
});

mobileRouter.patch('/settings/account', async (req, res) => {
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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
  const authed = req as AuthedRequest;
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

