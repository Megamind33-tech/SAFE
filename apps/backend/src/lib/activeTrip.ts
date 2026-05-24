import type { DriverProfile, Route, TripCover, Vehicle } from '@prisma/client';

type CoverWithRelations = TripCover & {
  vehicle: (Vehicle & { driver: DriverProfile | null; route: Route | null }) | null;
  route: Route | null;
};

export type LatLng = { lat: number; lng: number };

function parsePolyline(raw: string | null | undefined): LatLng[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as LatLng[];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p?.lat === 'number' && typeof p?.lng === 'number') : [];
  } catch {
    return [];
  }
}

function buildPolylineFromRoute(route: Route | null): LatLng[] {
  if (!route) return [];
  const fromPolyline = parsePolyline(route.polyline);
  if (fromPolyline.length >= 2) return fromPolyline;
  if (
    route.originLat != null &&
    route.originLng != null &&
    route.destinationLat != null &&
    route.destinationLng != null
  ) {
    return [
      { lat: route.originLat, lng: route.originLng },
      { lat: route.destinationLat, lng: route.destinationLng },
    ];
  }
  return [];
}

export function serializeActiveTrip(cover: CoverWithRelations | null) {
  if (!cover) return null;

  const routeRecord = cover.route ?? cover.vehicle?.route ?? null;
  const polyline = buildPolylineFromRoute(routeRecord);
  const vehicle = cover.vehicle;

  return {
    tripId: cover.id,
    coverId: cover.id,
    status: cover.status,
    coverStatus: cover.status === 'active' ? 'valid' : cover.status,
    plan: cover.plan,
    vehicle: vehicle
      ? {
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          type: 'minibus',
        }
      : null,
    driver: vehicle?.driver
      ? {
          name: vehicle.driver.fullName ?? 'Verified Driver',
          verified: Boolean(vehicle.driver.licenseNumber),
        }
      : vehicle
        ? { name: 'Verified Driver', verified: true }
        : null,
    route: routeRecord
      ? {
          from: routeRecord.origin,
          to: routeRecord.destination,
          start:
            routeRecord.originLat != null && routeRecord.originLng != null
              ? { lat: routeRecord.originLat, lng: routeRecord.originLng }
              : polyline[0] ?? null,
          destination:
            routeRecord.destinationLat != null && routeRecord.destinationLng != null
              ? { lat: routeRecord.destinationLat, lng: routeRecord.destinationLng }
              : polyline[polyline.length - 1] ?? null,
          polyline,
        }
      : null,
    vehicleLocation:
      vehicle?.lastLat != null && vehicle?.lastLng != null
        ? {
            lat: vehicle.lastLat,
            lng: vehicle.lastLng,
            heading: vehicle.lastHeading ?? null,
            updatedAt: vehicle.locationAt?.toISOString() ?? null,
          }
        : null,
    startedAt: cover.startedAt.toISOString(),
    expiresAt: cover.endsAt.toISOString(),
  };
}
