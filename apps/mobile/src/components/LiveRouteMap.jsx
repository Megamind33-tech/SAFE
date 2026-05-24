import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';
import { MapPin, Navigation2, RefreshCw, ShieldCheck } from 'lucide-react';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const startIcon = L.divIcon({
  className: 'live-map-marker live-map-marker-start',
  html: '<span>S</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const endIcon = L.divIcon({
  className: 'live-map-marker live-map-marker-end',
  html: '<span>D</span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const vehicleIcon = L.divIcon({
  className: 'live-map-marker live-map-marker-vehicle',
  html: '<span>🚌</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [28, 28], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function LiveRouteMap({ trip, loading, error, onRetry }) {
  const polyline = trip?.route?.polyline ?? [];
  const vehicle = trip?.vehicleLocation;
  const hasRoute = polyline.length >= 2 || (trip?.route?.start && trip?.route?.destination);

  const mapPoints = useMemo(() => {
    const pts = [];
    if (trip?.route?.start) pts.push([trip.route.start.lat, trip.route.start.lng]);
    polyline.forEach((p) => pts.push([p.lat, p.lng]));
    if (vehicle?.lat != null && vehicle?.lng != null) pts.push([vehicle.lat, vehicle.lng]);
    if (trip?.route?.destination) pts.push([trip.route.destination.lat, trip.route.destination.lng]);
    return pts;
  }, [trip, polyline, vehicle]);

  const linePositions = useMemo(() => {
    if (polyline.length >= 2) return polyline.map((p) => [p.lat, p.lng]);
    if (trip?.route?.start && trip?.route?.destination) {
      return [
        [trip.route.start.lat, trip.route.start.lng],
        [trip.route.destination.lat, trip.route.destination.lng],
      ];
    }
    return [];
  }, [polyline, trip]);

  if (loading) {
    return (
      <div className="live-route-map live-route-map-loading" aria-live="polite">
        <div className="live-route-map-skeleton" />
        <p>Loading protected route…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-route-map live-route-map-error">
        <p>Unable to load live route</p>
        <button type="button" className="live-route-map-retry" onClick={onRetry}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="live-route-map live-route-map-empty">
        <Navigation2 size={28} />
        <strong>No active protected trip</strong>
        <p>Start a cover to view live route protection.</p>
      </div>
    );
  }

  if (!hasRoute) {
    return (
      <div className="live-route-map live-route-map-empty">
        <Navigation2 size={28} />
        <strong>Route not assigned</strong>
        <p>Waiting for admin route assignment for this cover.</p>
      </div>
    );
  }

  const defaultCenter = linePositions[0] ?? [-15.395, 28.281];

  return (
    <div className="live-route-map">
      <div className="live-route-map-chips">
        <span className="route-live-pill"><i />Live</span>
        {vehicle ? (
          <span className="map-status-card">
            <ShieldCheck size={15} />
            <strong>Route secured</strong>
          </span>
        ) : (
          <span className="map-status-card map-status-card-wait">
            <MapPin size={15} />
            <strong>Waiting for vehicle location…</strong>
          </span>
        )}
      </div>
      <MapContainer center={defaultCenter} zoom={13} className="live-route-map-canvas" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {linePositions.length >= 2 ? (
          <Polyline positions={linePositions} pathOptions={{ color: '#ffc700', weight: 5, opacity: 0.92 }} />
        ) : null}
        {trip.route?.start ? <Marker position={[trip.route.start.lat, trip.route.start.lng]} icon={startIcon} /> : null}
        {trip.route?.destination ? (
          <Marker position={[trip.route.destination.lat, trip.route.destination.lng]} icon={endIcon} />
        ) : null}
        {vehicle?.lat != null && vehicle?.lng != null ? (
          <Marker position={[vehicle.lat, vehicle.lng]} icon={vehicleIcon} />
        ) : null}
        <FitBounds points={mapPoints} />
      </MapContainer>
    </div>
  );
}
