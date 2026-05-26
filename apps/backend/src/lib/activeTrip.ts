import type { DriverProfile, Route, TripCover, TripTracking, Vehicle } from '@prisma/client';
import {
  buildPolylineFromRoute,
  serializeActiveTripPayload,
  type LatLng,
} from './tripTracking.js';

export type { LatLng };

type CoverWithRelations = TripCover & {
  vehicle: (Vehicle & { driver: DriverProfile | null; route: Route | null }) | null;
  route: Route | null;
  payment: { status: string } | null;
  tripTracking?: TripTracking | null;
};

/** @deprecated Legacy trip shape for older clients — prefer serializeActiveTripPayload */
export function serializeActiveTrip(cover: CoverWithRelations | null) {
  const trip = serializeActiveTripPayload(cover, cover?.tripTracking ?? null);
  if (!trip) return null;

  const routeRecord = cover?.route ?? cover?.vehicle?.route ?? null;
  const polyline = trip.routePolyline ?? buildPolylineFromRoute(routeRecord);

  return {
    tripId: trip.id || trip.coverId,
    coverId: trip.coverId,
    status: cover?.status ?? 'active',
    coverStatus: cover?.status === 'active' ? 'valid' : cover?.status,
    plan: cover?.plan,
    vehicle: trip.vehicle
      ? {
          id: cover?.vehicle?.id,
          plateNumber: trip.vehicle.plateNumber,
          type: 'minibus',
        }
      : null,
    driver: cover?.vehicle?.driver
      ? {
          name: cover.vehicle.driver.fullName ?? 'Verified Driver',
          verified: Boolean(cover.vehicle.driver.licenseNumber),
        }
      : cover?.vehicle
        ? { name: 'Verified Driver', verified: true }
        : null,
    route: routeRecord
      ? {
          from: routeRecord.origin,
          to: routeRecord.destination,
          start: trip.startLocation ? { lat: trip.startLocation.lat, lng: trip.startLocation.lng } : null,
          destination: trip.endLocation
            ? { lat: trip.endLocation.lat, lng: trip.endLocation.lng }
            : null,
          polyline,
        }
      : null,
    vehicleLocation: trip.currentLocation
      ? {
          lat: trip.currentLocation.lat,
          lng: trip.currentLocation.lng,
          heading: null,
          updatedAt: trip.currentLocation.recordedAt ?? trip.lastUpdatedAt ?? null,
        }
      : null,
    startedAt: trip.startedAt,
    expiresAt: trip.expiresAt,
  };
}

export { serializeActiveTripPayload, coverIsTrackable, isValidCoordinate } from './tripTracking.js';
