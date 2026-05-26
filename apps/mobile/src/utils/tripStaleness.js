const FIVE_MIN_MS = 5 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;

export function tripRecordedAt(trip) {
  const iso = trip?.currentLocation?.recordedAt ?? trip?.lastUpdatedAt;
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function tripStaleness(trip) {
  const at = tripRecordedAt(trip);
  if (!at) return { level: 'unknown', label: null, isLive: false };
  const ageMs = Date.now() - at.getTime();
  if (ageMs > THIRTY_MIN_MS) {
    return { level: 'stale', label: 'Last known location', isLive: false };
  }
  if (ageMs > FIVE_MIN_MS) {
    const mins = Math.round(ageMs / 60000);
    return {
      level: 'outdated',
      label: `Location may be outdated • Last updated ${mins} min ago`,
      isLive: false,
    };
  }
  const mins = Math.max(1, Math.round(ageMs / 60000));
  if (ageMs < 90_000) {
    return { level: 'fresh', label: 'Updated just now', isLive: true };
  }
  return {
    level: 'fresh',
    label: `Last updated ${mins} min ago`,
    isLive: ageMs < FIVE_MIN_MS,
  };
}

export function formatLastUpdated(iso) {
  const at = iso ? new Date(iso) : null;
  if (!at || Number.isNaN(at.getTime())) return null;
  const ageMs = Date.now() - at.getTime();
  if (ageMs < 60_000) return 'Updated just now';
  const mins = Math.round(ageMs / 60000);
  if (mins < 60) return `Last updated ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `Last updated ${hrs}h ago`;
}
