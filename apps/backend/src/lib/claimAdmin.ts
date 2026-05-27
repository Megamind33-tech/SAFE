import type { ClaimStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { serializeClaimDetail } from './claims.js';

const ADMIN_CLAIM_STATUSES: ClaimStatus[] = [
  'under_review',
  'needs_action',
  'approved',
  'rejected',
  'paid',
];

const STATUS_LABELS: Record<ClaimStatus, string> = {
  draft: 'Draft saved',
  submitted: 'Claim submitted',
  under_review: 'Under review',
  needs_action: 'Needs action',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid out',
  cancelled: 'Cancelled',
};

export async function updateClaimAdminStatus(
  claimId: string,
  input: { status: ClaimStatus; note?: string; adminUserId?: string },
) {
  if (!ADMIN_CLAIM_STATUSES.includes(input.status)) {
    throw new Error('Status not allowed for admin update.');
  }

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { tripCover: { include: { payment: true } }, payout: true },
  });
  if (!claim) {
    throw new Error('Claim not found');
  }

  if (input.status === 'paid' && claim.status !== 'approved' && claim.status !== 'paid') {
    throw new Error('Claim must be approved before marking paid.');
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status: input.status },
    include: {
      tripCover: { include: { payment: true, vehicle: true, route: true } },
      passengerUser: { include: { passengerProfile: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
      payout: true,
    },
  });

  await prisma.claimTimelineEvent.create({
    data: {
      claimId,
      status: input.status,
      title: STATUS_LABELS[input.status],
      detail: input.note?.trim() || undefined,
    },
  });

  if (input.status === 'approved') {
    const amount = claim.tripCover?.amount ?? 0;
    await prisma.payout.upsert({
      where: { claimId },
      create: {
        claimId,
        amount,
        currency: claim.tripCover?.currency ?? 'ZMW',
        status: 'pending',
      },
      update: { status: 'pending', amount },
    });
  }

  if (input.status === 'paid') {
    await prisma.payout.upsert({
      where: { claimId },
      create: {
        claimId,
        amount: claim.tripCover?.amount ?? 0,
        currency: claim.tripCover?.currency ?? 'ZMW',
        status: 'succeeded',
      },
      update: { status: 'succeeded' },
    });
  }

  const detail = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tripCover: { include: { payment: true, vehicle: true, route: true } },
      passengerUser: { include: { passengerProfile: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
      payout: true,
    },
  });

  return serializeClaimDetail(detail!);
}

export async function loadDashboardClaimDetail(claimId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tripCover: { include: { payment: true, vehicle: true, route: true } },
      passengerUser: { include: { passengerProfile: true } },
      documents: { orderBy: { createdAt: 'asc' } },
      timeline: { orderBy: { createdAt: 'asc' } },
      payout: true,
    },
  });
  if (!claim) return null;
  return {
    ...serializeClaimDetail(claim),
    payout: claim.payout
      ? {
          id: claim.payout.id,
          amount: claim.payout.amount,
          currency: claim.payout.currency,
          status: claim.payout.status,
        }
      : null,
    passenger: {
      id: claim.passengerUser.id,
      phone: claim.passengerUser.phone,
      fullName: claim.passengerUser.passengerProfile?.fullName ?? null,
    },
    tripCover: claim.tripCover
      ? {
          id: claim.tripCover.id,
          plan: claim.tripCover.plan,
          vehicle: claim.tripCover.vehicle,
          route: claim.tripCover.route,
        }
      : null,
    documentsMetadataOnly: !process.env.SAFE_CLAIMS_UPLOAD_ENABLED || process.env.SAFE_CLAIMS_UPLOAD_ENABLED !== 'true',
  };
}
