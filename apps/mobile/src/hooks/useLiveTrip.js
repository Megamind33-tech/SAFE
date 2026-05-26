import { useCallback, useEffect, useRef, useState } from 'react';
import { loadToken } from '../api/safeApi.js';
import {
  fetchActiveTripBundle,
  pushTripLocation,
  readCachedActiveTrip,
  startTracking,
  stopTracking,
  writeCachedActiveTrip,
} from '../services/activeTrip.js';

const REFRESH_MS = 20000;
const LOCATION_MIN_INTERVAL_MS = 15000;
const LOCATION_MIN_DISTANCE_M = 40;

function distanceMeters(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useLiveTrip({ trackLocation = false } = {}) {
  const cached = readCachedActiveTrip();
  const [trip, setTrip] = useState(cached?.trip ?? null);
  const [activeCover, setActiveCover] = useState(cached?.activeCover ?? null);
  const [loading, setLoading] = useState(() => !cached?.trip);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [locationState, setLocationState] = useState('unknown');
  const [mapTileError, setMapTileError] = useState(false);

  const lastSentRef = useRef({ at: 0, lat: null, lng: null });
  const watchIdRef = useRef(null);


  useEffect(() => {
    if (!trackLocation || typeof navigator === 'undefined') return undefined;
    if (locationState !== 'unknown') return undefined;

    let cancelled = false;
    const apply = (state) => {
      if (!cancelled) setLocationState(state);
    };

    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') apply('granted');
          else if (result.state === 'denied') apply('denied');
          else apply('prompt');
        })
        .catch(() => {
          navigator.geolocation.getCurrentPosition(
            () => apply('granted'),
            (err) => apply(err?.code === 1 ? 'denied' : 'prompt'),
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
          );
        });
    } else {
      navigator.geolocation.getCurrentPosition(
        () => apply('granted'),
        (err) => apply(err?.code === 1 ? 'denied' : 'prompt'),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [trackLocation, locationState]);

  const refresh = useCallback(async () => {
    const token = loadToken();
    if (!token) {
      setTrip(null);
      setActiveCover(null);
      setLoading(false);
      writeCachedActiveTrip(null);
      return;
    }

    const hadCache = Boolean(readCachedActiveTrip()?.trip);
    if (!hadCache) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const bundle = await fetchActiveTripBundle(token);
      setTrip(bundle.trip);
      setActiveCover(bundle.activeCover);
      setLoadError('');
      setSyncWarning('');
    } catch {
      const cache = readCachedActiveTrip();
      if (cache?.trip) {
        setTrip(cache.trip);
        setActiveCover(cache.activeCover ?? null);
        setSyncWarning('Could not refresh live trip. Showing last saved trip location.');
        setLoadError('');
      } else {
        setLoadError('Couldn’t load live trip');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const requestLocationPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState('unsupported');
      return false;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationState('granted');
          resolve(true);
        },
        (err) => {
          setLocationState(err.code === 1 ? 'denied' : 'prompt');
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
      );
    });
  }, []);

  const startTrip = useCallback(
    async (startLocation) => {
      const token = loadToken();
      if (!token) return null;
      try {
        const started = await startTracking(token, {
          coverId: activeCover?.id,
          startLocation,
        });
        setTrip(started);
        setLoadError('');
        return started;
      } catch (e) {
        setLoadError(e?.message || 'Could not start trip tracking');
        return null;
      }
    },
    [activeCover?.id]
  );

  const endTrip = useCallback(async () => {
    const token = loadToken();
    if (!token || !trip?.id) return null;
    try {
      const ended = await stopTracking(token, trip.id);
      setTrip(ended);
      return ended;
    } catch (e) {
      setLoadError(e?.message || 'Could not end trip');
      return null;
    }
  }, [trip?.id]);

  useEffect(() => {
    if (!trackLocation || trip?.status !== 'active' || trip?.coverExpired) {
      if (watchIdRef.current != null && navigator?.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return undefined;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationState('unsupported');
      return undefined;
    }

    if (locationState !== 'granted') {
      return undefined;
    }

    const sendPosition = async (pos) => {
      const token = loadToken();
      if (!token || !trip?.id) return;
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const now = Date.now();
      const last = lastSentRef.current;
      const moved =
        last.lat == null ? Infinity : distanceMeters({ lat: last.lat, lng: last.lng }, { lat, lng });
      if (now - last.at < LOCATION_MIN_INTERVAL_MS && moved < LOCATION_MIN_DISTANCE_M) return;

      try {
        const updated = await pushTripLocation(token, trip.id, {
          lat,
          lng,
          accuracyMeters: pos.coords.accuracy,
          recordedAt: new Date(pos.timestamp).toISOString(),
        });
        if (updated) setTrip(updated);
        lastSentRef.current = { at: now, lat, lng };
      } catch {
        /* keep last known */
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLocationState('granted');
        sendPosition(pos);
      },
      (err) => {
        setLocationState(err.code === 1 ? 'denied' : 'prompt');
      },
      { enableHighAccuracy: false, maximumAge: 30000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [trackLocation, trip?.id, trip?.status, trip?.coverExpired, locationState]);

  return {
    trip,
    activeCover,
    loading,
    loadError,
    syncWarning,
    locationState,
    setLocationState,
    mapTileError,
    setMapTileError,
    refresh,
    requestLocationPermission,
    startTrip,
    endTrip,
  };
}
