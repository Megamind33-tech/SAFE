import { useCallback, useEffect, useState } from 'react';
import { MapPin, Navigation2 } from 'lucide-react';
import LiveRouteMap from './LiveRouteMap.jsx';
import { activeTrip as fetchActiveTrip, loadToken, tripLocation } from '../api/safeApi.js';

function HomeSummaryMapPreview({ summaryTrip, onEnableLocation }) {
  const [trip, setTrip] = useState(summaryTrip?.mapTrip ?? null);
  const [loading, setLoading] = useState(Boolean(summaryTrip?.id && !summaryTrip?.mapTrip));
  const [error, setError] = useState('');
  const [locationNeeded, setLocationNeeded] = useState(false);
  const [trackingUnavailable, setTrackingUnavailable] = useState(false);

  const refreshTrip = useCallback(async () => {
    const token = loadToken();
    if (!token) {
      setTrip(null);
      setLoading(false);
      return;
    }
    try {
      setError('');
      const data = await fetchActiveTrip(token);
      setTrip(data?.trip ?? null);
      setTrackingUnavailable(false);
    } catch (e) {
      setError(e?.message || 'Unable to load trip');
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (summaryTrip?.mapTrip) {
      setTrip(summaryTrip.mapTrip);
      setLoading(false);
      return;
    }
    if (summaryTrip?.id) {
      refreshTrip();
      return;
    }
    setTrip(null);
    setLoading(false);
  }, [summaryTrip, refreshTrip]);

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
        /* keep last known */
      }
    }, 12000);
    return () => clearInterval(id);
  }, [trip?.tripId]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions) return undefined;
    navigator.permissions
      .query({ name: 'geolocation' })
      .then((result) => {
        if (result.state === 'denied') setLocationNeeded(true);
      })
      .catch(() => {});
    return undefined;
  }, []);

  const hasMapData =
    trip &&
    (trip.route?.polyline?.length >= 2 ||
      (trip.route?.start && trip.route?.destination) ||
      trip.vehicleLocation);

  if (!summaryTrip?.id && !trip) {
    return (
      <div className="home-map-preview home-map-preview--empty">
        <Navigation2 size={24} aria-hidden="true" />
        <strong>No active trip</strong>
        <p>Start cover when you begin your journey.</p>
      </div>
    );
  }

  if (trackingUnavailable && !trip) {
    return (
      <div className="home-map-preview home-map-preview--empty">
        <MapPin size={24} aria-hidden="true" />
        <p>Live trip map will appear when trip tracking is connected.</p>
      </div>
    );
  }

  if (locationNeeded && !hasMapData) {
    return (
      <div className="home-map-preview home-map-preview--empty">
        <MapPin size={24} aria-hidden="true" />
        <p>Location needed for live trip view.</p>
        <button type="button" className="home-btn home-btn--secondary" onClick={onEnableLocation}>
          Enable location
        </button>
      </div>
    );
  }

  if (!hasMapData && !loading && trip) {
    return (
      <div className="home-map-preview home-map-preview--empty">
        <Navigation2 size={24} aria-hidden="true" />
        <strong>Awaiting route</strong>
        <p>Live trip map will appear when trip tracking is connected.</p>
      </div>
    );
  }

  if (!hasMapData && !loading) {
    return (
      <div className="home-map-preview home-map-preview--empty">
        <Navigation2 size={24} aria-hidden="true" />
        <strong>No active trip</strong>
        <p>Start cover when you begin your journey.</p>
      </div>
    );
  }

  const lastUpdated = trip?.vehicleLocation?.updatedAt || summaryTrip?.lastUpdatedAt;

  return (
    <div className="home-map-preview home-map-preview--live">
      {lastUpdated ? (
        <p className="home-map-preview__meta">
          Last updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : null}
      <div className="home-map-preview__map">
        <LiveRouteMap trip={trip} loading={loading} error={error} onRetry={refreshTrip} />
      </div>
    </div>
  );
}


function HomeMapLiveRoutePreview({
  trip,
  activeCover,
  loading,
  loadError,
  syncWarning,
  locationState,
  mapTileError,
  onRetry,
  onEnableLocation,
  onOpenSettings,
  onStartTracking,
  onBuyCover,
  onMapTileError,
  compact = true,
  requireDeviceLocation = false,
}) {
  return (
    <section className="home-map-preview" aria-label="Live trip map">
      <LiveRouteMap
        trip={trip}
        activeCover={activeCover}
        loading={loading}
        error={loadError}
        syncWarning={syncWarning}
        locationState={locationState}
        mapTileError={mapTileError}
        onRetry={onRetry}
        onEnableLocation={onEnableLocation}
        onOpenSettings={onOpenSettings}
        onStartTracking={onStartTracking}
        onBuyCover={onBuyCover}
        onMapTileError={onMapTileError}
        compact={compact}
        requireDeviceLocation={requireDeviceLocation}
      />
    </section>
  );
}

/** Home command center (`summaryTrip`) and Live Trip / View Policy (`trip`) share one entry point. */
export default function HomeMapPreview(props) {
  if ('summaryTrip' in props) {
    return <HomeSummaryMapPreview {...props} />;
  }
  return <HomeMapLiveRoutePreview {...props} />;
}
