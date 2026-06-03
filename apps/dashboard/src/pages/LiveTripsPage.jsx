import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Activity, Bus, Clock3, MapPin, RadioTower, RefreshCw, Route as RouteIcon, Search, ShieldCheck } from 'lucide-react';
import { dashboardTrips, dashboardVehicles, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DetailPanel,
  EmptyState,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY?.trim() ?? '';
const TOMTOM_TILE_URL = TOMTOM_API_KEY
  ? `https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${encodeURIComponent(TOMTOM_API_KEY)}`
  : '';
const FALLBACK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

const ROUTE_LINES = [
  {
    id: 'matero-town',
    names: ['Matero', 'Town'],
    color: '#007a3d',
    coordinates: [
      [-15.359, 28.262],
      [-15.374, 28.277],
      [-15.392, 28.29],
      [-15.416, 28.283],
    ],
  },
  {
    id: 'chelstone-town',
    names: ['Chelstone', 'Town'],
    color: '#2563eb',
    coordinates: [
      [-15.386, 28.397],
      [-15.397, 28.36],
      [-15.412, 28.317],
      [-15.416, 28.283],
    ],
  },
  {
    id: 'kanyama-town',
    names: ['Kanyama', 'Town'],
    color: '#f59e0b',
    coordinates: [
      [-15.417, 28.238],
      [-15.417, 28.258],
      [-15.416, 28.283],
    ],
  },
  {
    id: 'mandevu-town',
    names: ['Mandevu', 'Town'],
    color: '#7c3aed',
    coordinates: [
      [-15.372, 28.302],
      [-15.39, 28.297],
      [-15.416, 28.283],
    ],
  },
];

const STATUS_META = {
  live: { label: 'Live GPS', shortLabel: 'Live', color: '#16a34a', ring: '#86efac', bg: '#f0fdf4' },
  stale: { label: 'GPS stale', shortLabel: 'Stale', color: '#d97706', ring: '#fde68a', bg: '#fffbeb' },
  last_known: { label: 'Last known GPS', shortLabel: 'Known', color: '#2563eb', ring: '#bfdbfe', bg: '#eff6ff' },
  location_pending: { label: 'Waiting for GPS', shortLabel: 'Waiting', color: '#64748b', ring: '#cbd5e1', bg: '#f8fafc' },
  suspended: { label: 'Suspended', shortLabel: 'Hold', color: '#dc2626', ring: '#fecaca', bg: '#fef2f2' },
};

function vehicleIcon(status) {
  const meta = STATUS_META[status] ?? STATUS_META.location_pending;
  return L.divIcon({
    className: '',
    html: `<div style="width:36px;height:36px;border-radius:12px;background:${meta.color};border:3px solid #fff;box-shadow:0 0 0 3px ${meta.ring},0 12px 26px rgba(15,23,42,.28);display:grid;place-items:center;color:white;font-weight:900;font-size:16px;letter-spacing:-.04em">S</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function formatRoute(route) {
  if (!route) return 'Unassigned route';
  return `${route.origin} -> ${route.destination}`;
}

function formatRouteCode(route) {
  if (!route) return 'UNASSIGNED';
  return `${route.origin?.slice(0, 3) ?? '---'}-${route.destination?.slice(0, 3) ?? '---'}`.toUpperCase();
}

function formatSignalTime(value) {
  if (!value) return 'No GPS ping yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No GPS ping yet';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return fmtDateTime(value);
}

function hasCoordinate(location) {
  return location?.lat != null && location?.lng != null;
}

function seededLusakaPoint(index) {
  const points = [
    [-15.4167, 28.2814],
    [-15.395, 28.281],
    [-15.374, 28.277],
    [-15.386, 28.397],
    [-15.417, 28.238],
    [-15.372, 28.302],
    [-15.409, 28.335],
    [-15.438, 28.312],
  ];
  return points[index % points.length];
}

function normalizePolyline(polyline) {
  if (!Array.isArray(polyline)) return [];
  return polyline
    .map((point) => {
      if (Array.isArray(point) && point.length >= 2) return [point[0], point[1]];
      if (point?.lat != null && point?.lng != null) return [point.lat, point.lng];
      return null;
    })
    .filter(Boolean);
}

function routeForVehicle(vehicle) {
  const routeName = formatRoute(vehicle.route).toLowerCase();
  return ROUTE_LINES.find((line) =>
    line.names.every((name) => routeName.includes(name.toLowerCase())),
  );
}

function buildVehicleObservation(vehicle, trips, index) {
  const matchingTrips = trips.filter((trip) => trip.vehiclePlate === vehicle.plateNumber);
  const liveTrip =
    matchingTrips.find((trip) => trip.isLive) ??
    matchingTrips.find((trip) => trip.isStale) ??
    matchingTrips[0] ??
    null;
  const tripLocation = liveTrip?.currentLocation;
  const storedLocation = vehicle.lastLocation;
  const hasRealLocation = hasCoordinate(tripLocation) || hasCoordinate(storedLocation);
  const fallbackPoint = seededLusakaPoint(index);
  const position = hasCoordinate(tripLocation)
    ? [tripLocation.lat, tripLocation.lng]
    : hasCoordinate(storedLocation)
      ? [storedLocation.lat, storedLocation.lng]
      : fallbackPoint;

  let status = 'location_pending';
  if (vehicle.isSuspended) status = 'suspended';
  else if (liveTrip?.isLive) status = 'live';
  else if (liveTrip?.isStale) status = 'stale';
  else if (hasCoordinate(storedLocation)) status = 'last_known';

  return {
    id: vehicle.id,
    plateNumber: vehicle.plateNumber,
    busId: vehicle.busId,
    route: vehicle.route,
    routeName: formatRoute(vehicle.route),
    routeCode: formatRouteCode(vehicle.route),
    partner: vehicle.partner,
    driver: vehicle.driver,
    qr: vehicle.qr,
    qrStatus: vehicle.qrStatus,
    coverCount: vehicle.coverCount,
    operationalStatus: vehicle.operationalStatus,
    status,
    statusLabel: STATUS_META[status]?.label ?? status,
    position,
    hasRealLocation,
    coordinateSource: hasCoordinate(tripLocation) ? 'Passenger trip GPS' : hasCoordinate(storedLocation) ? 'Vehicle last known GPS' : 'Awaiting live location',
    lastLocationAt: tripLocation?.recordedAt ?? storedLocation?.recordedAt ?? vehicle.locationAt ?? liveTrip?.lastLocationAt ?? null,
    trip: liveTrip,
    activeTripCount: matchingTrips.filter((trip) => trip.isLive).length,
    routeLine: normalizePolyline(liveTrip?.routePolyline).length ? normalizePolyline(liveTrip.routePolyline) : routeForVehicle(vehicle)?.coordinates ?? [],
    routeColor: routeForVehicle(vehicle)?.color ?? '#007a3d',
  };
}

function FitVehicles({ vehicles, selectedVehicle }) {
  const map = useMap();
  const prev = useRef('');

  useEffect(() => {
    const points = selectedVehicle ? [selectedVehicle.position] : vehicles.map((vehicle) => vehicle.position);
    if (!points.length) return;
    const key = points.map((point) => point.join(',')).join('|');
    if (key === prev.current) return;
    prev.current = key;
    if (points.length === 1) {
      map.setView(points[0], 14);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 14 });
    }
  }, [map, vehicles, selectedVehicle]);

  return null;
}

function OpsVehicleMap({ vehicles, selectedVehicle, onSelect }) {
  const defaultCenter = selectedVehicle?.position ?? vehicles[0]?.position ?? [-15.4167, 28.2814];
  const visibleRouteLines = vehicles
    .filter((vehicle) => vehicle.routeLine.length)
    .map((vehicle) => ({
      id: vehicle.id,
      coordinates: vehicle.routeLine,
      color: vehicle.routeColor,
      active: selectedVehicle?.id === vehicle.id || vehicle.status === 'live',
    }));

  return (
    <div className="relative h-[560px] min-h-[420px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
      <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution={TOMTOM_API_KEY ? '&copy; TomTom' : '&copy; OpenStreetMap contributors &copy; CARTO'}
          url={TOMTOM_API_KEY ? TOMTOM_TILE_URL : FALLBACK_TILE_URL}
        />
        {visibleRouteLines.map((line) => (
          <Polyline
            key={line.id}
            positions={line.coordinates}
            pathOptions={{
              color: line.color,
              weight: line.active ? 5 : 3,
              opacity: line.active ? 0.9 : 0.38,
            }}
          />
        ))}
        {vehicles.map((vehicle) => (
          <Marker
            key={vehicle.id}
            position={vehicle.position}
            icon={vehicleIcon(vehicle.status)}
            zIndexOffset={selectedVehicle?.id === vehicle.id ? 900 : vehicle.status === 'live' ? 700 : 300}
            eventHandlers={{ click: () => onSelect(vehicle.id) }}
          >
            <Popup>
              <div className="min-w-40 text-xs leading-5">
                <strong>{vehicle.plateNumber}</strong>
                <div>{vehicle.routeName}</div>
                <div>{vehicle.partner?.name ?? 'No operator linked'}</div>
                <div style={{ color: STATUS_META[vehicle.status]?.color }}>{vehicle.statusLabel}</div>
              </div>
            </Popup>
          </Marker>
        ))}
        <FitVehicles vehicles={vehicles} selectedVehicle={selectedVehicle} />
      </MapContainer>
      <div className="absolute left-4 top-4 z-[1000] flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-safe-ink shadow-sm">
          <RadioTower size={14} /> Linked vehicle monitor
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50/95 px-3 py-2 text-xs font-black text-emerald-800 shadow-sm">
          <Activity size={14} /> Refreshes every 10s
        </span>
        {!TOMTOM_API_KEY ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/85 px-3 py-2 text-xs font-black text-white shadow-sm">
            Fallback map
          </span>
        ) : null}
      </div>
      <div className="absolute bottom-4 left-4 right-4 z-[1000] flex flex-wrap gap-2 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
            {meta.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

function VehicleList({ vehicles, selectedId, onSelect }) {
  if (!vehicles.length) {
    return <EmptyState title="No linked vehicles" description="No vehicles match this operations filter yet." />;
  }

  return (
    <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
      {vehicles.map((vehicle) => (
        <button
          key={vehicle.id}
          type="button"
          onClick={() => onSelect(vehicle.id)}
          className={`group relative w-full overflow-hidden rounded-2xl border p-0 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-lg ${
            selectedId === vehicle.id ? 'border-safe-electric bg-white shadow-lg ring-1 ring-safe-electric/20' : 'border-slate-200 bg-white shadow-sm'
          }`}
        >
          <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: STATUS_META[vehicle.status]?.color }} />
          <div className="px-4 py-3 pl-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[15px] font-black leading-tight tracking-tight text-safe-ink">{vehicle.plateNumber}</strong>
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wide text-slate-500">
                    {vehicle.routeCode}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-bold text-slate-700">{vehicle.routeName}</p>
              </div>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                style={{ background: STATUS_META[vehicle.status]?.bg, color: STATUS_META[vehicle.status]?.color }}
              >
                {STATUS_META[vehicle.status]?.shortLabel ?? vehicle.statusLabel}
              </span>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate font-semibold text-slate-500">{vehicle.partner?.name ?? 'No operator linked'}</span>
                <span className="shrink-0 font-mono font-black text-slate-400">{vehicle.busId ?? 'NO BUS ID'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="truncate text-slate-500">Driver: <strong className="font-bold text-slate-700">{vehicle.driver?.fullName ?? 'Unassigned'}</strong></span>
                <span className="shrink-0 text-slate-500">{formatSignalTime(vehicle.lastLocationAt)}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold text-slate-600">{vehicle.coordinateSource}</div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {vehicle.position[0].toFixed(4)}, {vehicle.position[1].toFixed(4)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Policy</div>
                <div className="text-[11px] font-black text-safe-ink">{vehicle.trip?.policyId?.slice(-8) ?? '—'}</div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function LiveTripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bucket = searchParams.get('bucket') || 'all';
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [vehicleRes, tripRes] = await Promise.all([
        dashboardVehicles(token, { status: 'all', qrStatus: 'all' }),
        dashboardTrips(token, 'all'),
      ]);
      setVehicles(vehicleRes.vehicles || []);
      setTrips(tripRes.trips || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load live operations data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const observedVehicles = useMemo(
    () => vehicles.map((vehicle, index) => buildVehicleObservation(vehicle, trips, index)),
    [vehicles, trips],
  );

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return observedVehicles.filter((vehicle) => {
      const bucketMatch = bucket === 'all' || vehicle.status === bucket;
      const searchMatch =
        !query ||
        vehicle.plateNumber.toLowerCase().includes(query) ||
        vehicle.routeName.toLowerCase().includes(query) ||
        vehicle.partner?.name?.toLowerCase().includes(query) ||
        vehicle.driver?.fullName?.toLowerCase().includes(query);
      return bucketMatch && searchMatch;
    });
  }, [observedVehicles, bucket, search]);

  const selectedVehicle =
    filteredVehicles.find((vehicle) => vehicle.id === selectedId) ??
    observedVehicles.find((vehicle) => vehicle.id === selectedId) ??
    filteredVehicles[0] ??
    null;

  useEffect(() => {
    if (!selectedId && filteredVehicles[0]) setSelectedId(filteredVehicles[0].id);
  }, [filteredVehicles, selectedId]);

  const metrics = useMemo(
    () => ({
      total: observedVehicles.length,
      live: observedVehicles.filter((vehicle) => vehicle.status === 'live').length,
      stale: observedVehicles.filter((vehicle) => vehicle.status === 'stale').length,
      pending: observedVehicles.filter((vehicle) => vehicle.status === 'location_pending').length,
    }),
    [observedVehicles],
  );

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <PageHeader
        title="Live operations"
        description="Observe all linked SAFE vehicles, route activity, operator links, and live passenger trip locations from one console."
        actions={
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-safe-ink shadow-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {error ? <ErrorCard message={error} onRetry={load} /> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked vehicles</div>
          <div className="mt-2 text-3xl font-black text-safe-ink">{metrics.total}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live now</div>
          <div className="mt-2 text-3xl font-black text-emerald-600">{metrics.live}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Stale GPS</div>
          <div className="mt-2 text-3xl font-black text-amber-500">{metrics.stale}</div>
        </Card>
        <Card>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Awaiting GPS</div>
          <div className="mt-2 text-3xl font-black text-slate-500">{metrics.pending}</div>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search plate, route, driver, or operator..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:border-safe-electric focus:bg-white"
          />
        </div>
        <FilterTabs
          value={bucket}
          onChange={(value) => setSearchParams(value === 'all' ? {} : { bucket: value })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live' },
            { value: 'stale', label: 'Stale' },
            { value: 'last_known', label: 'Last known' },
            { value: 'location_pending', label: 'Pending GPS' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </div>

      {loading ? (
        <Card><LoadingBlock /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-black text-safe-ink">Linked vehicles</div>
                <div className="text-xs font-semibold text-slate-500">{filteredVehicles.length} visible in this view</div>
              </div>
              <ShieldCheck className="text-safe-electric" size={22} />
            </div>
            <VehicleList vehicles={filteredVehicles} selectedId={selectedVehicle?.id} onSelect={setSelectedId} />
          </Card>

          <Card padding={false}>
            <OpsVehicleMap vehicles={filteredVehicles} selectedVehicle={selectedVehicle} onSelect={setSelectedId} />
          </Card>

          {!selectedVehicle ? (
            <Card>
              <EmptyState title="Vehicle detail" description="Select a linked vehicle to inspect operator, route, QR, and GPS freshness." />
            </Card>
          ) : (
            <DetailPanel title={selectedVehicle.plateNumber} onClose={() => setSelectedId(null)}>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedVehicle.status} />
                  <StatusBadge status={selectedVehicle.qrStatus} />
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="grid grid-cols-[44px_1fr] gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-safe-electric text-white">
                      <Bus size={20} />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-slate-400">Route</div>
                      <div className="mt-1 font-black text-safe-ink">{selectedVehicle.routeName}</div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">{selectedVehicle.partner?.name ?? 'No operator linked'}</div>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 text-safe-electric" size={16} />
                    <div>
                      <strong>Location source:</strong> {selectedVehicle.coordinateSource}
                      <div className="mt-1 font-mono text-xs text-slate-500">
                        {selectedVehicle.position[0].toFixed(5)}, {selectedVehicle.position[1].toFixed(5)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock3 className="mt-0.5 text-safe-electric" size={16} />
                    <div><strong>Last updated:</strong> {fmtDateTime(selectedVehicle.lastLocationAt)}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <RouteIcon className="mt-0.5 text-safe-electric" size={16} />
                    <div><strong>Driver:</strong> {selectedVehicle.driver?.fullName ?? 'Not assigned'}</div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 p-3 text-xs text-slate-600">
                  <div><strong>SAFE QR:</strong> {selectedVehicle.qr?.code ?? 'No QR linked'}</div>
                  <div><strong>Covers sold:</strong> {selectedVehicle.coverCount ?? 0}</div>
                  <div><strong>Active trips:</strong> {selectedVehicle.activeTripCount}</div>
                  <div><strong>Policy:</strong> {selectedVehicle.trip?.policyId ?? 'No live passenger trip'}</div>
                </div>
                <Link
                  to={`/vehicles?selected=${selectedVehicle.id}`}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-safe-ink px-4 py-3 text-sm font-black text-white"
                >
                  Open vehicle record
                </Link>
              </div>
            </DetailPanel>
          )}
        </div>
      )}
    </div>
  );
}
