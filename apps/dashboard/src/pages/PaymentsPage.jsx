import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  dashboardPayment,
  dashboardPayments,
  dashboardPaymentsConfig,
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
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
];

export default function PaymentsPage() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');
  const [payments, setPayments] = useState([]);
  const [detail, setDetail] = useState(null);
  const [config, setConfig] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      dashboardPayments(token, { status: filter || undefined, search }),
      dashboardPaymentsConfig(token),
    ])
      .then(([payRes, cfgRes]) => {
        setPayments(payRes.payments || []);
        setNote(payRes.reconciliationNote || '');
        setConfig(cfgRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, filter, search]);

  async function openPayment(id) {
    if (!token) return;
    const data = await dashboardPayment(token, id);
    setDetail(data.payment);
  }

  const columns = [
    { key: 'id', label: 'ID', render: (p) => <span className="font-mono text-xs">{p.id.slice(-8)}</span> },
    { key: 'passenger', label: 'Passenger', render: (p) => p.passenger?.fullName || p.passenger?.phone || '—' },
    { key: 'amount', label: 'Amount', render: (p) => <span className="font-bold">K{p.amount}</span> },
    { key: 'method', label: 'Method', render: (p) => p.method },
    { key: 'status', label: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { key: 'vehicle', label: 'Vehicle', render: (p) => p.vehiclePlate ?? '—' },
    { key: 'created', label: 'Created', render: (p) => <span className="text-xs text-slate-500">{fmtDateTime(p.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader title="Payments" description="Payment truth comes from the backend gateway or webhook reconciliation." />

      {config ? (
        <Card className="text-sm space-y-1">
          <div><strong>Gateway:</strong> {config.paymentGatewayEnabled ? 'Enabled' : 'Not connected'}</div>
          <div><strong>Simulate success:</strong> {config.paymentSimulateSuccess ? 'On (dev only)' : 'Off'}</div>
          <div className="text-xs text-slate-500">{config.webhook?.note}</div>
          <div className="text-xs font-mono">Webhook: POST /api/shared/webhooks/payment</div>
        </Card>
      ) : null}

      {note ? <p className="text-xs text-slate-500">{note}</p> : null}
      {error ? <ErrorCard message={error} /> : null}

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference, policy, phone…" />
        <FilterTabs value={filter} onChange={setFilter} options={FILTERS} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={payments} onRowClick={(p) => openPayment(p.id)} emptyTitle="No payments found" />}
        </Card>
        {!detail ? (
          <Card><EmptyState title="Payment detail" description="Select a payment to view linked cover and reconciliation info." /></Card>
        ) : (
          <DetailPanel title={`Payment ${detail.id.slice(-8)}`} onClose={() => setDetail(null)}>
            <div className="text-sm space-y-2">
              <StatusBadge status={detail.status} />
              <div>Amount: K{detail.amount} {detail.currency}</div>
              <div>Method: {detail.method}</div>
              <div>Reference: {detail.reference || '—'}</div>
              <div>Cover: {detail.coverId}</div>
              <div>Passenger: {detail.passenger?.fullName || detail.passenger?.phone || '—'}</div>
              <div>Vehicle: {detail.vehiclePlate || '—'}</div>
              <div>Created: {fmtDateTime(detail.createdAt)}</div>
              <div>Updated: {fmtDateTime(detail.updatedAt)}</div>
              {detail.webhook ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  {detail.webhook.note}
                </div>
              ) : null}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
