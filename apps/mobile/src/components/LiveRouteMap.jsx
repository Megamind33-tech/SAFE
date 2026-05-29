import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapPin, Navigation2, RefreshCw } from 'lucide-react';
import mapStartIcon from '../assets/pack/icons/map-start-marker.svg';
import mapDestIcon from '../assets/pack/icons/map-destination-pin.svg';
import mapBusIcon from '../assets/pack/icons/map-bus-marker.svg';
import mapFallbackArt from '../assets/pack/backgrounds/home-map-fallback.png';
import routeFallbackArt from '../assets/real/route_map_bus_hero_clean.png';
import busStopArt from '../assets/transport/safe_and_calm_bus_stop_vignette_transparent.png';
import { tripStaleness } from '../utils/tripStaleness.js';

function svgIcon(url, size, anchor) {
  return L.icon({
    iconUrl: url,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  });
}

const startIcon = svgIcon(mapStartIcon, [28, 28], [14, 14]);
const endIcon = svgIcon(mapDestIcon, [28, 36], [14, 36]);
const vehicleIcon = svgIcon(mapBusIcon, [32, 32], [16, 16]);
const currentIcon = L.divIcon({
  className: 'live-trip-marker live-trip-marker--current',
  html: '<span aria-hidden="true"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 15 });
  }, [map, points]);
  return null;
}

function MapStatusChip({ trip }) {
  const stale = tripStaleness(trip);
  if (!trip) return null;
  if (stale.isLive) {
    return (
      <span className="live-trip-chip live-trip-chip--live">
        <i className="live-trip-chip__dot" aria-hidden="true" />
        Live
      </span>
    );
  }
  if (stale.label) {
    return <span className="live-trip-chip live-trip-chip--muted">{stale.label}</span>;
  }
  return null;
}

