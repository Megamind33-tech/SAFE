import type { TripTracking } from '@prisma/client';
import { prisma } from './prisma.js';
import { env } from './env.js';
import { CLAIMS_UPLOAD_ENABLED } from './claims.js';
import { maskPhoneNumber } from './paymentMethods.js';
import { serializeActiveTripPayload } from './tripTracking.js';

export const STALE_LOCATION_MS = 5 * 60 * 1000;

export function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function isLocationStale(recordedAt: Date | null | undefined) {
  if (!recordedAt) return true;
  return Date.now() - recordedAt.getTime() > STALE_LOCATION_MS;
}

export function qrEffectiveStatus(qr: {
  status: string;
  isActive: boolean;
  expiresAt: Date | null;
}) {
  if (qr.status === 'disabled' || !qr.isActive) return 'disabled';
  if (qr.expiresAt && qr.expiresAt <= new Date()) return 'expired';
  if (qr.status === 'active') return 'active';
  return qr.status;
}

export function tripLocationRecordedAt(tracking: TripTracking) {
  return tracking.currentRecordedAt ?? tracking.lastUpdatedAt ?? tracking.startedAt;
}

export function classifyTripBucket(
  tracking: TripTracking,
  coverExpired: boolean,
): 'active' | 'stale' | 'ended' {
  if (tracking.status === 'ended' || coverExpired) return 'ended';
  if (tracking.status !== 'active') return 'ended';
  const recordedAt = tripLocationRecordedAt(tracking);
  if (isLocationStale(recordedAt)) return 'stale';
  return 'active';
}

export async function loadDashboardMetrics() {
  const now = new Date();
  const todayStart = startOfTodayUtc();

  const [
    registeredPassengers,
    activeCovers,
    coversSoldToday,
    pendingPayments,
    failedPayments,
    activeClaims,
    claimsNeedingAction,
    openSupport,
    vehiclesWithQr,
    recentScans,
    activeTrips,
    fraudFlags,
    purchases,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'passenger' } }),
    prisma.tripCover.count({
      where: { status: 'active', endsAt: { gt: now }, payment: { status: 'succeeded' } },
    }),
    prisma.tripCover.count({
      where: {
        createdAt: { gte: todayStart },
        payment: { status: 'succeeded' },
      },
    }),
    prisma.payment.count({ where: { status: 'pending' } }),
    prisma.payment.count({ where: { status: 'failed' } }),
    prisma.claim.count({
      where: { status: { in: ['submitted', 'under_review', 'needs_action', 'approved'] } },
    }),
    prisma.claim.count({ where: { status: { in: ['submitted', 'needs_action'] } } }),
    prisma.supportReport.count({ where: { status: { in: ['submitted', 'open', 'in_progress'] } } }),
    prisma.vehicle.count({
      where: {
        isSuspended: false,
        qrCodes: { some: { status: 'active', isActive: true } },
      },
    }),
    prisma.qrScanLog.count({ where: { scannedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    prisma.tripTracking.count({ where: { status: 'active' } }),
    prisma.fraudFlag.count(),
    prisma.tripCover.count({ where: { payment: { status: 'succeeded' } } }),
  ]);

  return {
    registeredPassengers,
    activeCovers,
    coversSoldToday,
    pendingPayments,
    failedPayments,
    activeClaims,
    claimsNeedingAction,
    openSupport,
    vehiclesWithQr,
    recentScans,
    activeTrips,
    fraudFlags,
    purchases,
    scans: await prisma.qrScanLog.count(),
    users: await prisma.user.count(),
    claimsPending: await prisma.claim.count({
      where: { status: { in: ['submitted', 'under_review', 'needs_action'] } },
    }),
    paymentGatewayEnabled: env.paymentGatewayEnabled,
    claimsUploadEnabled: CLAIMS_UPLOAD_ENABLED,
  };
}

