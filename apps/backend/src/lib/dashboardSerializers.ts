import { shortenPolicyId, formatPlanName, serializeActiveCover } from './coverPurchase.js';
import { serializeClaimDetail, serializeClaimListItem, mapLegacyClaimStatus } from './claims.js';
import { serializeQrRecord } from './qrImage.js';

export { serializeClaimDetail, serializeClaimListItem, mapLegacyClaimStatus };

export function serializeVehicleRow(vehicle: {
  id: string;
  plateNumber: string;
  busId: string | null;
  isSuspended?: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLat: number | null;
  lastLng: number | null;
  locationAt: Date | null;
  route: { id: string; origin: string; destination: string } | null;
  transportPartner?: { id: string; name: string } | null;
  driver?: { id: string; fullName: string | null } | null;
  qrCodes?: Array<{
    id: string;
    code: string;
    status: string;
    isActive: boolean;
    lastScannedAt: Date | null;
    expiresAt: Date | null;
  }>;
  _count?: { tripCovers: number; qrCodes?: number };
}) {
  const activeQr = vehicle.qrCodes?.find((q) => q.status === 'active' && q.isActive) ?? vehicle.qrCodes?.[0] ?? null;
  const qrExpired = activeQr?.expiresAt ? activeQr.expiresAt <= new Date() : false;
  const qrDisabled = !activeQr || activeQr.status === 'disabled' || !activeQr.isActive;
  let qrStatus: 'active' | 'disabled' | 'expired' | 'none' = 'none';
  if (activeQr) {
    if (qrExpired) qrStatus = 'expired';
    else if (qrDisabled) qrStatus = 'disabled';
    else qrStatus = 'active';
  }

  const fleetSuspended = Boolean(vehicle.isSuspended);
  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    busId: vehicle.busId,
    route: vehicle.route
      ? { id: vehicle.route.id, origin: vehicle.route.origin, destination: vehicle.route.destination }
      : null,
    partner: vehicle.transportPartner
      ? { id: vehicle.transportPartner.id, name: vehicle.transportPartner.name }
      : null,
    driver: vehicle.driver
      ? { id: vehicle.driver.id, fullName: vehicle.driver.fullName }
      : null,
    qr: activeQr
      ? {
          id: activeQr.id,
          code: activeQr.code,
          status: activeQr.status,
          isActive: activeQr.isActive,
          effectiveStatus: qrStatus,
          lastScannedAt: activeQr.lastScannedAt?.toISOString() ?? null,
          expiresAt: activeQr.expiresAt?.toISOString() ?? null,
        }
      : null,
    qrStatus,
    isSuspended: fleetSuspended,
    operationalStatus: fleetSuspended ? 'suspended' : qrStatus === 'active' ? 'active' : 'inactive',
    coverCount: vehicle._count?.tripCovers ?? 0,
    lastLocation:
      vehicle.lastLat != null && vehicle.lastLng != null
        ? {
            lat: vehicle.lastLat,
            lng: vehicle.lastLng,
            recordedAt: vehicle.locationAt?.toISOString() ?? null,
          }
        : null,
    locationAt: vehicle.locationAt?.toISOString() ?? null,
    createdAt: vehicle.createdAt.toISOString(),
  };
}

export function serializeCoverRow(cover: {
  id: string;
  plan: string;
  status: string;
  amount: number;
  currency: string;
  startedAt: Date;
  endsAt: Date;
  createdAt: Date;
  payment?: { id: string; status: string; method: string; amount: number; currency: string; reference: string | null; createdAt: Date } | null;
  passengerUser?: { id: string; phone: string | null; passengerProfile: { fullName: string | null } | null };
  vehicle?: { id: string; plateNumber: string; busId: string | null } | null;
  route?: { origin: string; destination: string } | null;
}) {
  const serialized = serializeActiveCover(cover as Parameters<typeof serializeActiveCover>[0]);
  return {
    id: cover.id,
    policyId: serialized?.policyId ?? shortenPolicyId(cover.id, cover.createdAt),
    planId: cover.plan,
    planName: formatPlanName(cover.plan),
    status: serialized?.status ?? cover.status,
    paymentStatus: cover.payment?.status ?? null,
    amount: cover.amount,
    currency: cover.currency,
    startsAt: cover.startedAt.toISOString(),
    endsAt: cover.endsAt.toISOString(),
    passenger: cover.passengerUser
      ? {
          id: cover.passengerUser.id,
          phone: cover.passengerUser.phone,
          fullName: cover.passengerUser.passengerProfile?.fullName ?? null,
        }
      : null,
    vehicle: cover.vehicle
      ? { id: cover.vehicle.id, plateNumber: cover.vehicle.plateNumber, busId: cover.vehicle.busId }
      : null,
    route: cover.route
      ? { origin: cover.route.origin, destination: cover.route.destination }
      : serialized?.route ?? null,
    paymentId: cover.payment?.id ?? null,
    createdAt: cover.createdAt.toISOString(),
  };
}

