import type { Claim, ClaimDocument, ClaimTimelineEvent, TripCover } from '@prisma/client';
import { prisma } from './prisma.js';

export const CLAIM_WINDOW_HOURS = Number.parseInt(
  process.env.SAFE_CLAIM_WINDOW_HOURS ?? '168',
  10
);

export const CLAIMS_UPLOAD_ENABLED = process.env.SAFE_CLAIMS_UPLOAD_ENABLED === 'true';

type CoverWithPayment = TripCover & {
  payment: { status: string } | null;
  route: { origin: string; destination: string } | null;
};

export function generateClaimReference(createdAt: Date = new Date()) {
  const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SAFE-CLM-${ymd}-${suffix}`;
}

export function mapLegacyClaimStatus(status: string): string {
  if (status === 'processing') return 'under_review';
  if (status === 'pending') return 'submitted';
  if (status === 'needs_documents') return 'needs_action';
  return status;
}

export function buildPolicyId(cover: { id: string; createdAt: Date }) {
  const ymd = cover.createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-${ymd}-${cover.id.slice(-4).toUpperCase()}`;
}

function coverPeriod(cover: CoverWithPayment) {
  const start = cover.startedAt.toISOString();
  const end = cover.endsAt.toISOString();
  return { start, end };
}

export function serializeClaimDocument(doc: ClaimDocument) {
  return {
    id: doc.id,
    type: doc.type,
    filename: doc.filename,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeTimelineEvent(event: ClaimTimelineEvent) {
  return {
    id: event.id,
    status: mapLegacyClaimStatus(event.status),
    title: event.title,
    detail: event.detail ?? undefined,
    createdAt: event.createdAt.toISOString(),
  };
}

type ClaimWithRelations = Claim & {
  tripCover?: CoverWithPayment & { route?: { origin: string; destination: string } | null };
  documents?: ClaimDocument[];
  timeline?: ClaimTimelineEvent[];
};

export function serializeClaimListItem(claim: ClaimWithRelations) {
  const cover = claim.tripCover;
  const status = mapLegacyClaimStatus(claim.status);
  return {
    id: claim.id,
    reference: claim.reference,
    status,
    coverId: claim.tripCoverId,
    policyId: cover ? buildPolicyId(cover) : undefined,
    planName: cover?.plan ?? undefined,
    incidentDateTime: claim.incidentAt?.toISOString() ?? undefined,
    location: claim.location ?? undefined,
    description: claim.description || undefined,
    injured: claim.injured ?? undefined,
    policeReference: claim.policeReference ?? undefined,
    medicalReference: claim.medicalReference ?? undefined,
    createdAt: claim.createdAt.toISOString(),
    updatedAt: claim.updatedAt.toISOString(),
  };
}

export function serializeClaimDetail(claim: ClaimWithRelations) {
  const base = serializeClaimListItem(claim);
  const cover = claim.tripCover;
  return {
    ...base,
    vehicleInvolved: claim.vehicleInvolved ?? undefined,
    driverDetails: claim.driverDetails ?? undefined,
    driverPhone: claim.driverPhone ?? undefined,
    vehiclePlate: claim.vehiclePlate ?? undefined,
    trustedContactNote: claim.trustedContactNote ?? undefined,
    coverPeriod: cover ? coverPeriod(cover) : undefined,
    paymentStatus: cover?.payment?.status ?? undefined,
    documents: (claim.documents ?? []).map(serializeClaimDocument),
    timeline: (claim.timeline ?? []).map(serializeTimelineEvent),
  };
}

function isCoverPaymentEligible(paymentStatus: string | undefined) {
  return paymentStatus === 'succeeded';
}

function isWithinClaimWindow(cover: TripCover, incidentAt: Date) {
  const windowStart = new Date(cover.startedAt);
  const windowEnd = new Date(cover.endsAt);
  windowEnd.setHours(windowEnd.getHours() + CLAIM_WINDOW_HOURS);
  return incidentAt >= windowStart && incidentAt <= windowEnd;
}

export async function loadEligibleCovers(userId: string) {
  const now = new Date();
  const windowCutoff = new Date(now);
  windowCutoff.setHours(windowCutoff.getHours() - CLAIM_WINDOW_HOURS);

  const covers = await prisma.tripCover.findMany({
    where: {
      passengerUserId: userId,
      OR: [
        { status: 'active', endsAt: { gt: now } },
        { endsAt: { gte: windowCutoff } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { payment: true, route: true },
  });

  return covers
    .filter((cover) => isCoverPaymentEligible(cover.payment?.status))
    .map((cover) => {
      const active = cover.status === 'active' && cover.endsAt > now;
      const recentlyExpired = !active && cover.endsAt >= windowCutoff;
      return {
        coverId: cover.id,
        policyId: buildPolicyId(cover),
        planName: cover.plan,
        coverPeriod: coverPeriod(cover),
        paymentStatus: cover.payment?.status ?? 'pending',
        eligibility: active ? 'active' : recentlyExpired ? 'recent_expired' : 'claim_window',
        routeLabel:
          cover.route?.origin && cover.route?.destination
            ? `${cover.route.origin} → ${cover.route.destination}`
            : undefined,
      };
    });
}

export async function assertCoverEligibleForUser(userId: string, tripCoverId: string) {
  const eligible = await loadEligibleCovers(userId);
  const match = eligible.find((c) => c.coverId === tripCoverId);
  if (!match) {
    return { ok: false as const, error: 'Cover is not eligible for a claim' };
  }
  return { ok: true as const, cover: match };
}

export async function appendTimeline(
  claimId: string,
  status: Claim['status'],
  title: string,
  detail?: string
) {
  await prisma.claimTimelineEvent.create({
    data: { claimId, status, title, detail: detail ?? null },
  });
}

export type DuplicateCheckPayload = {
  tripCoverId?: string;
  incidentDateTime?: string;
  location?: string;
  policeReference?: string;
  excludeClaimId?: string;
};

export async function checkDuplicateClaim(userId: string, payload: DuplicateCheckPayload) {
  const where: {
    passengerUserId: string;
    id?: { not: string };
    tripCoverId?: string;
    policeReference?: string;
    incidentAt?: { gte: Date; lte: Date };
    location?: string;
  } = { passengerUserId: userId };

  if (payload.excludeClaimId) {
    where.id = { not: payload.excludeClaimId };
  }

  let duplicateDecision: 'allow' | 'warn' | 'block' = 'allow';
  let existingClaimId: string | undefined;
  let reason: string | undefined;

  if (payload.tripCoverId) {
    const sameCover = await prisma.claim.findFirst({
      where: {
        passengerUserId: userId,
        tripCoverId: payload.tripCoverId,
        status: { notIn: ['cancelled', 'rejected'] },
        ...(payload.excludeClaimId ? { id: { not: payload.excludeClaimId } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (sameCover) {
      duplicateDecision = 'warn';
      existingClaimId = sameCover.id;
      reason = 'A claim already exists for this cover.';
    }
  }

  if (payload.policeReference?.trim()) {
    const ref = payload.policeReference.trim();
    const sameRef = await prisma.claim.findFirst({
      where: {
        passengerUserId: userId,
        policeReference: ref,
        ...(payload.excludeClaimId ? { id: { not: payload.excludeClaimId } } : {}),
      },
    });
    if (sameRef) {
      duplicateDecision = 'block';
      existingClaimId = sameRef.id;
      reason = 'A claim with this police reference already exists.';
    }
  }

  if (payload.incidentDateTime && payload.tripCoverId) {
    const incident = new Date(payload.incidentDateTime);
    if (!Number.isNaN(incident.getTime())) {
      const start = new Date(incident);
      start.setHours(start.getHours() - 2);
      const end = new Date(incident);
      end.setHours(end.getHours() + 2);
      const similar = await prisma.claim.findFirst({
        where: {
          passengerUserId: userId,
          tripCoverId: payload.tripCoverId,
          incidentAt: { gte: start, lte: end },
          ...(payload.excludeClaimId ? { id: { not: payload.excludeClaimId } } : {}),
        },
      });
      if (similar && duplicateDecision === 'allow') {
        duplicateDecision = 'warn';
        existingClaimId = similar.id;
        reason = 'A claim with a similar incident time exists for this cover.';
      }
    }
  }

  if (
    payload.location?.trim() &&
    payload.incidentDateTime &&
    duplicateDecision === 'allow'
  ) {
    const incident = new Date(payload.incidentDateTime);
    const start = new Date(incident);
    start.setDate(start.getDate() - 1);
    const end = new Date(incident);
    end.setDate(end.getDate() + 1);
    const locMatch = await prisma.claim.findFirst({
      where: {
        passengerUserId: userId,
        location: payload.location.trim(),
        incidentAt: { gte: start, lte: end },
        ...(payload.excludeClaimId ? { id: { not: payload.excludeClaimId } } : {}),
      },
    });
    if (locMatch) {
      duplicateDecision = 'warn';
      existingClaimId = locMatch.id;
      reason = 'A claim with a similar location and date may already exist.';
    }
  }

  return {
    duplicate: duplicateDecision !== 'allow',
    duplicateDecision,
    existingClaimId,
    reason,
  };
}

export function validateIncidentWithinCover(
  cover: TripCover,
  incidentAt: Date,
  allowManualReview = false
) {
  if (isWithinClaimWindow(cover, incidentAt)) {
    return { ok: true as const };
  }
  if (allowManualReview) {
    return { ok: true as const, manualReview: true };
  }
  return {
    ok: false as const,
    error: 'Incident date and time must fall within your cover and claim window.',
  };
}

export async function ensureUniqueReference(reference: string, attempt = 0): Promise<string> {
  const existing = await prisma.claim.findUnique({ where: { reference } });
  if (!existing) return reference;
  if (attempt > 5) {
    return `${reference}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }
  return ensureUniqueReference(generateClaimReference(), attempt + 1);
}
