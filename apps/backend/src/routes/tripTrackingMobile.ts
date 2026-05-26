import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  serializeActiveTripPayload,
  coverIsTrackable,
  isValidCoordinate,
} from '../lib/tripTracking.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

export const tripTrackingRouter = Router();

tripTrackingRouter.use(requireAuth);
tripTrackingRouter.use(requireRole(['passenger']));

const coverInclude = {
  vehicle: { include: { route: true, driver: true } },
  route: true,
  payment: true,
  tripTracking: true,
} as const;

async function loadActiveCover(userId: string) {
  const now = new Date();
  return prisma.tripCover.findFirst({
    where: { passengerUserId: userId, status: 'active', endsAt: { gt: now } },
    orderBy: { createdAt: 'desc' },
    include: coverInclude,
  });
}

async function loadTripForUser(userId: string, tripId: string) {
  const tracking = await prisma.tripTracking.findFirst({
    where: {
      OR: [{ id: tripId }, { tripCoverId: tripId }],
      tripCover: { passengerUserId: userId },
    },
    include: { tripCover: { include: coverInclude } },
  });
  if (tracking) return { tracking, cover: tracking.tripCover };
  const cover = await prisma.tripCover.findFirst({
    where: { id: tripId, passengerUserId: userId },
    include: coverInclude,
  });
  if (!cover) return null;
  const tripTracking = await prisma.tripTracking.findUnique({ where: { tripCoverId: cover.id } });
  return { tracking: tripTracking, cover };
}

async function finalizeTripIfCoverExpired(
  cover: NonNullable<Awaited<ReturnType<typeof loadActiveCover>>>,
  tracking: { id: string; status: string } | null
) {
  const expired = !coverIsTrackable(cover);
  if (!expired || !tracking || tracking.status !== 'active') {
    return { tracking, coverExpired: expired };
  }
  const updated = await prisma.tripTracking.update({
    where: { id: tracking.id },
    data: { status: 'ended', endedAt: new Date(), lastUpdatedAt: new Date() },
  });
  return { tracking: updated, coverExpired: true };
}

async function loadExpiredTrackingTrip(userId: string) {
  const tracking = await prisma.tripTracking.findFirst({
    where: {
      status: 'active',
      tripCover: { passengerUserId: userId },
    },
    orderBy: { updatedAt: 'desc' },
    include: { tripCover: { include: coverInclude } },
  });
  if (!tracking) return null;
  if (coverIsTrackable(tracking.tripCover)) return null;
  return { tracking, cover: tracking.tripCover, coverExpired: true };
}

tripTrackingRouter.get('/active-trip', async (req, res) => {
  const authed = req as AuthedRequest;
  let cover = await loadActiveCover(authed.user.id);
  let tracking = cover?.tripTracking ?? null;
  let coverExpired = false;

  if (!cover) {
    const expiredCtx = await loadExpiredTrackingTrip(authed.user.id);
    if (expiredCtx) {
      cover = expiredCtx.cover;
      tracking = expiredCtx.tracking;
      coverExpired = true;
    } else {
      res.json({ trip: null, activeCover: null });
      return;
    }
  } else {
    const finalized = await finalizeTripIfCoverExpired(cover, tracking);
    tracking = finalized.tracking;
    coverExpired = finalized.coverExpired;
  }

  res.json({
    trip: serializeActiveTripPayload(cover, tracking, { coverExpired }),
    activeCover: cover
      ? {
          id: cover.id,
          status: cover.status,
          endsAt: cover.endsAt.toISOString(),
          paymentStatus: cover.payment?.status ?? 'pending',
          trackable: coverIsTrackable(cover),
        }
      : null,
  });
});

tripTrackingRouter.post('/trips/start', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    coverId: z.string().min(1).optional(),
    startLocation: z
      .object({ lat: z.number(), lng: z.number(), label: z.string().optional() })
      .optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const cover = parsed.data.coverId
    ? await prisma.tripCover.findFirst({
        where: { id: parsed.data.coverId, passengerUserId: authed.user.id },
        include: coverInclude,
      })
    : await loadActiveCover(authed.user.id);

  if (!cover) {
    res.status(400).json({ error: 'No active cover found' });
    return;
  }
  if (!coverIsTrackable(cover)) {
    res.status(400).json({ error: 'Cover is not eligible for trip tracking' });
    return;
  }

  const start = parsed.data.startLocation;
  if (start && !isValidCoordinate(start.lat, start.lng)) {
    res.status(400).json({ error: 'Invalid start coordinates' });
    return;
  }

  const now = new Date();
  const tracking = await prisma.tripTracking.upsert({
    where: { tripCoverId: cover.id },
    create: {
      tripCoverId: cover.id,
      status: 'active',
      startedAt: now,
      lastUpdatedAt: now,
      startLat: start?.lat,
      startLng: start?.lng,
      startLabel: start?.label,
      currentLat: start?.lat,
      currentLng: start?.lng,
      currentRecordedAt: start ? now : undefined,
    },
    update: {
      status: 'active',
      startedAt: now,
      endedAt: null,
      lastUpdatedAt: now,
      ...(start
        ? {
            startLat: start.lat,
            startLng: start.lng,
            startLabel: start.label,
            currentLat: start.lat,
            currentLng: start.lng,
            currentRecordedAt: now,
          }
        : {}),
    },
  });

  res.status(201).json({ trip: serializeActiveTripPayload(cover, tracking) });
});

