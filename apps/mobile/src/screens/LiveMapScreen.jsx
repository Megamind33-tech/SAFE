import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BadgeCheck, Clock3, Expand, MapPin, Minimize2, Navigation2, Route, ShieldCheck, X } from 'lucide-react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import { useOperationalMap } from '../hooks/useOperationalMap.js';
import { toCoverVehicleContext } from '../services/qr.js';
import mapBusIcon from '../assets/pack/icons/map-bus-marker.svg';
import mapStartIcon from '../assets/pack/icons/map-start-marker.svg';
import mapUserIcon from '../assets/pack/icons/map-user-marker.svg';

function svgIcon(url, size, anchor) {
  return L.icon({
    iconUrl: url,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  });
}

const vehicleIcon = svgIcon(mapBusIcon, [32, 32], [16, 16]);
const stationIcon = svgIcon(mapStartIcon, [28, 28], [14, 14]);
const currentLocationIcon = svgIcon(mapUserIcon, [28, 28], [14, 14]);

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY?.trim() ?? '';
const encodedTomTomKey = encodeURIComponent(TOMTOM_API_KEY);
const TOMTOM_BASE_TILE_URL =
  `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${encodedTomTomKey}`;
const TOMTOM_TRAFFIC_FLOW_TILE_URL =
  `https://api.tomtom.com/traffic/map/4/tile/flow/absolute/{z}/{x}/{y}.png?key=${encodedTomTomKey}`;
const TOMTOM_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.tomtom.com/">TomTom</a>';

const FALLBACK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const FALLBACK_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function formatUpdatedAt(iso) {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Just now';
  }
}