export async function loadOverviewPanels() {
  const now = new Date();

  const [recentActivity, claimsNeedingAction, paymentIssues, qrActivity] = await Promise.all([
    loadRecentActivity(),
    prisma.claim.findMany({
      where: { status: { in: ['submitted', 'needs_action'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        passengerUser: { include: { passengerProfile: true } },
        tripCover: { include: { vehicle: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: { in: ['pending', 'failed'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        tripCover: {
          include: {
            passengerUser: { include: { passengerProfile: true } },
            vehicle: true,
          },
        },
      },
    }),
    prisma.qrScanLog.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 10,
      include: {
        qrCode: {
          include: { vehicle: { select: { id: true, plateNumber: true } } },
        },
      },
    }),
  ]);

  return {
    recentActivity,
    claimsNeedingAction: claimsNeedingAction.map((c) => ({
      id: c.id,
      reference: c.reference,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      passenger: {
        id: c.passengerUserId,
        fullName: c.passengerUser.passengerProfile?.fullName ?? null,
        phone: c.passengerUser.phone ? maskPhoneNumber(c.passengerUser.phone) : null,
      },
      vehiclePlate: c.tripCover.vehicle?.plateNumber ?? null,
    })),
    paymentIssues: paymentIssues.map((p) => ({
      id: p.id,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      reference: p.reference,
      createdAt: p.createdAt.toISOString(),
      coverId: p.tripCoverId,
      passenger: {
        id: p.tripCover.passengerUser.id,
        fullName: p.tripCover.passengerUser.passengerProfile?.fullName ?? null,
        phone: p.tripCover.passengerUser.phone
          ? maskPhoneNumber(p.tripCover.passengerUser.phone)
          : null,
      },
      vehiclePlate: p.tripCover.vehicle?.plateNumber ?? null,
    })),
    qrActivity: qrActivity.map((log) => ({
      id: log.id,
      result: log.result,
      scannedAt: log.scannedAt.toISOString(),
      vehicleId: log.qrCode?.vehicle?.id ?? null,
      vehiclePlate: log.qrCode?.vehicle?.plateNumber ?? null,
      qrCode: log.qrCode?.code ?? null,
    })),
    generatedAt: now.toISOString(),
  };
}

async function loadRecentActivity() {
  const [covers, claims, payments, scans] = await Promise.all([
    prisma.tripCover.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        payment: true,
        passengerUser: { include: { passengerProfile: true } },
        vehicle: true,
      },
    }),
    prisma.claim.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { passengerUser: { include: { passengerProfile: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { tripCover: { include: { passengerUser: { include: { passengerProfile: true } } } } },
    }),
    prisma.qrScanLog.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 5,
      include: { qrCode: { include: { vehicle: true } } },
    }),
  ]);

  type ActivityItem = {
    id: string;
    type: 'cover' | 'claim' | 'payment' | 'scan';
    title: string;
    detail: string;
    at: string;
    href: string;
  };

  const items: ActivityItem[] = [];

  for (const c of covers) {
    items.push({
      id: `cover-${c.id}`,
      type: 'cover',
      title: 'Cover purchased',
      detail: `${c.passengerUser.passengerProfile?.fullName ?? 'Passenger'} · ${c.vehicle?.plateNumber ?? 'No vehicle'} · ${c.payment?.status ?? 'no payment'}`,
      at: c.createdAt.toISOString(),
      href: `/covers?status=${c.payment?.status === 'succeeded' && c.endsAt > new Date() ? 'active' : c.payment?.status === 'pending' ? 'pending' : 'all'}`,
    });
  }
  for (const c of claims) {
    items.push({
      id: `claim-${c.id}`,
      type: 'claim',
      title: 'Claim submitted',
      detail: `${c.reference} · ${c.status}`,
      at: c.createdAt.toISOString(),
      href: `/claims?status=${c.status}`,
    });
  }
  for (const p of payments) {
    items.push({
      id: `payment-${p.id}`,
      type: 'payment',
      title: `Payment ${p.status}`,
      detail: `K${p.amount} · ${p.method}`,
      at: p.createdAt.toISOString(),
      href: `/payments?status=${p.status}`,
    });
  }
  for (const s of scans) {
    items.push({
      id: `scan-${s.id}`,
      type: 'scan',
      title: 'QR scan',
      detail: `${s.result} · ${s.qrCode?.vehicle?.plateNumber ?? 'Unknown vehicle'}`,
      at: s.scannedAt.toISOString(),
      href: '/qr-scans',
    });
  }

  return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 12);
}

export async function serializeDashboardTripRow(
  tracking: TripTracking & {
    tripCover: Parameters<typeof serializeActiveTripPayload>[0] & {
      passengerUser: { id: string; phone: string | null; passengerProfile: { fullName: string | null } | null };
      payment: { status: string } | null;
      vehicle: { plateNumber: string } | null;
    };
  },
) {
  const coverExpired = tracking.tripCover.endsAt <= new Date();
  const bucket = classifyTripBucket(tracking, coverExpired);
  const payload = serializeActiveTripPayload(tracking.tripCover, tracking, { coverExpired });
  const recordedAt = tripLocationRecordedAt(tracking);
  const stale = bucket === 'stale';

  return {
    id: tracking.id,
    coverId: tracking.tripCoverId,
    policyId: payload?.policyId ?? null,
    bucket,
    trackingStatus: tracking.status,
    displayStatus: bucket === 'ended' ? 'ended' : stale ? 'stale' : bucket === 'active' ? 'live' : 'pending',
    isLive: bucket === 'active',
    isStale: stale,
    startedAt: tracking.startedAt?.toISOString() ?? null,
    endedAt: tracking.endedAt?.toISOString() ?? null,
    lastLocationAt: recordedAt?.toISOString() ?? null,
    passenger: {
      id: tracking.tripCover.passengerUser.id,
      fullName: tracking.tripCover.passengerUser.passengerProfile?.fullName ?? null,
      phone: tracking.tripCover.passengerUser.phone
        ? maskPhoneNumber(tracking.tripCover.passengerUser.phone)
        : null,
    },
    vehiclePlate: tracking.tripCover.vehicle?.plateNumber ?? payload?.vehicle?.plateNumber ?? null,
    coverStatus: tracking.tripCover.status,
    paymentStatus: tracking.tripCover.payment?.status ?? null,
    currentLocation: payload?.currentLocation ?? null,
    routePolyline: payload?.routePolyline,
    expiresAt: tracking.tripCover.endsAt.toISOString(),
  };
}