tripTrackingRouter.patch('/trips/:tripId/location', async (req, res) => {
  const authed = req as AuthedRequest;
  const schema = z.object({
    lat: z.number(),
    lng: z.number(),
    accuracyMeters: z.number().optional(),
    recordedAt: z.string().datetime().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }
  if (!isValidCoordinate(parsed.data.lat, parsed.data.lng)) {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }

  const ctx = await loadTripForUser(authed.user.id, req.params.tripId);
  if (!ctx?.cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  if (!coverIsTrackable(ctx.cover)) {
    res.status(400).json({ error: 'Cover expired — trip tracking stopped' });
    return;
  }

  let tracking = ctx.tracking;
  if (!tracking) {
    res.status(400).json({ error: 'Trip tracking has not been started' });
    return;
  }
  if (tracking.status === 'ended') {
    res.status(400).json({ error: 'Trip has ended' });
    return;
  }

  const recordedAt = parsed.data.recordedAt ? new Date(parsed.data.recordedAt) : new Date();
  tracking = await prisma.tripTracking.update({
    where: { id: tracking.id },
    data: {
      status: 'active',
      currentLat: parsed.data.lat,
      currentLng: parsed.data.lng,
      currentAccuracy: parsed.data.accuracyMeters,
      currentRecordedAt: recordedAt,
      lastUpdatedAt: new Date(),
      ...(tracking.startLat == null
        ? { startLat: parsed.data.lat, startLng: parsed.data.lng }
        : {}),
    },
  });

  res.json({ trip: serializeActiveTripPayload(ctx.cover, tracking) });
});

tripTrackingRouter.post('/trips/:tripId/end', async (req, res) => {
  const authed = req as AuthedRequest;
  const ctx = await loadTripForUser(authed.user.id, req.params.tripId);
  if (!ctx?.cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }

  let tracking = ctx.tracking;
  if (!tracking) {
    tracking = await prisma.tripTracking.create({
      data: {
        tripCoverId: ctx.cover.id,
        status: 'ended',
        startedAt: ctx.cover.startedAt,
        endedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    });
  } else if (tracking.status !== 'ended') {
    tracking = await prisma.tripTracking.update({
      where: { id: tracking.id },
      data: { status: 'ended', endedAt: new Date(), lastUpdatedAt: new Date() },
    });
  }

  res.json({
    trip: serializeActiveTripPayload(ctx.cover, tracking, {
      coverExpired: !coverIsTrackable(ctx.cover),
    }),
  });
});

tripTrackingRouter.get('/trips/:tripId', async (req, res) => {
  const authed = req as AuthedRequest;
  const ctx = await loadTripForUser(authed.user.id, req.params.tripId);
  if (!ctx?.cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  const { tracking, coverExpired } = await finalizeTripIfCoverExpired(ctx.cover, ctx.tracking);
  res.json({ trip: serializeActiveTripPayload(ctx.cover, tracking, { coverExpired }) });
});

tripTrackingRouter.get('/trips/:tripId/location', async (req, res) => {
  const authed = req as AuthedRequest;
  const ctx = await loadTripForUser(authed.user.id, req.params.tripId);
  if (!ctx?.cover) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }

  const tracking = ctx.tracking;
  if (
    tracking?.currentLat != null &&
    tracking?.currentLng != null &&
    isValidCoordinate(tracking.currentLat, tracking.currentLng)
  ) {
    res.json({
      location: {
        lat: tracking.currentLat,
        lng: tracking.currentLng,
        updatedAt:
          tracking.currentRecordedAt?.toISOString() ?? tracking.lastUpdatedAt?.toISOString() ?? null,
      },
    });
    return;
  }

  const vehicle = ctx.cover.vehicle;
  if (!vehicle || vehicle.lastLat == null || vehicle.lastLng == null) {
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
