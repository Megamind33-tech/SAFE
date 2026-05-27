import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { dashboardCover, dashboardCovers, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending payment' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed payment' },
];

export default function CoversPage() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [covers, setCovers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardCovers(token, { status: filter, search })
      .then((d) => setCovers(d.covers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, filter, search]);

  async function openCover(id) {
    if (!token) return;
    const data = await dashboardCover(token, id);
    setDetail(data.cover);
  }

  const columns = [
    { key: 'policy', label: 'Policy', render: (c) => <span className="font-mono text-xs">{c.policyId}</span> },
    { key: 'passenger', label: 'Passenger', render: (c) => c.passenger?.fullName || c.passenger?.phone || '—' },
    { key: 'plan', label: 'Plan', render: (c) => c.planName },
    { key: 'payment', label: 'Payment', render: (c) => <StatusBadge status={c.paymentStatus || 'pending'} /> },
    { key: 'status', label: 'Cover', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'vehicle', label: 'Vehicle', render: (c) => c.vehicle?.plateNumber ?? '—' },
    { key: 'ends', label: 'Ends', render: (c) => <span className="text-xs text-slate-500">{fmtDateTime(c.endsAt)}</span> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Covers & policies" description="Active means paid and not expired. Pending payment never shows as active." />
      {error ? <ErrorCard message={error} /> : null}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search policy, phone, name…" />
        <FilterTabs value={filter} onChange={setFilter} options={FILTERS} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={covers} onRowClick={(c) => openCover(c.id)} emptyTitle="No covers found" />}
        </Card>
        {!detail ? (
          <Card><EmptyState title="Policy detail" description="Select a cover to view passenger, payment, and vehicle links." /></Card>
        ) : (
          <DetailPanel title={detail.policyId} onClose={() => setDetail(null)}>
            <div className="text-sm space-y-2">
              <div>Plan: {detail.planName}</div>
              <div className="flex gap-2"><StatusBadge status={detail.status} /><StatusBadge status={detail.paymentStatus} /></div>
              <div>Passenger: {detail.passenger?.fullName || detail.passenger?.phone || '—'}</div>
              <div>Vehicle: {detail.vehicle?.plateNumber || '—'}</div>
              <div>Route: {detail.route ? `${detail.route.origin} → ${detail.route.destination}` : '—'}</div>
              <div>Starts: {fmtDateTime(detail.startsAt)}</div>
              <div>Ends: {fmtDateTime(detail.endsAt)}</div>
              <div>Amount: K{detail.amount}</div>
              {detail.paymentId ? <div className="text-xs font-mono">Payment: {detail.paymentId}</div> : null}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
