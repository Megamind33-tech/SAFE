import React, { useEffect, useState } from 'react';
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

  const columns = [
    { key: 'policy', label: 'Policy', render: (t) => t.policyId || t.coverId.slice(-8) },
    { key: 'passenger', label: 'Passenger', render: (t) => t.passenger?.fullName || t.passenger?.phone || '—' },
    { key: 'vehicle', label: 'Vehicle', render: (t) => t.vehiclePlate || '—' },
    {
      key: 'status',
      label: 'Status',
      render: (t) => (
        <StatusBadge status={t.isLive ? 'live' : t.isStale ? 'stale' : t.displayStatus} />
      ),
    },
    { key: 'started', label: 'Started', render: (t) => fmtDateTime(t.startedAt) },
    { key: 'location', label: 'Last location', render: (t) => fmtDateTime(t.lastLocationAt) },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Live trips"
        description="Trip tracking from passenger mobile sessions. Stale location means not live."
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
            <EmptyState title="Trip detail" description="Select a trip to inspect passenger, cover, and last known location." />
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