export function buildReadinessReport() {
  const jwtDefault = env.jwtSecret === 'dev-secret-change-me';
  const corsConfigured = (process.env.CORS_ORIGINS ?? '').trim().length > 0;
  const qrUrlConfigured = Boolean(process.env.SAFE_QR_PUBLIC_BASE_URL?.trim());
  const claimsUploadWithoutStorage =
    CLAIMS_UPLOAD_ENABLED && !process.env.SAFE_CLAIMS_STORAGE_BUCKET?.trim();

  const warnings: Array<{ id: string; severity: 'critical' | 'warning' | 'info'; message: string }> = [];

  if (jwtDefault && env.isProduction) {
    warnings.push({
      id: 'jwt-default',
      severity: 'critical',
      message: 'JWT_SECRET is still the development default in production.',
    });
  } else if (jwtDefault && env.appEnv !== 'local') {
    warnings.push({
      id: 'jwt-default',
      severity: 'warning',
      message: 'JWT_SECRET is still the development default. Rotate before pilot launch.',
    });
  }

  if (env.paymentSimulateSuccess && !env.isProduction) {
    warnings.push({
      id: 'payment-simulate',
      severity: 'warning',
      message: 'SAFE_PAYMENT_SIMULATE_SUCCESS is enabled — payments may succeed without a real gateway.',
    });
  }

  if (!env.paymentGatewayEnabled) {
    warnings.push({
      id: 'payment-gateway',
      severity: env.isProduction ? 'critical' : 'warning',
      message: 'Payment gateway is disabled. Covers require simulate mode or manual reconciliation.',
    });
  }

  if (!qrUrlConfigured) {
    warnings.push({
      id: 'qr-base-url',
      severity: 'warning',
      message: 'SAFE_QR_PUBLIC_BASE_URL is not set — QR links use the default https://safe.co.zm.',
    });
  }

  warnings.push({
    id: 'qr-rewrite',
    severity: 'info',
    message: 'Verify /q/* SPA rewrite on production host — not automatically detectable from backend.',
  });

  if (claimsUploadWithoutStorage) {
    warnings.push({
      id: 'claims-storage',
      severity: 'critical',
      message: 'Claims upload is enabled but SAFE_CLAIMS_STORAGE_BUCKET is not configured.',
    });
  }

  if (!corsConfigured && env.isProduction) {
    warnings.push({
      id: 'cors',
      severity: 'warning',
      message: 'CORS_ORIGINS is empty — using localhost defaults only.',
    });
  }

  if (env.allowDevVehicleAutoCreate && !env.isProduction) {
    warnings.push({
      id: 'dev-vehicle-autocreate',
      severity: 'info',
      message: 'Dev vehicle auto-create is enabled for QR verify.',
    });
  }

  return {
    appEnv: env.appEnv,
    isProduction: env.isProduction,
    databaseType: 'sqlite',
    supportPhoneConfigured: Boolean(env.supportPhone),
    supportEmailConfigured: Boolean(env.supportEmail),
    legalUrls: {
      terms: Boolean(env.termsUrl),
      privacy: Boolean(env.privacyUrl),
      claimsPolicy: Boolean(env.claimsPolicyUrl),
    },
    qrPublicBaseUrl: env.qrPublicBaseUrl,
    qrPublicBaseUrlConfigured: qrUrlConfigured,
    paymentGatewayEnabled: env.paymentGatewayEnabled,
    paymentSimulateSuccess: env.paymentSimulateSuccess,
    cardPaymentsEnabled: env.cardPaymentsEnabled,
    claimsUploadEnabled: CLAIMS_UPLOAD_ENABLED,
    notificationSmsEnabled: env.notificationSmsEnabled,
    notificationEmailEnabled: env.notificationEmailEnabled,
    dataExportEnabled: env.dataExportEnabled,
    accountDeletionEnabled: env.accountDeletionEnabled,
    defaultAdminCredentialsLikely: env.appEnv === 'local',
    warnings,
  };
}
