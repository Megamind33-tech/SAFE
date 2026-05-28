import type { QrCodeStatus, QrScanResult } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { loadActiveCoverForUser } from './coverPurchase.js';

const CODE_PATTERN = /^SAFE-[A-Z0-9-]+$/i;

export function normalizeQrCodeInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  try {
    if (/^safe:\/\/vehicle\//i.test(trimmed)) {
      return decodeURIComponent(trimmed.replace(/^safe:\/\/vehicle\//i, '').split(/[?#]/)[0] ?? '').trim();
    }
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const hashPart = url.hash.replace(/^#/, '');
      if (hashPart.startsWith('qr/')) {
        return decodeURIComponent(hashPart.slice(3).split(/[?#]/)[0] ?? '').trim();
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      const qIndex = pathParts.findIndex((part) => part.toLowerCase() === 'q');
      if (qIndex >= 0 && pathParts[qIndex + 1]) {
        return decodeURIComponent(pathParts[qIndex + 1]).trim();
      }
      const last = pathParts[pathParts.length - 1];
      if (last && last.toLowerCase() !== 'q') return decodeURIComponent(last).trim();
    }
  } catch {
    /* fall through to raw code */
  }

  return trimmed;
}

export function buildQrPublicUrl(code: string) {
  const base = env.qrPublicBaseUrl.replace(/\/$/, '');
  return `${base}/q/${encodeURIComponent(code)}`;
}

export function buildQrDeepLink(code: string) {
  return `safe://vehicle/${encodeURIComponent(code)}`;
}

export function generateVehicleQrCode(plateNumber: string) {
  const plateToken = plateNumber.replace(/\s+/g, '').toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SAFE-${plateToken}-${suffix}`;
}

type VerifyContext = {
  userId?: string;
  userAgent?: string | null;
  approximateLat?: number;
  approximateLng?: number;
};

type VerifyPayload = {
  status: 'verified' | 'invalid' | 'expired' | 'disabled';
  qrType: 'vehicle';
  qrCodeId?: string;
  code?: string;
  verifiedAt?: string;
  vehicle?: {
    id: string;
    plateNumber: string;
    routeName: string | null;
    operatorName: string | null;
    vehicleType: string;
  };
  route?: {
    id: string;
    name: string;
    originLabel: string;
    destinationLabel: string;
  };
  partner?: {
    id: string;
    name: string;
  };
  coverEligibility?: {
    canBuyCover: boolean;
    canStartTripTracking: boolean;
    reason?: string;
  };
  reason?: string;
};

async function logScan(params: {
  qrCodeId?: string | null;
  userId?: string;
  result: QrScanResult;
  userAgent?: string | null;
  approximateLat?: number;
  approximateLng?: number;
  metadata?: Record<string, unknown>;
}) {
  await prisma.qrScanLog.create({
    data: {
      qrCodeId: params.qrCodeId ?? null,
      userId: params.userId ?? null,
      result: params.result,
      userAgent: params.userAgent ?? null,
      approximateLat: params.approximateLat ?? null,
      approximateLng: params.approximateLng ?? null,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}

function resolveEffectiveStatus(record: {
  status: QrCodeStatus;
  isActive: boolean;
  expiresAt: Date | null;
}): QrCodeStatus | 'expired' {
  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }
  if (!record.isActive || record.status === 'disabled') {
    return 'disabled';
  }
  if (record.status === 'expired') {
    return 'expired';
  }
  return record.status;
}

async function buildCoverEligibility(userId?: string) {
  if (!userId) {
    return {
      canBuyCover: true,
      canStartTripTracking: false,
      reason: 'Sign in to check cover eligibility.',
    };
  }

  const activeCover = await loadActiveCoverForUser(userId);
  if (activeCover) {
    return {
      canBuyCover: false,
      canStartTripTracking: true,
      reason: 'You already have active cover for this trip.',
    };
  }

  const pendingCover = await prisma.tripCover.findFirst({
    where: {
      passengerUserId: userId,
      payment: { status: 'pending' },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (pendingCover) {
    return {
      canBuyCover: false,
      canStartTripTracking: false,
      reason: 'Complete your pending payment before buying new cover.',
    };
  }

  const expiredCover = await prisma.tripCover.findFirst({
    where: {
      passengerUserId: userId,
      OR: [
        { status: 'expired' },
        { endsAt: { lte: new Date() } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  if (expiredCover) {
    return {
      canBuyCover: true,
      canStartTripTracking: false,
      reason: 'Your previous cover has expired. Buy cover for this trip.',
    };
  }

  return {
    canBuyCover: true,
    canStartTripTracking: false,
  };
}

export async function verifyQrCode(rawCode: string, context: VerifyContext = {}): Promise<VerifyPayload> {
  const code = normalizeQrCodeInput(rawCode);
  if (!code || !CODE_PATTERN.test(code)) {
    await logScan({
      userId: context.userId,
      result: 'invalid',
      userAgent: context.userAgent,
      approximateLat: context.approximateLat,
      approximateLng: context.approximateLng,
      metadata: { code: code || rawCode },
    });
    return { status: 'invalid', qrType: 'vehicle', reason: 'invalid' };
  }

  const record = await prisma.qRCode.findUnique({
    where: { code },
    include: {
      vehicle: {
        include: {
          route: true,
          transportPartner: true,
        },
      },
      partner: true,
    },
  });

  if (!record) {
    await logScan({
      userId: context.userId,
      result: 'invalid',
      userAgent: context.userAgent,
      approximateLat: context.approximateLat,
      approximateLng: context.approximateLng,
      metadata: { code },
    });
    return { status: 'invalid', qrType: 'vehicle', reason: 'invalid' };
  }

  const effectiveStatus = resolveEffectiveStatus(record);

  if (effectiveStatus === 'expired') {
    await logScan({
      qrCodeId: record.id,
      userId: context.userId,
      result: 'expired',
      userAgent: context.userAgent,
      approximateLat: context.approximateLat,
      approximateLng: context.approximateLng,
    });
    return { status: 'expired', qrType: 'vehicle', reason: 'expired' };
  }

  if (effectiveStatus === 'disabled') {
    await logScan({
      qrCodeId: record.id,
      userId: context.userId,
      result: 'disabled',
      userAgent: context.userAgent,
      approximateLat: context.approximateLat,
      approximateLng: context.approximateLng,
    });
    return { status: 'disabled', qrType: 'vehicle', reason: 'disabled' };
  }

  const vehicle = record.vehicle;
  if (!vehicle) {
    await logScan({
      qrCodeId: record.id,
      userId: context.userId,
      result: 'invalid',
      userAgent: context.userAgent,
      approximateLat: context.approximateLat,
      approximateLng: context.approximateLng,
      metadata: { reason: 'vehicle_not_found' },
    });
    return { status: 'invalid', qrType: 'vehicle', reason: 'vehicle not found' };
  }

  const now = new Date();
  await prisma.qRCode.update({
    where: { id: record.id },
    data: { lastScannedAt: now },
  });

  await logScan({
    qrCodeId: record.id,
    userId: context.userId,
    result: 'verified',
    userAgent: context.userAgent,
    approximateLat: context.approximateLat,
    approximateLng: context.approximateLng,
  });

  const route = vehicle.route;
  const partner = vehicle.transportPartner ?? record.partner;
  const routeName = route ? `${route.origin} to ${route.destination}` : null;
  const coverEligibility = await buildCoverEligibility(context.userId);

  return {
    status: 'verified',
    qrType: 'vehicle',
    qrCodeId: record.id,
    code: record.code,
    verifiedAt: now.toISOString(),
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.plateNumber,
      routeName,
      operatorName: partner?.name ?? null,
      vehicleType: 'minibus',
    },
    route: route
      ? {
          id: route.id,
          name: routeName ?? `${route.origin} → ${route.destination}`,
          originLabel: route.origin,
          destinationLabel: route.destination,
        }
      : undefined,
    partner: partner
      ? {
          id: partner.id,
          name: partner.name,
        }
      : undefined,
    coverEligibility,
  };
}

export async function disableVehicleQr(qrId: string) {
  return prisma.qRCode.update({
    where: { id: qrId },
    data: { status: 'disabled', isActive: false },
  });
}

export async function regenerateVehicleQr(vehicleId: string, createdBy?: string) {
  await prisma.qRCode.updateMany({
    where: { vehicleId, status: 'active' },
    data: { status: 'disabled', isActive: false },
  });
  return getOrCreateVehicleQr(vehicleId, createdBy);
}

export async function getOrCreateVehicleQr(vehicleId: string, createdBy?: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { transportPartner: true, qrCodes: { where: { status: 'active' }, take: 1 } },
  });
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }

  const existing = vehicle.qrCodes[0];
  if (existing) {
    return existing;
  }

  let code = generateVehicleQrCode(vehicle.plateNumber);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const collision = await prisma.qRCode.findUnique({ where: { code } });
    if (!collision) break;
    code = generateVehicleQrCode(vehicle.plateNumber);
  }

  return prisma.qRCode.create({
    data: {
      code,
      type: 'vehicle',
      targetId: vehicle.id,
      vehicleId: vehicle.id,
      partnerId: vehicle.transportPartnerId,
      status: 'active',
      isActive: true,
      createdBy: createdBy ?? null,
    },
  });
}
