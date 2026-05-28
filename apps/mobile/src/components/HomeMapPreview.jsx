import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { ChevronRight, Navigation2 } from 'lucide-react';
import LiveRouteMap from './LiveRouteMap.jsx';
import { activeTrip as fetchActiveTrip, loadToken, tripLocation } from '../api/safeApi.js';
import busStopArt from '../assets/transport/safe_and_calm_bus_stop_vignette_transparent.png';

/** Default map center from seeded Lusaka route data — not a fake static map image. */
const HOME_IDLE_MAP_CENTER = [-15.395, 28.281];

function HomeNoTripOverlay({ onStartCover }) {
  return (
    <aside className="home-map-preview__empty-overlay" aria-label="No active trip">
      <img className="home-map-preview__empty-overlay-art" src={busStopArt} alt="" aria-hidden="true" />
      <strong>No active trip</strong>
      <p>Start cover when you begin your journey.</p>
      <button type="button" className="home-map-preview__empty-overlay-cta" onClick={onStartCover}>
        Start cover
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}

function HomeIdleMapPreview({ onStartCover, onEnableLocation }) {
  return (
    <div className="home-map-preview home-map-preview--idle">
      <div className="home-map-preview__frame">
        <MapContainer
          center={HOME_IDLE_MAP_CENTER}
          zoom={12}
          className="home-map-preview__canvas home-map-preview__canvas--idle"
          scrollWheelZoom={false}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        </MapContainer>

        <HomeNoTripOverlay onStartCover={onStartCover} />

        <button
          type="button"
          className="home-map-preview__loc-btn"
          aria-label="Enable location"
          onClick={onEnableLocation}
        >
          <Navigation2 size={18} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function HomeSummaryMapPreview({ summaryTrip, onEnableLocation, onStartCover }) {
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

  if (!summaryTrip?.id && !trip && !loading) {
    return <HomeIdleMapPreview onStartCover={onStartCover} onEnableLocation={onEnableLocation} />;
  }

  if (trackingUnavailable && !trip && !loading) {
    return <HomeIdleMapPreview onStartCover={onStartCover} onEnableLocation={onEnableLocation} />;
  }

  if (locationNeeded && !hasMapData && !loading) {
    return <HomeIdleMapPreview onStartCover={onStartCover} onEnableLocation={onEnableLocation} />;
  }

  if (!hasMapData && !loading) {
    return <HomeIdleMapPreview onStartCover={onStartCover} onEnableLocation={onEnableLocation} />;
  }

  const lastUpdated = trip?.vehicleLocation?.updatedAt || summaryTrip?.lastUpdatedAt;

  return (
    <div className="home-map-preview home-map-preview--live">
      <div className="home-map-preview__frame">
        {lastUpdated ? (
          <p className="home-map-preview__meta">
            Last updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
        <div className="home-map-preview__map">
          <LiveRouteMap trip={trip} loading={loading} error={error} onRetry={refreshTrip} compact />
        </div>
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
    <section className="home-map-preview home-map-preview--live" aria-label="Live trip map">
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
