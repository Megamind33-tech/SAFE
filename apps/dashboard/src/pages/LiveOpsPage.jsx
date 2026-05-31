import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  dashboardTrips,
  dashboardSupportReports,
  dashboardMetrics,
  loadDashboardToken,
} from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  MetricCard,
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

function markerIcon(trip) {
  return trip.isLive ? liveIcon : staleIcon;
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

function OpsMap({ trips, onSelect }) {
  const mapPoints = useMemo(
    () =>
      trips
        .filter((t) => t.currentLocation?.lat != null)
        .map((t) => [t.currentLocation.lat, t.currentLocation.lng]),
    [trips],
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
                <span style={{ color: t.isLive ? '#16a34a' : '#d97706' }}>
                  {t.isLive ? 'Live' : 'Stale location'}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      <FitMarkers points={mapPoints} />
    </MapContainer>
  );
}

const TRIP_COLUMNS = [
  { key: 'policy', label: 'Policy', render: (t) => t.policyId || t.coverId?.slice(-8) || '—' },
  { key: 'passenger', label: 'Passenger', render: (t) => t.passenger?.fullName || t.passenger?.phone || '—' },
  { key: 'vehicle', label: 'Vehicle', render: (t) => t.vehiclePlate || '—' },
  {
    key: 'status',
    label: 'Status',
    render: (t) => <StatusBadge status={t.isLive ? 'live' : 'stale'} />,
  },
  { key: 'started', label: 'Started', render: (t) => fmtDateTime(t.startedAt) },
  { key: 'location', label: 'Last location', render: (t) => fmtDateTime(t.lastLocationAt) },
];

const SUPPORT_COLUMNS = [
  { key: 'ref', label: 'Ref', render: (r) => r.id?.slice(-8) || '—' },
  { key: 'category', label: 'Category', render: (r) => r.category || '—' },
  { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
  {
    key: 'passenger',
    label: 'Passenger',
    render: (r) => r.passenger?.fullName || r.passenger?.phone || '—',
  },
  { key: 'createdAt', label: 'Opened', render: (r) => fmtDateTime(r.createdAt) },
];

export default function LiveOpsPage() {
  const [trips, setTrips] = useState([]);
  const [support, setSupport] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [supportTab, setSupportTab] = useState('open');
  const token = loadDashboardToken();

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      dashboardTrips(token, 'active'),
      dashboardSupportReports(token, supportTab),
      dashboardMetrics(token),
    ])
      .then(([tripsData, supportData, metricsData]) => {
        setTrips(tripsData.trips || []);
        setSupport(supportData.reports || []);
        setMetrics(metricsData.metrics || null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [token, supportTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => {
      if (!token) return;
      dashboardTrips(token, 'active')
        .then((d) => setTrips(d.trips || []))
        .catch(() => {});
    }, 15_000);
    return () => clearInterval(id);
  }, [token]);

  const liveTrips = trips.filter((t) => t.isLive);
  const staleTrips = trips.filter((t) => t.isStale);
  const mapTrips = [...liveTrips, ...staleTrips];
  const showMap = !loading && !error && mapTrips.filter((t) => t.currentLocation?.lat != null).length > 0;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Live Operations"
        description="Field operations, active trips, and open support tickets."
      />

      {error ? <ErrorCard message={error} /> : null}
      {loading ? <LoadingBlock /> : null}

      {metrics && !loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Active trips" value={metrics.activeTrips ?? '—'} sub="Live on network" />
          <MetricCard label="Active covers" value={metrics.activeCovers ?? '—'} sub="In force now" />
          <MetricCard label="Open support" value={metrics.openSupport ?? '—'} sub="Needs response" />
          <MetricCard label="Fraud flags" value={metrics.fraudFlags ?? '—'} sub="All time" />
        </div>
      ) : null}

      {showMap ? (
        <Card padding={false}>
          <div style={{ height: 360, position: 'relative' }}>
            <OpsMap trips={mapTrips} onSelect={setSelected} />
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
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          <div className="px-4 pt-4 pb-1 text-sm font-black text-safe-ink">Active trips</div>
          {loading ? (
            <LoadingBlock />
          ) : (
            <DataTable
              columns={TRIP_COLUMNS}
              rows={mapTrips}
              onRowClick={setSelected}
              emptyTitle="No active or stale trips"
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
                <StatusBadge status={selected.isLive ? 'live' : 'stale'} />
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

      <Card padding={false}>
        <div className="px-4 pt-4 pb-1 text-sm font-black text-safe-ink">Support reports</div>
        <div className="px-4 pb-2">
          <FilterTabs
            value={supportTab}
            onChange={setSupportTab}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In progress' },
              { value: 'resolved', label: 'Resolved' },
            ]}
          />
        </div>
        {loading ? (
          <LoadingBlock />
        ) : (
          <DataTable
            columns={SUPPORT_COLUMNS}
            rows={support}
            emptyTitle="No support reports in this status"
          />
        )}
      </Card>
    </div>
  );
}