export default function LiveRouteMap({
  trip,
  activeCover,
  loading,
  error,
  syncWarning,
  locationState = 'unknown',
  mapTileError = false,
  onRetry,
  onEnableLocation,
  onOpenSettings,
  onStartTracking,
  onBuyCover,
  onMapTileError,
  compact = false,
  requireDeviceLocation = false,
}) {
  const polyline = trip?.routePolyline ?? [];
  const hasRoute = polyline.length >= 2;
  const current = trip?.currentLocation;
  const start = trip?.startLocation;
  const end = trip?.endLocation;
  const showVehicle =
    trip?.vehicle?.plateNumber &&
    current?.lat != null &&
    current?.lng != null;

  const mapPoints = useMemo(() => {
    const pts = [];
    if (start?.lat != null) pts.push([start.lat, start.lng]);
    polyline.forEach((p) => pts.push([p.lat, p.lng]));
    if (current?.lat != null) pts.push([current.lat, current.lng]);
    if (end?.lat != null) pts.push([end.lat, end.lng]);
    return pts;
  }, [start, current, end, polyline]);

  const linePositions = useMemo(() => {
    if (polyline.length >= 2) return polyline.map((p) => [p.lat, p.lng]);
    if (start && end) {
      return [
        [start.lat, start.lng],
        [end.lat, end.lng],
      ];
    }
    return [];
  }, [polyline, start, end]);

  const tripLive = trip?.status === 'active' || trip?.status === 'pending';
  const hasBackendPosition = Boolean(
    (current?.lat != null && current?.lng != null) || (start?.lat != null && start?.lng != null)
  );
  const deviceLocationOk = locationState === 'granted';
  const canShowMap =
    tripLive &&
    !trip?.coverExpired &&
    mapPoints.length > 0 &&
    (deviceLocationOk || (!requireDeviceLocation && hasBackendPosition)) &&
    !mapTileError;

  if (loading) {
    return (
      <div className={`live-trip-map live-trip-map--${compact ? 'compact' : 'full'}`} aria-live="polite">
        <div className="live-trip-map__skeleton" />
        <p className="live-trip-map__hint">Loading live trip…</p>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className={`live-trip-map live-trip-map--error live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={routeFallbackArt} alt="" aria-hidden="true" />
        <strong>Couldn’t load live trip</strong>
        <p>Check your connection and try again.</p>
        {onRetry ? (
          <button type="button" className="live-trip-map__btn" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!activeCover?.trackable && !trip) {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={routeFallbackArt} alt="" aria-hidden="true" />
        <strong>Buy cover to start trip tracking</strong>
        <p>Active SAFE cover is required before live trip tracking can begin.</p>
        {onBuyCover ? (
          <button type="button" className="live-trip-map__btn live-trip-map__btn--primary" onClick={onBuyCover}>
            Buy cover
          </button>
        ) : null}
      </div>
    );
  }

  if (trip?.coverExpired || (trip?.status === 'ended' && trip?.coverExpired)) {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={busStopArt} alt="" aria-hidden="true" />
        <strong>Cover expired</strong>
        <p>Trip tracking has stopped.</p>
      </div>
    );
  }

  if (!trip && activeCover?.trackable) {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={busStopArt} alt="" aria-hidden="true" />
        <strong>No active trip</strong>
        <p>Start SAFE cover when you begin your journey.</p>
        {onStartTracking ? (
          <button type="button" className="live-trip-map__btn live-trip-map__btn--primary" onClick={onStartTracking}>
            Start trip tracking
          </button>
        ) : null}
      </div>
    );
  }

  if (trip && trip.status === 'ended') {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={busStopArt} alt="" aria-hidden="true" />
        <strong>No active trip</strong>
        <p>Start SAFE cover when you begin your journey.</p>
        {activeCover?.trackable && onStartTracking ? (
          <button type="button" className="live-trip-map__btn live-trip-map__btn--primary" onClick={onStartTracking}>
            Start trip tracking
          </button>
        ) : null}
      </div>
    );
  }

  if (
    requireDeviceLocation &&
    !deviceLocationOk &&
    (locationState === 'unsupported' || locationState === 'prompt' || locationState === 'unknown')
  ) {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={mapFallbackArt} alt="" aria-hidden="true" />
        <strong>Location needed</strong>
        <p>Enable location to show your live trip position.</p>
        {onEnableLocation ? (
          <button type="button" className="live-trip-map__btn live-trip-map__btn--primary" onClick={onEnableLocation}>
            Enable location
          </button>
        ) : null}
      </div>
    );
  }

  if (requireDeviceLocation && locationState === 'denied') {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={mapFallbackArt} alt="" aria-hidden="true" />
        <strong>Location is turned off</strong>
        <p>You can still use SAFE cover, but live trip tracking will not update.</p>
        {onOpenSettings ? (
          <button type="button" className="live-trip-map__btn" onClick={onOpenSettings}>
            Open settings
          </button>
        ) : null}
      </div>
    );
  }

  if (mapTileError) {
    return (
      <div className={`live-trip-map live-trip-map--error live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={mapFallbackArt} alt="" aria-hidden="true" />
        <strong>Map unavailable</strong>
        <p>Check your connection and try again.</p>
        {onRetry ? (
          <button type="button" className="live-trip-map__btn" onClick={onRetry}>
            <RefreshCw size={16} aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </div>
    );
  }

  if (!canShowMap) {
    return (
      <div className={`live-trip-map live-trip-map--empty live-trip-map--${compact ? 'compact' : 'full'}`}>
        <img className="live-trip-map__art" src={busStopArt} alt="" aria-hidden="true" />
        <strong>No active trip</strong>
        <p>Start SAFE cover when you begin your journey.</p>
      </div>
    );
  }

  const defaultCenter = mapPoints[0] ?? [-15.395, 28.281];

  return (
    <div className={`live-trip-map live-trip-map--live live-trip-map--${compact ? 'compact' : 'full'}`}>
      {syncWarning ? (
        <p className="live-trip-map__sync" role="status">
          {syncWarning}
        </p>
      ) : null}
      <div className="live-trip-map__chips">
        <MapStatusChip trip={trip} />
        {trip?.vehicle?.routeName ? (
          <span className="live-trip-chip live-trip-chip--route">{trip.vehicle.routeName}</span>
        ) : null}
      </div>
      {!hasRoute ? (
        <p className="live-trip-map__route-hint" role="status">
          Route details are not available yet.
        </p>
      ) : null}
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="live-trip-map__canvas"
        scrollWheelZoom={false}
        attributionControl={!compact}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => onMapTileError?.() }}
        />
        {linePositions.length >= 2 ? (
          <Polyline positions={linePositions} pathOptions={{ color: '#1f8f4a', weight: 4, opacity: 0.88 }} />
        ) : null}
        {start ? <Marker position={[start.lat, start.lng]} icon={startIcon} /> : null}
        {end ? <Marker position={[end.lat, end.lng]} icon={endIcon} /> : null}
        {showVehicle ? (
          <Marker position={[current.lat, current.lng]} icon={vehicleIcon} />
        ) : current ? (
          <Marker position={[current.lat, current.lng]} icon={currentIcon} />
        ) : null}
        <FitBounds points={mapPoints} />
      </MapContainer>
    </div>
  );
}