export function serializePaymentRow(payment: {
  id: string;
  status: string;
  method: string;
  amount: number;
  currency: string;
  reference: string | null;
  internalReference?: string | null;
  providerReference?: string | null;
  confirmedAt?: Date | null;
  reversedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  tripCover: {
    id: string;
    plan: string;
    status: string;
    activationSource?: string | null;
    passengerUser: { id: string; phone: string | null; passengerProfile: { fullName: string | null } | null };
    vehicle: { plateNumber: string } | null;
  };
}) {
  const fraudAlerts: string[] = [];
  if (payment.tripCover.status === 'active' && payment.status !== 'succeeded') {
    fraudAlerts.push('cover_active_without_confirmed_payment');
  }
  if ((payment.status === 'reversed' || payment.status === 'disputed') && payment.tripCover.status === 'active') {
    fraudAlerts.push('reversed_payment_linked_to_active_cover');
  }

  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    reference: payment.reference,
    internalReference: payment.internalReference ?? null,
    providerReference: payment.providerReference ?? null,
    confirmedAt: payment.confirmedAt?.toISOString() ?? null,
    reversedAt: payment.reversedAt?.toISOString() ?? null,
    coverId: payment.tripCover.id,
    plan: payment.tripCover.plan,
    coverStatus: payment.tripCover.status,
    activationSource: payment.tripCover.activationSource ?? null,
    fraudAlerts,
    passenger: {
      id: payment.tripCover.passengerUser.id,
      phone: payment.tripCover.passengerUser.phone,
      fullName: payment.tripCover.passengerUser.passengerProfile?.fullName ?? null,
    },
    vehiclePlate: payment.tripCover.vehicle?.plateNumber ?? null,
    createdAt: payment.createdAt.toISOString(),
    updatedAt: payment.updatedAt.toISOString(),
  };
}

export function serializePartnerRow(partner: {
  id: string;
  name: string;
  createdAt: Date;
  _count?: { vehicles: number; drivers: number; qrCodes: number };
}) {
  return {
    id: partner.id,
    name: partner.name,
    vehicleCount: partner._count?.vehicles ?? 0,
    driverCount: partner._count?.drivers ?? 0,
    qrCodeCount: partner._count?.qrCodes ?? 0,
    createdAt: partner.createdAt.toISOString(),
  };
}

export function serializeSupportReport(row: {
  id: string;
  problemType: string;
  message: string;
  status: string;
  adminNote?: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: { id: string; phone: string | null; email: string | null; passengerProfile: { fullName: string | null } | null };
}) {
  return {
    id: row.id,
    problemType: row.problemType,
    message: row.message,
    status: row.status,
    adminNote: row.adminNote ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    user: {
      id: row.user.id,
      phone: row.user.phone ? maskPhoneForDashboard(row.user.phone) : null,
      email: row.user.email,
      fullName: row.user.passengerProfile?.fullName ?? null,
    },
  };
}

function maskPhoneForDashboard(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) {
    return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
  }
  return phone;
}

export function serializeScanLog(log: {
  id: string;
  result: string;
  scannedAt: Date;
  userAgent: string | null;
  approximateLat: number | null;
  approximateLng: number | null;
  userId: string | null;
  qrCode: {
    code: string;
    vehicleId: string | null;
    vehicle?: { id: string; plateNumber: string } | null;
  } | null;
  user?: { id: string; phone: string | null; passengerProfile: { fullName: string | null } | null } | null;
}) {
  return {
    id: log.id,
    result: log.result,
    scannedAt: log.scannedAt.toISOString(),
    userAgent: log.userAgent,
    location:
      log.approximateLat != null && log.approximateLng != null
        ? { lat: log.approximateLat, lng: log.approximateLng }
        : null,
    qrCode: log.qrCode?.code ?? null,
    vehicleId: log.qrCode?.vehicleId ?? log.qrCode?.vehicle?.id ?? null,
    vehiclePlate: log.qrCode?.vehicle?.plateNumber ?? null,
    userId: log.userId,
    passenger: log.user
      ? {
          id: log.user.id,
          fullName: log.user.passengerProfile?.fullName ?? null,
          phone: log.user.phone ? maskPhoneForDashboard(log.user.phone) : null,
        }
      : null,
  };
}
