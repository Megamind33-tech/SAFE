import type { Route, TripCover, TripTracking, Vehicle } from '@prisma/client';

export type LatLng = { lat: number; lng: number };

export function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

export function parsePolyline(raw: string | null | undefined): LatLng[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LatLng[];
    return Array.isArray(parsed)
      ? parsed.filter((p) => isValidCoordinate(p?.lat, p?.lng))
      : [];
  } catch {
    return [];
  }
}

export function buildPolylineFromRoute(route: Route | null): LatLng[] {
  if (!route) return [];
  const fromPolyline = parsePolyline(route.polyline);
  if (fromPolyline.length >= 2) return fromPolyline;
  if (
    route.originLat != null &&
    route.originLng != null &&
    route.destinationLat != null &&
    route.destinationLng != null &&
    isValidCoordinate(route.originLat, route.originLng) &&
    isValidCoordinate(route.destinationLat, route.destinationLng)
  ) {
    return [
      { lat: route.originLat, lng: route.originLng },
      { lat: route.destinationLat, lng: route.destinationLng },
    ];
  }
  return [];
}

type CoverWithRelations = TripCover & {
  vehicle: (Vehicle & { route: Route | null }) | null;
  route: Route | null;
  payment: { status: string } | null;
};

export function buildPolicyId(cover: TripCover) {
  const stamp = cover.startedAt ?? cover.createdAt;
  const ymd = stamp.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-${ymd}-${cover.id.slice(-4).toUpperCase()}`;
}

export function coverIsTrackable(cover: CoverWithRelations | null) {
  if (!cover) return false;
  if (cover.status !== 'active') return false;
  if (cover.endsAt <= new Date()) return false;
  if (cover.payment?.status && cover.payment.status !== 'succeeded') return false;
  return true;
}

export function serializeActiveTripPayload(
  cover: CoverWithRelations | null,
  tracking: TripTracking | null,
  options: { coverExpired?: boolean } = {}
) {
  if (!tracking) return null;

  const routeRecord = cover?.route ?? cover?.vehicle?.route ?? null;
  const routePolyline = buildPolylineFromRoute(routeRecord);
  const vehicle = cover?.vehicle ?? null;

  const startFromRoute =
    routeRecord?.originLat != null &&
    routeRecord?.originLng != null &&
    isValidCoordinate(routeRecord.originLat, routeRecord.originLng)
      ? {
          lat: routeRecord.originLat,
          lng: routeRecord.originLng,
          label: routeRecord.origin,
        }
      : routePolyline[0]
        ? { lat: routePolyline[0].lat, lng: routePolyline[0].lng, label: routeRecord?.origin }
        : null;

  const endFromRoute =
    routeRecord?.destinationLat != null &&
    routeRecord?.destinationLng != null &&
    isValidCoordinate(routeRecord.destinationLat, routeRecord.destinationLng)
      ? {
          lat: routeRecord.destinationLat,
          lng: routeRecord.destinationLng,
          label: routeRecord.destination,
        }
      : routePolyline.length > 0
        ? {
            lat: routePolyline[routePolyline.length - 1].lat,
            lng: routePolyline[routePolyline.length - 1].lng,
            label: routeRecord?.destination,
          }
        : null;

  const startLocation =
    tracking?.startLat != null &&
    tracking?.startLng != null &&
    isValidCoordinate(tracking.startLat, tracking.startLng)
      ? {
          lat: tracking.startLat,
          lng: tracking.startLng,
          label: tracking.startLabel ?? undefined,
        }
      : startFromRoute;

  const currentLocation =
    tracking?.currentLat != null &&
    tracking?.currentLng != null &&
    isValidCoordinate(tracking.currentLat, tracking.currentLng)
      ? {
          lat: tracking.currentLat,
          lng: tracking.currentLng,
          accuracyMeters: tracking.currentAccuracy ?? undefined,
          recordedAt: tracking.currentRecordedAt?.toISOString() ?? undefined,
        }
      : vehicle?.lastLat != null &&
          vehicle?.lastLng != null &&
          isValidCoordinate(vehicle.lastLat, vehicle.lastLng)
        ? {
            lat: vehicle.lastLat,
            lng: vehicle.lastLng,
            recordedAt: vehicle.locationAt?.toISOString() ?? undefined,
          }
        : null;

  const endLocation =
    tracking?.endLat != null &&
    tracking?.endLng != null &&
    isValidCoordinate(tracking.endLat, tracking.endLng)
      ? {
          lat: tracking.endLat,
          lng: tracking.endLng,
          label: tracking.endLabel ?? undefined,
        }
      : endFromRoute;

  let status: 'active' | 'ended' | 'pending' = 'pending';
  if (tracking?.status === 'ended' || options.coverExpired) {
    status = 'ended';
  } else if (tracking?.status === 'active') {
    status = 'active';
  } else if (tracking?.status === 'pending') {
    status = 'pending';
  }

  const lastUpdatedAt =
    tracking?.lastUpdatedAt?.toISOString() ??
    tracking?.currentRecordedAt?.toISOString() ??
    vehicle?.locationAt?.toISOString() ??
    undefined;

  return {
    id: tracking?.id ?? cover?.id ?? '',
    coverId: cover?.id ?? tracking?.tripCoverId ?? '',
    policyId: cover ? buildPolicyId(cover) : undefined,
    status,
    coverExpired: Boolean(options.coverExpired),
    startedAt: (tracking?.startedAt ?? cover?.startedAt)?.toISOString() ?? new Date().toISOString(),
    endedAt: tracking?.endedAt?.toISOString(),
    startLocation,
    currentLocation,
    endLocation,
    routePolyline: routePolyline.length >= 2 ? routePolyline : undefined,
    vehicle: vehicle
      ? {
          plateNumber: vehicle.plateNumber,
          routeName: routeRecord
            ? `${routeRecord.origin} → ${routeRecord.destination}`
            : undefined,
          operatorName: undefined,
        }
      : undefined,
    lastUpdatedAt,
    expiresAt: cover?.endsAt?.toISOString(),
  };
}