function formatRelativeUpdated(iso) {
  if (!iso) return 'Just now';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return 'Just now';
  if (diff < 60_000) return 'Updated moments ago';
  const minutes = Math.floor(diff / 60_000);
  if (minutes === 1) return 'Updated 1 min ago';
  if (minutes < 60) return `Updated ${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

function getNearbyVehiclesForStation(station, vehicles, limit = 3) {
  return (station?.nearbyVehicles?.length ? station.nearbyVehicles : vehicles)
    .filter((vehicle) => {
      if (!station) return false;
      const deltaLat = Math.abs(vehicle.lat - station.lat);
      const deltaLng = Math.abs(vehicle.lng - station.lng);
      return deltaLat <= 0.08 && deltaLng <= 0.08;
    })
    .slice(0, limit);
}

function splitRouteLabel(routeName) {
  const raw = String(routeName || '').trim();
  if (!raw) {
    return { originLabel: 'Selected route', destinationLabel: 'SAFE route' };
  }

  const parts = raw
    .split(/→|->/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return { originLabel: parts[0], destinationLabel: parts.slice(1).join(' → ') };
  }

  return { originLabel: raw, destinationLabel: 'SAFE route' };
}

function buildLiveMapCoverContext(vehicle, routes) {
  if (!vehicle) return null;
  const route = routes.find((item) => item.routeName === vehicle.routeName) ?? null;
  const labels = splitRouteLabel(route?.routeName || vehicle.routeName);

  return toCoverVehicleContext({
    status: 'verified',
    qrCodeId: `live-map-${vehicle.id}`,
    verifiedAt: vehicle.lastUpdatedAt,
    coverEligibility: { eligible: true },
    vehicle: {
      id: vehicle.id,
      plateNumber: vehicle.registrationNumber,
    },
    route: route
      ? {
          id: route.id,
          originLabel: labels.originLabel,
          destinationLabel: labels.destinationLabel,
        }
      : null,
    partner: vehicle.operatorName ? { name: vehicle.operatorName } : null,
  });
}

function FitInitialBounds({ points }) {
  const map = useMap();
  const didFitRef = useRef(false);
  useEffect(() => {
    if (!points.length || didFitRef.current) return;
    didFitRef.current = true;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [34, 34], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
}

function FocusSelection({ selectedPoint }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedPoint) return;
    map.flyTo([selectedPoint.lat, selectedPoint.lng], 14, { animate: true, duration: 0.45 });
  }, [map, selectedPoint]);
  return null;
}

function CenterOnCurrentLocationOnce({ userLocation, selectedPoint }) {
  const map = useMap();
  const didCenterRef = useRef(false);

  useEffect(() => {
    if (!userLocation || selectedPoint || didCenterRef.current) return;
    didCenterRef.current = true;
    map.setView([userLocation.lat, userLocation.lng], 14, { animate: true });
  }, [map, selectedPoint, userLocation]);

  return null;
}

function MapViewportSync({ dependencies }) {
  const map = useMap();

  useEffect(() => {
    const refresh = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    };

    const frameId = window.requestAnimationFrame(refresh);
    window.addEventListener('resize', refresh);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', refresh);
    };
  }, [map]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* ignore */
      }
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [map, ...dependencies]);

  return null;
}

function MapFallbackNotice({ message }) {
  if (!message) return null;
  return (
    <div className="live-map-screen__map-fallback" role="status" aria-live="polite">
      <Navigation2 size={14} aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function PermissionStateCard({ permissionState, onAllowLocation }) {
  return (
    <section className="live-map-screen__permission-card" aria-label="Location permission needed">
      <div className="live-map-screen__permission-icon" aria-hidden="true">
        <ShieldCheck size={26} strokeWidth={2.1} />
      </div>
      <h2 className="live-map-screen__permission-title">Location permission needed</h2>
      <p className="live-map-screen__permission-text">
        Allow location access to show nearby SAFE vehicles, routes, and stations.
      </p>
      <button type="button" className="live-map-screen__button live-map-screen__button--primary" onClick={onAllowLocation}>
        Allow location access
      </button>
      {permissionState === 'denied' ? (
        <p className="live-map-screen__permission-note">
          If you already denied location, tap again after enabling it in device settings.
        </p>
      ) : null}
    </section>
  );
}

function MapHeaderChips({ vehicles, stations, routes, updatedAt }) {
  return (
    <div className="live-map-screen__chips">
      <span className="live-map-screen__chip">
        <BadgeCheck size={14} aria-hidden="true" />
        {vehicles.length} vehicles
      </span>
      <span className="live-map-screen__chip">
        <MapPin size={14} aria-hidden="true" />
        {stations.length} stations
      </span>
      <span className="live-map-screen__chip">
        <Route size={14} aria-hidden="true" />
        {routes.length} routes
      </span>
      <span className="live-map-screen__chip live-map-screen__chip--muted">
        <Clock3 size={14} aria-hidden="true" />
        {formatRelativeUpdated(updatedAt)}
      </span>
    </div>
  );
}

function LeafletOperationalMapSurface({
  routes,
  stations,
  vehicles,
  mapCenter,
  userLocation,
  selectedVehicle,
  selectedStation,
  focusedPoint,
  tileError,
  onTileError,
  onSelectVehicle,
  onSelectStation,
  providerLabel,
  providerTone,
  providerNotice,
  isFullscreen,
  onToggleFullscreen,
}) {
  const selectedPoint = focusedPoint;
  const initialPoints = useMemo(() => {
    const points = [];
    routes.forEach((route) => {
      route.coordinates.forEach((coord) => points.push(coord));
    });
    vehicles.forEach((vehicle) => points.push([vehicle.lat, vehicle.lng]));
    stations.forEach((station) => points.push([station.lat, station.lng]));
    if (userLocation?.lat != null && userLocation?.lng != null) {
      points.push([userLocation.lat, userLocation.lng]);
    }
    return points;
  }, [routes, stations, vehicles, userLocation]);

  return (
    <div className="live-map-screen__map-wrap">
      <div className="live-map-screen__map-toolbar" aria-hidden="true">
        <span className="live-map-screen__map-toolbar-chip">
          <Navigation2 size={14} aria-hidden="true" />
          Live updates every 7s
        </span>
        {providerLabel ? (
          <span className={`live-map-screen__map-toolbar-chip live-map-screen__map-toolbar-chip--${providerTone || 'fallback'}`}>
            {providerLabel}
          </span>
        ) : null}
        <button
          type="button"
          className="live-map-screen__map-toolbar-toggle"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
        >
          {isFullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Expand size={14} aria-hidden="true" />}
          <span>{isFullscreen ? 'Exit' : 'Full screen'}</span>
        </button>
      </div>
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="live-map-screen__map"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer
          attribution={FALLBACK_TILE_ATTRIBUTION}
          url={FALLBACK_TILE_URL}
          eventHandlers={{
            tileerror: () => onTileError?.(true),
            load: () => onTileError?.(false),
          }}
        />
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.coordinates}
            pathOptions={{
              color: route.color,
              weight: selectedVehicle?.routeName === route.routeName || selectedStation?.routes?.includes(route.routeName) ? 6 : 4,
              opacity: selectedVehicle?.routeName === route.routeName || selectedStation?.routes?.includes(route.routeName) ? 0.95 : 0.78,
            }}
          />
        ))}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={stationIcon}
            eventHandlers={{ click: () => onSelectStation(station) }}
          />
        ))}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={vehicleIcon}
            eventHandlers={{ click: () => onSelectVehicle(vehicle) }}
          />
        ))}
        {userLocation?.lat != null && userLocation?.lng != null ? (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={currentLocationIcon} />
        ) : null}
        <MapViewportSync
          dependencies={[
            mapCenter?.[0],
            mapCenter?.[1],
            selectedVehicle?.id,
            selectedStation?.id,
            isFullscreen,
            userLocation?.lat,
            userLocation?.lng,
          ]}
        />
        <CenterOnCurrentLocationOnce userLocation={userLocation} selectedPoint={selectedPoint} />
        <FitInitialBounds points={initialPoints} />
        <FocusSelection selectedPoint={selectedPoint} />
      </MapContainer>
      <MapFallbackNotice
        message={
          providerNotice ||
          (tileError ? 'Map tiles unavailable right now. SAFE markers and routes are still available.' : '')
        }
      />
    </div>
  );
}

function collectOperationalMapPoints(routes, stations, vehicles, userLocation) {
  const points = [];
  routes.forEach((route) => {
    route.coordinates.forEach((coord) => points.push(coord));
  });
  vehicles.forEach((vehicle) => points.push([vehicle.lat, vehicle.lng]));
  stations.forEach((station) => points.push([station.lat, station.lng]));
  if (userLocation?.lat != null && userLocation?.lng != null) {
    points.push([userLocation.lat, userLocation.lng]);
  }
  return points;
}

function TomTomOperationalMapSurface({
  routes,
  stations,
  vehicles,
  mapCenter,
  userLocation,
  selectedVehicle,
  selectedStation,
  focusedPoint,
  trafficEnabled,
  onToggleTraffic,
  onSelectVehicle,
  onSelectStation,
  isFullscreen,
  onToggleFullscreen,
}) {
  const selectedPoint = focusedPoint;
  const initialPoints = useMemo(
    () => collectOperationalMapPoints(routes, stations, vehicles, userLocation),
    [routes, stations, vehicles, userLocation],
  );

  return (
    <div className="live-map-screen__map-wrap">
      <div className="live-map-screen__map-toolbar" aria-label="Map status and traffic controls">
        <span className="live-map-screen__map-toolbar-chip">
          <Navigation2 size={14} aria-hidden="true" />
          Live updates every 7s
        </span>
        <span className="live-map-screen__map-toolbar-chip live-map-screen__map-toolbar-chip--ready">
          TomTom street map
        </span>
        <button
          type="button"
          className={`live-map-screen__map-toolbar-toggle ${trafficEnabled ? 'live-map-screen__map-toolbar-toggle--on' : ''}`}
          onClick={onToggleTraffic}
          aria-pressed={trafficEnabled}
          aria-label={`${trafficEnabled ? 'Disable' : 'Enable'} TomTom traffic layer`}
        >
          <span>Traffic</span>
          <strong>{trafficEnabled ? 'On' : 'Off'}</strong>
        </button>
        <button
          type="button"
          className="live-map-screen__map-toolbar-toggle"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={isFullscreen ? 'Exit full screen map' : 'Open full screen map'}
        >
          {isFullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Expand size={14} aria-hidden="true" />}
          <span>{isFullscreen ? 'Exit' : 'Full screen'}</span>
        </button>
      </div>
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="live-map-screen__map"
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer attribution={TOMTOM_TILE_ATTRIBUTION} url={TOMTOM_BASE_TILE_URL} zIndex={1} />
        {trafficEnabled ? (
          <TileLayer
            attribution={TOMTOM_TILE_ATTRIBUTION}
            url={TOMTOM_TRAFFIC_FLOW_TILE_URL}
            opacity={0.72}
            zIndex={2}
          />
        ) : null}
        {routes.map((route) => (
          <Polyline
            key={route.id}
            positions={route.coordinates}
            pathOptions={{
              color: route.color,
              weight: selectedVehicle?.routeName === route.routeName || selectedStation?.routes?.includes(route.routeName) ? 5 : 3,
              opacity: selectedVehicle?.routeName === route.routeName || selectedStation?.routes?.includes(route.routeName) ? 0.9 : 0.68,
            }}
          />
        ))}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.lat, station.lng]}
            icon={stationIcon}
            zIndexOffset={selectedStation?.id === station.id ? 700 : 300}
            eventHandlers={{ click: () => onSelectStation(station) }}
          />
        ))}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={[vehicle.lat, vehicle.lng]}
            icon={vehicleIcon}
            zIndexOffset={selectedVehicle?.id === vehicle.id ? 900 : 500}
            eventHandlers={{ click: () => onSelectVehicle(vehicle) }}
          />
        ))}
        {userLocation?.lat != null && userLocation?.lng != null ? (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={currentLocationIcon} zIndexOffset={1000} />
        ) : null}
        <MapViewportSync
          dependencies={[
            mapCenter?.[0],
            mapCenter?.[1],
            selectedVehicle?.id,
            selectedStation?.id,
            trafficEnabled,
            isFullscreen,
            userLocation?.lat,
            userLocation?.lng,
          ]}
        />
        <CenterOnCurrentLocationOnce userLocation={userLocation} selectedPoint={selectedPoint} />
        <FitInitialBounds points={initialPoints} />
        <FocusSelection selectedPoint={selectedPoint} />
      </MapContainer>
    </div>
  );
}

function OperationalMapCanvas({
  routes,
  stations,
  vehicles,
  mapCenter,
  userLocation,
  selectedVehicle,
  selectedStation,
  focusedPoint,
  tileError,
  onTileError,
  onSelectVehicle,
  onSelectStation,
  isFullscreen,
  onToggleFullscreen,
}) {
  const [trafficEnabled, setTrafficEnabled] = useState(true);
  const tomTomReady = Boolean(TOMTOM_API_KEY);

  if (tomTomReady) {
    return (
      <TomTomOperationalMapSurface
        routes={routes}
        stations={stations}
        vehicles={vehicles}
        mapCenter={mapCenter}
        userLocation={userLocation}
        selectedVehicle={selectedVehicle}
        selectedStation={selectedStation}
        focusedPoint={focusedPoint}
        trafficEnabled={trafficEnabled}
        onToggleTraffic={() => setTrafficEnabled((value) => !value)}
        onSelectVehicle={onSelectVehicle}
        onSelectStation={onSelectStation}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen}
      />
    );
  }

  return (
    <LeafletOperationalMapSurface
      routes={routes}
      stations={stations}
      vehicles={vehicles}
      mapCenter={mapCenter}
      userLocation={userLocation}
      selectedVehicle={selectedVehicle}
      selectedStation={selectedStation}
      focusedPoint={focusedPoint}
      tileError={tileError}
      onTileError={onTileError}
      onSelectVehicle={onSelectVehicle}
      onSelectStation={onSelectStation}
      providerLabel="SAFE fallback map"
      providerTone="fallback"
      providerNotice="Premium TomTom traffic map is not configured yet."
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}

function VehicleSheet({ vehicle, onClose, onVerifyVehicle, onBuyCover }) {
  if (!vehicle) return null;
  return (
    <section className="live-map-screen__sheet live-map-screen__sheet--vehicle" aria-label="Selected vehicle">
      <div className="live-map-screen__sheet-header">
        <div>
          <p className="live-map-screen__sheet-kicker">Selected vehicle</p>
          <h3 className="live-map-screen__sheet-title">{vehicle.registrationNumber}</h3>
        </div>
        <button type="button" className="live-map-screen__sheet-close" onClick={onClose} aria-label="Close vehicle details">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="live-map-screen__vehicle-hero">
        {vehicle.vehiclePhotoUrl ? (
          <img className="live-map-screen__vehicle-photo" src={vehicle.vehiclePhotoUrl} alt="" />
        ) : (
          <div className="live-map-screen__vehicle-photo live-map-screen__vehicle-photo--fallback" aria-hidden="true">
            <Navigation2 size={28} />
          </div>
        )}
        <div className="live-map-screen__vehicle-meta">
          <span className="live-map-screen__status-chip">
            <BadgeCheck size={14} aria-hidden="true" />
            {vehicle.status}
          </span>
          <p className="live-map-screen__sheet-subtitle">{vehicle.routeName}</p>
          <p className="live-map-screen__sheet-text">{vehicle.operatorName}</p>
        </div>
      </div>

      {vehicle.driverName || vehicle.driverPhotoUrl ? (
        <div className="live-map-screen__driver">
          {vehicle.driverPhotoUrl ? (
            <img className="live-map-screen__driver-photo" src={vehicle.driverPhotoUrl} alt="" />
          ) : (
            <div className="live-map-screen__driver-photo live-map-screen__driver-photo--fallback" aria-hidden="true">
              <MapPin size={16} />
            </div>
          )}
          <div className="live-map-screen__driver-copy">
            <span className="live-map-screen__detail-label">Driver</span>
            <strong className="live-map-screen__detail-value">{vehicle.driverName || 'Driver profile unavailable'}</strong>
          </div>
        </div>
      ) : null}

      <div className="live-map-screen__sheet-grid">
        <div>
          <span className="live-map-screen__detail-label">Last updated</span>
          <strong className="live-map-screen__detail-value">{formatUpdatedAt(vehicle.lastUpdatedAt)}</strong>
        </div>
        <div>
          <span className="live-map-screen__detail-label">Vehicle type</span>
          <strong className="live-map-screen__detail-value">{vehicle.vehicleType || 'Minibus'}</strong>
        </div>
        <div>
          <span className="live-map-screen__detail-label">Vehicle color</span>
          <strong className="live-map-screen__detail-value">{vehicle.vehicleColor || 'White and green'}</strong>
        </div>
      </div>

      <div className="live-map-screen__sheet-actions">
        <button type="button" className="live-map-screen__button live-map-screen__button--secondary" onClick={onVerifyVehicle}>
          Verify vehicle
        </button>
        <button type="button" className="live-map-screen__button live-map-screen__button--primary" onClick={onBuyCover}>
          Buy cover
        </button>
      </div>
    </section>
  );
}

function StationSheet({ station, nearbyVehicles, onClose, onViewVehicles, onPickVehicle }) {
  if (!station) return null;
  return (
    <section className="live-map-screen__sheet live-map-screen__sheet--station" aria-label="Selected station">
      <div className="live-map-screen__sheet-header">
        <div>
          <p className="live-map-screen__sheet-kicker">Selected station</p>
          <h3 className="live-map-screen__sheet-title">{station.name}</h3>
        </div>
        <button type="button" className="live-map-screen__sheet-close" onClick={onClose} aria-label="Close station details">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="live-map-screen__station-summary">
        <span className="live-map-screen__status-chip live-map-screen__status-chip--station">
          <BadgeCheck size={14} aria-hidden="true" />
          {station.activeVehicleCount} active SAFE vehicles nearby
        </span>
        <div className="live-map-screen__station-routes">
          {station.routes?.map((route) => (
            <span key={route} className="live-map-screen__route-chip">
              {route}
            </span>
          ))}
        </div>
      </div>

      <div className="live-map-screen__nearby-list" aria-label="Nearby vehicles">
        {nearbyVehicles.length ? nearbyVehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            type="button"
            className="live-map-screen__nearby-item"
            onClick={() => onPickVehicle(vehicle)}
          >
            <span className="live-map-screen__nearby-item-title">{vehicle.registrationNumber}</span>
            <span className="live-map-screen__nearby-item-sub">{vehicle.routeName}</span>
          </button>
        )) : (
          <p className="live-map-screen__nearby-empty">No vehicles are close enough to show right now.</p>
        )}
      </div>

      <button type="button" className="live-map-screen__button live-map-screen__button--primary" onClick={onViewVehicles}>
        View vehicles
      </button>
    </section>
  );
}

function StationVehicleListSheet({ station, vehicles, onClose, onPickVehicle }) {
  if (!station) return null;
  return (
    <section className="live-map-screen__sheet live-map-screen__sheet--vehicle-list" aria-label="Station vehicles">
      <div className="live-map-screen__sheet-header">
        <div>
          <p className="live-map-screen__sheet-kicker">Station vehicles</p>
          <h3 className="live-map-screen__sheet-title">{station.name}</h3>
        </div>
        <button type="button" className="live-map-screen__sheet-close" onClick={onClose} aria-label="Back to station">
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <p className="live-map-screen__station-list-subtitle">
        {vehicles.length
          ? `${vehicles.length} active SAFE vehicles near this station`
          : 'No active SAFE vehicles found near this station right now.'}
      </p>

      <div className="live-map-screen__station-vehicle-list" role="list" aria-label="Vehicles near station">
        {vehicles.length ? vehicles.map((vehicle) => (
          <button
            key={vehicle.id}
            type="button"
            className="live-map-screen__station-vehicle-card"
            role="listitem"
            onClick={() => onPickVehicle(vehicle)}
          >
            <div className="live-map-screen__station-vehicle-photo-wrap">
              {vehicle.vehiclePhotoUrl ? (
                <img className="live-map-screen__station-vehicle-photo" src={vehicle.vehiclePhotoUrl} alt="" />
              ) : (
                <div className="live-map-screen__station-vehicle-photo live-map-screen__station-vehicle-photo--fallback" aria-hidden="true">
                  <Navigation2 size={18} />
                </div>
              )}
            </div>
            <div className="live-map-screen__station-vehicle-copy">
              <div className="live-map-screen__station-vehicle-head">
                <strong className="live-map-screen__station-vehicle-title">{vehicle.registrationNumber}</strong>
                <span className="live-map-screen__status-chip">
                  <BadgeCheck size={14} aria-hidden="true" />
                  {vehicle.status}
                </span>
              </div>
              <p className="live-map-screen__station-vehicle-route">{vehicle.routeName}</p>
              <p className="live-map-screen__station-vehicle-operator">{vehicle.operatorName}</p>
              <div className="live-map-screen__station-vehicle-meta">
                <span>Last updated {formatUpdatedAt(vehicle.lastUpdatedAt)}</span>
              </div>
            </div>
          </button>
        )) : (
          <p className="live-map-screen__nearby-empty">
            No active SAFE vehicles found near this station right now.
          </p>
        )}
      </div>
    </section>
  );
}

export default function LiveMapScreen({ setScreen, goCover, openQrScanner, setScannedVehicle }) {
  const {
    permissionState,
    requestAccess,
    userLocation,
    mapCenter,
    updatedAt,
    routes,
    stations,
    vehicles,
  } = useOperationalMap();
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stationVehicleListStationId, setStationVehicleListStationId] = useState(null);
  const [focusedPoint, setFocusedPoint] = useState(null);
  const [tileError, setTileError] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? null;
  const selectedStation = stations.find((station) => station.id === selectedStationId) ?? null;
  const selectedStationVehicleListStation =
    stations.find((station) => station.id === stationVehicleListStationId) ?? null;
  const nearbyVehicles = selectedStation ? getNearbyVehiclesForStation(selectedStation, vehicles) : [];
  const stationVehicleListVehicles = selectedStationVehicleListStation
    ? getNearbyVehiclesForStation(selectedStationVehicleListStation, vehicles, 6)
    : [];

  const handleSelectVehicle = (vehicle) => {
    setSelectedStationId(null);
    setStationVehicleListStationId(null);
    setSelectedVehicleId(vehicle.id);
    setFocusedPoint({ lat: vehicle.lat, lng: vehicle.lng });
  };

  const handleSelectStation = (station) => {
    setSelectedVehicleId(null);
    setStationVehicleListStationId(null);
    setSelectedStationId(station.id);
    setFocusedPoint({ lat: station.lat, lng: station.lng });
  };

  const handleViewVehicles = () => {
    if (!selectedStation) return;
    setSelectedVehicleId(null);
    setStationVehicleListStationId(selectedStation.id);
    setFocusedPoint({ lat: selectedStation.lat, lng: selectedStation.lng });
  };

  const handlePickVehicle = (vehicle) => {
    setSelectedStationId(null);
    setStationVehicleListStationId(null);
    setSelectedVehicleId(vehicle.id);
    setFocusedPoint({ lat: vehicle.lat, lng: vehicle.lng });
  };

  const handleBuyCover = () => {
    if (selectedVehicle) {
      setScannedVehicle?.(buildLiveMapCoverContext(selectedVehicle, routes));
      setScreen('coverPlans');
      return;
    }
    goCover?.();
  };

  return (
    <main className="screen live-map-screen">
      <header className="live-map-screen__header">
        <button
          type="button"
          className="live-map-screen__back"
          onClick={() => {
            if (isMapFullscreen) {
              setIsMapFullscreen(false);
              return;
            }
            setScreen('home');
          }}
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="live-map-screen__title">SAFE live map</h1>
        <span className="live-map-screen__spacer" aria-hidden="true" />
      </header>

      <div className="live-map-screen__scroll">
        <section className="live-map-screen__intro">
          <div className="live-map-screen__intro-copy">
            <p className="live-map-screen__intro-kicker">Operational view</p>
            <h2 className="live-map-screen__intro-title">Nearby vehicles, stations, and route lines</h2>
            <p className="live-map-screen__intro-text">
              Tap a marker to inspect a vehicle or station. SAFE updates the map while this screen is open.
            </p>
          </div>
          <MapHeaderChips vehicles={vehicles} stations={stations} routes={routes} updatedAt={updatedAt} />
        </section>

        {permissionState !== 'granted' ? (
          <PermissionStateCard permissionState={permissionState} onAllowLocation={requestAccess} />
        ) : (
          <>
            <section
              className={`live-map-screen__map-card ${isMapFullscreen ? 'live-map-screen__map-card--fullscreen' : ''}`}
              aria-label="SAFE operational map"
            >
              <OperationalMapCanvas
                routes={routes}
                stations={stations}
                vehicles={vehicles}
                mapCenter={mapCenter}
                userLocation={userLocation}
                selectedVehicle={selectedVehicle}
                selectedStation={selectedStation}
                focusedPoint={focusedPoint}
                tileError={tileError}
                onTileError={setTileError}
                onSelectVehicle={handleSelectVehicle}
                onSelectStation={handleSelectStation}
                isFullscreen={isMapFullscreen}
                onToggleFullscreen={() => setIsMapFullscreen((value) => !value)}
              />
            </section>

            {selectedVehicle ? (
              <VehicleSheet
                vehicle={selectedVehicle}
                onClose={() => setSelectedVehicleId(null)}
                onVerifyVehicle={() => openQrScanner?.()}
                onBuyCover={handleBuyCover}
              />
            ) : null}

            {selectedStation && !selectedStationVehicleListStation ? (
              <StationSheet
                station={selectedStation}
                nearbyVehicles={nearbyVehicles}
                onClose={() => setSelectedStationId(null)}
                onViewVehicles={handleViewVehicles}
                onPickVehicle={handlePickVehicle}
              />
            ) : null}

            {selectedStationVehicleListStation ? (
              <StationVehicleListSheet
                station={selectedStationVehicleListStation}
                vehicles={stationVehicleListVehicles}
                onClose={() => setStationVehicleListStationId(null)}
                onPickVehicle={handlePickVehicle}
              />
            ) : null}
          </>
        )}

        <div className="live-map-screen__footer-note">
          <span className="live-map-screen__footer-note-pill">Refreshes every 7 seconds</span>
          <span>Mock Lusaka data stays separated and backend-ready.</span>
        </div>

        <BottomScrollSpacer height={220} />
      </div>
    </main>
  );
}
