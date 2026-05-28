import { useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { ChevronRight, Navigation2, Share2 } from 'lucide-react';
import LiveRouteMap from './LiveRouteMap.jsx';
import { activeTrip as fetchActiveTrip, loadToken, tripLocation } from '../api/safeApi.js';
import { deriveHomeLiveTripState, isCoverActive } from '../services/home.js';
import busStopArt from '../assets/transport/safe_and_calm_bus_stop_vignette_transparent.png';
import mapFallbackArt from '../assets/pack/backgrounds/home-map-fallback.png';

/** Default map center from seeded Lusaka route data — not a fake static map image. */
const HOME_IDLE_MAP_CENTER = [-15.395, 28.281];

function HomeMapOverlay({ title, body, ctaLabel, onCta, artSrc, ctaVariant = 'text' }) {
  return (
    <aside className="home-map-preview__empty-overlay" aria-label={title}>
      {artSrc ? (
        <img className="home-map-preview__empty-overlay-art" src={artSrc} alt="" aria-hidden="true" />
      ) : null}
      <strong>{title}</strong>
      {body ? <p>{body}</p> : null}
      {ctaLabel && onCta ? (
        <button
          type="button"
          className={
            ctaVariant === 'primary'
              ? 'home-map-preview__empty-overlay-btn home-map-preview__empty-overlay-btn--primary'
              : 'home-map-preview__empty-overlay-cta'
          }
          onClick={onCta}
        >
          {ctaLabel}
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      ) : null}
    </aside>
  );
}

function HomeMapFrame({ children, overlay, onEnableLocation, liveActions }) {
  return (
    <div className="home-map-preview home-map-preview--idle">
      <div className="home-map-preview__frame">
        {children}
        {overlay}
        {liveActions}
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

function HomeIdleMapPanel({ state, onBuyCover, onStartLiveTrip, onViewTripSummary, onEnableLocation }) {
  if (state === 'cover_expired') {
    return (
      <HomeMapFrame
        onEnableLocation={onEnableLocation}
        overlay={
          <HomeMapOverlay
            title="Cover expired"
            body="Your SAFE cover has ended."
            ctaLabel="Buy cover again"
            onCta={onBuyCover}
            artSrc={mapFallbackArt}
            ctaVariant="primary"
          />
        }
      >
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
      </HomeMapFrame>
    );
  }

  if (state === 'active_cover_ready_to_start') {
    return (
      <HomeMapFrame
        onEnableLocation={onEnableLocation}
        overlay={
          <HomeMapOverlay
            title="Cover active"
            body="Start live trip when you begin your journey."
            ctaLabel="Start live trip"
            onCta={onStartLiveTrip}
            artSrc={busStopArt}
            ctaVariant="primary"
          />
        }
      >
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
      </HomeMapFrame>
    );
  }

  if (state === 'trip_completed_cover_active') {
    return (
      <HomeMapFrame
        onEnableLocation={onEnableLocation}
        overlay={
          <HomeMapOverlay
            title="Trip completed"
            body="Your journey was tracked under this cover."
            ctaLabel="View trip summary"
            onCta={onViewTripSummary}
            artSrc={busStopArt}
            ctaVariant="primary"
          />
        }
      >
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
      </HomeMapFrame>
    );
  }

  return (
    <HomeMapFrame
      onEnableLocation={onEnableLocation}
      overlay={
        <HomeMapOverlay
          title="No active trip"
          body="Buy cover before starting your journey."
          ctaLabel="Buy cover"
          onCta={onBuyCover}
          artSrc={busStopArt}
          ctaVariant="primary"
        />
      }
    >
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
    </HomeMapFrame>
  );
}

function HomeSummaryMapPreview({
  summaryTrip,
  cover,
  liveTripState: liveTripStateProp,
  onEnableLocation,
  onBuyCover,
  onStartLiveTrip,
  onShareTrip,
  onEmergencyHelp,
  onViewTripSummary,
}) {
  const [trip, setTrip] = useState(summaryTrip?.mapTrip ?? null);
  const [loading, setLoading] = useState(Boolean(summaryTrip?.id && !summaryTrip?.mapTrip));
  const [error, setError] = useState('');

  const liveTripState =
    liveTripStateProp ?? deriveHomeLiveTripState(cover, summaryTrip);

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
    if (summaryTrip?.id && liveTripState === 'active_trip_live') {
      refreshTrip();
      return;
    }
    setTrip(null);
    setLoading(false);
  }, [summaryTrip, refreshTrip, liveTripState]);

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

  if (liveTripState !== 'active_trip_live') {
    return (
      <HomeIdleMapPanel
        state={liveTripState}
        onBuyCover={onBuyCover}
        onStartLiveTrip={onStartLiveTrip}
        onViewTripSummary={onViewTripSummary}
        onEnableLocation={onEnableLocation}
      />
    );
  }

  const lastUpdated = trip?.vehicleLocation?.updatedAt || trip?.lastUpdatedAt || summaryTrip?.lastUpdatedAt;
  const trackableCover = isCoverActive(cover) ? { trackable: true } : null;

  return (
    <div className="home-map-preview home-map-preview--live">
      <div className="home-map-preview__frame">
        {lastUpdated ? (
          <p className="home-map-preview__meta">
            Last updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
        <div className="home-map-preview__map">
          <LiveRouteMap
            trip={trip}
            activeCover={trackableCover}
            loading={loading}
            error={error}
            onRetry={refreshTrip}
            onStartTracking={onStartLiveTrip}
            onBuyCover={onBuyCover}
            compact
          />
        </div>
        <div className="home-map-preview__live-actions">
          <button type="button" className="home-map-preview__live-action" onClick={onShareTrip}>
            <Share2 size={16} aria-hidden="true" />
            Share trip
          </button>
          <button
            type="button"
            className="home-map-preview__live-action home-map-preview__live-action--muted"
            onClick={onEmergencyHelp}
          >
            Emergency help
          </button>
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
