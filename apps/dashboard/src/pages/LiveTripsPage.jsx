import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSearchParams } from 'react-router-dom';
import { dashboardTrips, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

// Leaflet default icon fix (webpack/vite strips the default URL)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const liveIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 2px #16a34a,0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const staleIcon = L.divIcon({
  className: '',
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -10],
});

const endedIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#94a3b8;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -9],
});

function markerIcon(trip) {
  if (trip.isLive) return liveIcon;
  if (trip.isStale) return staleIcon;
  return endedIcon;
}

function FitMarkers({ points }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (!points.length) return;
    const key = points.map((p) => `${p[0]},${p[1]}`).join('|');
    if (key === prev.current) return;
    prev.current = key;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
}

function TripsMap({ trips, selected, onSelect }) {
  const mapPoints = useMemo(
    () =>
      trips
        .filter((t) => t.currentLocation?.lat != null)
        .map((t) => [t.currentLocation.lat, t.currentLocation.lng]),
    [trips]
  );

  const defaultCenter = mapPoints[0] ?? [-15.395, 28.281];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%', minHeight: 340, borderRadius: '0.75rem' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {trips
        .filter((t) => t.currentLocation?.lat != null)
        .map((t) => (
          <Marker
            key={t.id}
            position={[t.currentLocation.lat, t.currentLocation.lng]}
            icon={markerIcon(t)}
            eventHandlers={{ click: () => onSelect(t) }}
          >
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <strong>{t.vehiclePlate || '—'}</strong>
                <br />
                {t.passenger?.fullName || t.passenger?.phone || 'Passenger'}
                <br />
                <span style={{ color: t.isLive ? '#16a34a' : t.isStale ? '#d97706' : '#64748b' }}>
                  {t.isLive ? 'Live' : t.isStale ? 'Stale location' : t.displayStatus}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      <FitMarkers points={mapPoints} />
    </MapContainer>
  );
}

export default function LiveTripsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const bucket = searchParams.get('bucket') || 'active';
  const [trips, setTrips] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardTrips(token, bucket === 'all' ? undefined : bucket)
      .then((d) => setTrips(d.trips || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, bucket]);

  // Auto-refresh active trips every 15 s
  useEffect(() => {
    if (bucket !== 'active') return;
    const id = setInterval(() => {
      if (!token) return;
      dashboardTrips(token, 'active')
        .then((d) => setTrips(d.trips || []))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, [token, bucket]);

  const columns = [
    { key: 'policy', label: 'Policy', render: (t) => t.policyId || t.coverId?.slice(-8) || '—' },
    { key: 'passenger', label: 'Passenger', render: (t) => t.passenger?.fullName || t.passenger?.phone || '—' },
    { key: 'vehicle', label: 'Vehicle', render: (t) => t.vehiclePlate || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (t) => <StatusBadge status={t.isLive ? 'live' : t.isStale ? 'stale' : t.displayStatus} />,
    },
    { key: 'started', label: 'Started', render: (t) => fmtDateTime(t.startedAt) },
    { key: 'location', label: 'Last location', render: (t) => fmtDateTime(t.lastLocationAt) },
  ];

  const tripsWithLocation = trips.filter((t) => t.currentLocation?.lat != null);
  const showMap = !loading && !error && tripsWithLocation.length > 0;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Live trips"
        description="Trip tracking from passenger mobile sessions. Green = live, amber = stale location."
      />

      {error ? <ErrorCard message={error} /> : null}

      <FilterTabs
        value={bucket}
        onChange={(v) => setSearchParams(v === 'active' ? {} : { bucket: v })}
        options={[
          { value: 'active', label: 'Active' },
          { value: 'stale', label: 'Stale location' },
          { value: 'ended', label: 'Ended' },
          { value: 'all', label: 'All' },
        ]}
      />

      {showMap ? (
        <Card padding={false}>
          <div style={{ height: 360, position: 'relative' }}>
            <TripsMap trips={trips} selected={selected} onSelect={setSelected} />
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                background: 'rgba(255,255,255,0.92)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                boxShadow: '0 1px 6px rgba(0,0,0,.15)',
              }}
            >
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', marginRight: 5 }} />
                Live
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', marginRight: 5 }} />
                Stale
              </span>
              <span>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#94a3b8', marginRight: 5 }} />
                Ended
              </span>
            </div>
          </div>
        </Card>
      ) : !loading && !error && trips.length === 0 ? null : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? (
            <LoadingBlock />
          ) : (
            <DataTable
              columns={columns}
              rows={trips}
              onRowClick={setSelected}
              emptyTitle="No trips in this bucket"
            />
          )}
        </Card>

        {!selected ? (
          <Card>
            <EmptyState
              title="Trip detail"
              description="Select a trip row or map marker to inspect passenger, cover, and last known location."
            />
          </Card>
        ) : (
          <DetailPanel title={selected.policyId || 'Trip detail'} onClose={() => setSelected(null)}>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <StatusBadge status={selected.isLive ? 'live' : selected.isStale ? 'stale' : selected.displayStatus} />
                {!selected.isLive && selected.isStale ? (
                  <span className="text-xs text-amber-700 font-semibold">Last known location</span>
                ) : null}
              </div>
              <div><strong>Passenger:</strong> {selected.passenger?.fullName || selected.passenger?.phone || '—'}</div>
              <div><strong>Vehicle:</strong> {selected.vehiclePlate || '—'}</div>
              <div><strong>Cover status:</strong> {selected.coverStatus}</div>
              <div><strong>Payment:</strong> {selected.paymentStatus || '—'}</div>
              <div><strong>Started:</strong> {fmtDateTime(selected.startedAt)}</div>
              <div><strong>Last location:</strong> {fmtDateTime(selected.lastLocationAt)}</div>
              <div><strong>Expires:</strong> {fmtDateTime(selected.expiresAt)}</div>
              {selected.currentLocation ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs font-mono">
                  {selected.currentLocation.lat.toFixed(5)}, {selected.currentLocation.lng.toFixed(5)}
                  {selected.currentLocation.recordedAt ? (
                    <div className="text-slate-500 mt-1">Recorded {fmtDateTime(selected.currentLocation.recordedAt)}</div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No coordinates recorded yet.</p>
              )}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
