import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { requestLocationPermission } from '../utils/firstRunPermissions.js';
import {
  LUSAKA_CENTER,
  OPERATIONAL_REFRESH_MS,
  buildOperationalMapSnapshot,
} from '../services/operationalMap.js';

function normalizePermissionState(value) {
  if (value === 'granted' || value === 'denied' || value === 'prompt' || value === 'unsupported') {
    return value;
  }
  return 'unknown';
}

async function readGeolocationPermission() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  if (!navigator.permissions?.query) {
    return 'prompt';
  }
  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return normalizePermissionState(result?.state);
  } catch {
    return 'prompt';
  }
}

export function useOperationalMap() {
  const [permissionState, setPermissionState] = useState('unknown');
  const [userLocation, setUserLocation] = useState(null);
  const [tick, setTick] = useState(0);
  const watchIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    readGeolocationPermission().then((state) => {
      if (!cancelled) setPermissionState(state);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return undefined;
    }
    if (permissionState !== 'granted') {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return undefined;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          heading: position.coords.heading ?? null,
          recordedAt: new Date(position.timestamp).toISOString(),
        });
      },
      (error) => {
        setPermissionState(error?.code === 1 ? 'denied' : 'prompt');
      },
      {
        enableHighAccuracy: false,
        maximumAge: 20000,
        timeout: 15000,
      },
    );

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [permissionState]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1);
    }, OPERATIONAL_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const requestAccess = useCallback(async () => {
    const result = await requestLocationPermission();
    setPermissionState(result);
    if (result === 'granted' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyMeters: position.coords.accuracy,
            heading: position.coords.heading ?? null,
            recordedAt: new Date(position.timestamp).toISOString(),
          });
        },
        () => {},
        {
          enableHighAccuracy: false,
          maximumAge: 20000,
          timeout: 15000,
        },
      );
    }
    return result;
  }, []);

  const snapshot = useMemo(
    () => buildOperationalMapSnapshot(tick, userLocation),
    [tick, userLocation],
  );

  return {
    permissionState,
    requestAccess,
    userLocation,
    mapCenter: userLocation ? [userLocation.lat, userLocation.lng] : LUSAKA_CENTER,
    updatedAt: snapshot.updatedAt,
    routes: snapshot.routes,
    stations: snapshot.stations,
    vehicles: snapshot.vehicles,
    tick,
  };
}
