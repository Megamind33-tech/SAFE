import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardQrScans, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

export default function QrScansPage() {
  const [scans, setScans] = useState([]);
  const [resultCounts, setResultCounts] = useState({});
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardQrScans(token, { result: resultFilter || undefined, search })
      .then((d) => {
        setScans(d.scans || []);
        setResultCounts(d.resultCounts || {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, resultFilter, search]);

  const columns = [
    { key: 'time', label: 'Time', render: (s) => fmtDateTime(s.scannedAt) },
    { key: 'result', label: 'Result', render: (s) => <StatusBadge status={s.result} /> },
    {
      key: 'vehicle',
      label: 'Vehicle',
      render: (s) =>
        s.vehicleId ? (
          <Link to={`/vehicles?selected=${s.vehicleId}`} className="font-bold hover:underline">
            {s.vehiclePlate || s.vehicleId.slice(-6)}
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'passenger',
      label: 'Passenger',
      render: (s) => s.passenger?.fullName || s.passenger?.phone || (s.userId ? s.userId.slice(-6) : '—'),
    },
    {
      key: 'agent',
      label: 'Source',
      render: (s) => <span className="text-xs text-slate-500 truncate max-w-[180px] inline-block">{s.userAgent || '—'}</span>,
    },
    {
      key: 'location',
      label: 'Location',
      render: (s) =>
        s.location ? `${s.location.lat.toFixed(4)}, ${s.location.lng.toFixed(4)}` : '—',
    },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="QR scan logs"
        description="Audit trail from real QR verification events."
      />

      {error ? <ErrorCard message={error} /> : null}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search code, plate, result…" />
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(resultCounts).map(([result, count]) => (
            <span key={result} className="rounded-full bg-slate-100 px-3 py-1 font-bold">
              {result}: {count}
            </span>
          ))}
        </div>
      </div>

      <FilterTabs
        value={resultFilter}
        onChange={setResultFilter}
        options={[
          { value: '', label: 'All results' },
          { value: 'verified', label: 'Verified' },
          { value: 'invalid', label: 'Invalid' },
          { value: 'disabled', label: 'Disabled' },
          { value: 'expired', label: 'Expired' },
        ]}
      />

      <Card padding={false}>
        {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={scans} emptyTitle="No scan logs yet" />}
      </Card>
    </div>
  );
}
