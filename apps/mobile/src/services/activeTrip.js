import {
  activeTrip,
  endTripTracking,
  startTripTracking,
  updateTripLocation,
} from '../api/safeApi.js';

export const ACTIVE_TRIP_CACHE_KEY = 'safe_active_trip_cache';

export function readCachedActiveTrip() {
  try {
    const raw = sessionStorage.getItem(ACTIVE_TRIP_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedActiveTrip(payload) {
  try {
    if (!payload) {
      sessionStorage.removeItem(ACTIVE_TRIP_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(ACTIVE_TRIP_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export async function fetchActiveTripBundle(token) {
  const data = await activeTrip(token);
  const bundle = {
    trip: data?.trip ?? null,
    activeCover: data?.activeCover ?? null,
    cachedAt: new Date().toISOString(),
  };
  writeCachedActiveTrip(bundle);
  return bundle;
}

export async function startTracking(token, { coverId, startLocation } = {}) {
  const data = await startTripTracking(token, {
    ...(coverId ? { coverId } : {}),
    ...(startLocation ? { startLocation } : {}),
  });
  const bundle = {
    trip: data?.trip ?? null,
    activeCover: readCachedActiveTrip()?.activeCover ?? null,
    cachedAt: new Date().toISOString(),
  };
  writeCachedActiveTrip(bundle);
  return data?.trip ?? null;
}

export async function pushTripLocation(token, tripId, coords) {
  const data = await updateTripLocation(token, tripId, coords);
  const bundle = {
    trip: data?.trip ?? null,
    activeCover: readCachedActiveTrip()?.activeCover ?? null,
    cachedAt: new Date().toISOString(),
  };
  writeCachedActiveTrip(bundle);
  return data?.trip ?? null;
}

export async function stopTracking(token, tripId) {
  const data = await endTripTracking(token, tripId);
  const bundle = {
    trip: data?.trip ?? null,
    activeCover: readCachedActiveTrip()?.activeCover ?? null,
    cachedAt: new Date().toISOString(),
  };
  writeCachedActiveTrip(bundle);
  return data?.trip ?? null;
}
