import { useCallback, useEffect, useMemo, useState } from 'react';
import { activeTrip, tripLocation } from '../api/safeApi.js';
import { loadToken } from '../api/safeApi.js';

const POLL_MS = 12000;

export function useActiveTrip() {
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const token = loadToken();
    if (!token) {
      setTrip(null);
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await activeTrip(token);
      setTrip(data?.trip ?? null);
    } catch (e) {
      setError(e?.message || 'Unable to load live route');
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const token = loadToken();
    if (!token || !trip?.tripId) return undefined;
    const id = setInterval(async () => {
      try {
        const loc = await tripLocation(token, trip.tripId);
        if (loc?.location) {
          setTrip((prev) => (prev ? { ...prev, vehicleLocation: loc.location } : prev));
        }
      } catch {
        /* keep last known location */
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [trip?.tripId]);

  return { trip, loading, error, refresh };
}

export function formatPlanLabel(plan) {
  if (!plan) return 'Pending';
  if (plan === 'basic') return 'Basic';
  if (plan === 'plus') return 'Plus';
  return plan;
}

export function formatDriverLabel(driver) {
  if (!driver) return 'Awaiting trip';
  if (driver.verified) return driver.name || 'Verified';
  return driver.name || 'Not assigned';
}

export function formatVehicleLabel(vehicle) {
  return vehicle?.plateNumber || 'Not assigned';
}

export function formatStartedAt(iso) {
  if (!iso) return 'Pending';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function coverDurationMins(startedAt, expiresAt) {
  if (!startedAt || !expiresAt) return null;
  return Math.max(1, Math.round((new Date(expiresAt) - new Date(startedAt)) / 60000));
}
