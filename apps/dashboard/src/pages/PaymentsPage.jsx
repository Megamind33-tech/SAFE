import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminOverridePayment,
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
  { value: 'reversed', label: 'Reversed' },
  { value: 'disputed', label: 'Disputed' },
];

const OVERRIDE_CATEGORIES = [
  { value: 'payment_confirmed_offline', label: 'Payment confirmed offline' },
  { value: 'provider_webhook_failed', label: 'Provider webhook failed to deliver' },
  { value: 'dispute_resolved', label: 'Dispute resolved in our favour' },
  { value: 'testing_or_demo', label: 'Testing / demo environment' },
  { value: 'other', label: 'Other (explain in reason)' },
];

function FraudAlertBadge({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  const labels = {
    cover_active_without_confirmed_payment: 'Cover active — no confirmed payment',
    reversed_payment_linked_to_active_cover: 'Reversed payment — cover still active',
  };
  return (
    <div className="space-y-1">
      {alerts.map((a) => (
        <span key={a} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
          ⚠ {labels[a] ?? a}
        </span>
      ))}
    </div>
  );
}

function ActivationSourceBadge({ source }) {
  if (!source) return null;
  const styles = {
    provider_webhook: 'bg-green-100 text-green-800 border-green-200',
    simulate_dev: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    manual_admin_override: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  const labels = {
    provider_webhook: 'Provider confirmed',
    simulate_dev: 'Dev simulation',
    manual_admin_override: 'Manual admin override',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${styles[source] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {labels[source] ?? source}
    </span>
  );
}

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
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideCategory, setOverrideCategory] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');
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
    setOverrideOpen(false);
    setOverrideReason('');
    setOverrideCategory('');
    setOverrideError('');
  }

  async function submitOverride() {
    if (!token || !detail) return;
    setOverrideLoading(true);
    setOverrideError('');
    try {
      await adminOverridePayment(token, detail.id, { reason: overrideReason, category: overrideCategory });
      const refreshed = await dashboardPayment(token, detail.id);
      setDetail(refreshed.payment);
      setOverrideOpen(false);
      setOverrideReason('');
      setOverrideCategory('');
      const listData = await dashboardPayments(token, { status: filter || undefined, search });
      setPayments(listData.payments || []);
    } catch (e) {
      setOverrideError(e.message);
    } finally {
      setOverrideLoading(false);
    }
  }

  const columns = [
    { key: 'id', label: 'ID', render: (p) => <span className="font-mono text-xs">{p.id.slice(-8)}</span> },
    { key: 'passenger', label: 'Passenger', render: (p) => p.passenger?.fullName || p.passenger?.phone || '—' },
    { key: 'amount', label: 'Amount', render: (p) => <span className="font-bold">K{p.amount}</span> },
    { key: 'method', label: 'Method', render: (p) => p.method },
    {
      key: 'status', label: 'Status', render: (p) => (
        <div className="flex flex-col gap-0.5">
          <StatusBadge status={p.status} />
          {p.fraudAlerts?.length > 0 && <span className="text-xs text-red-600 font-semibold">⚠ Fraud alert</span>}
        </div>
      ),
    },
    { key: 'vehicle', label: 'Vehicle', render: (p) => p.vehiclePlate ?? '—' },
    { key: 'created', label: 'Created', render: (p) => <span className="text-xs text-slate-500">{fmtDateTime(p.createdAt)}</span> },
  ];

  const canOverride = config?.permissions?.includes?.('payments.admin_override') ?? true;

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
            <div className="text-sm space-y-3">
              <div className="flex flex-wrap gap-2 items-center">
                <StatusBadge status={detail.status} />
                <ActivationSourceBadge source={detail.activationSource} />
              </div>

              <FraudAlertBadge alerts={detail.fraudAlerts} />

              <div className="space-y-1">
                <div>Amount: <strong>K{detail.amount} {detail.currency}</strong></div>
                <div>Method: {detail.method}</div>
                {detail.internalReference && (
                  <div className="font-mono text-xs">Ref: {detail.internalReference}</div>
                )}
                {detail.providerReference && (
                  <div className="font-mono text-xs text-slate-500">Provider: {detail.providerReference}</div>
                )}
                {!detail.internalReference && detail.reference && (
                  <div>Reference: {detail.reference}</div>
                )}
              </div>

              <div className="space-y-1 text-xs text-slate-600">
                <div>Cover: <span className="font-mono">{detail.coverId}</span></div>
                <div>Cover status: <StatusBadge status={detail.coverStatus} /></div>
                <div>Passenger: {detail.passenger?.fullName || detail.passenger?.phone || '—'}</div>
                <div>Vehicle: {detail.vehiclePlate || '—'}</div>
              </div>

              <div className="space-y-0.5 text-xs text-slate-500">
                <div>Created: {fmtDateTime(detail.createdAt)}</div>
                {detail.confirmedAt && <div>Confirmed: {fmtDateTime(detail.confirmedAt)}</div>}
                {detail.reversedAt && <div className="text-red-600">Reversed: {fmtDateTime(detail.reversedAt)}</div>}
                <div>Updated: {fmtDateTime(detail.updatedAt)}</div>
              </div>

              {detail.webhook ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  {detail.webhook.note}
                </div>
              ) : null}

              {detail.coverStatus !== 'active' && detail.status !== 'reversed' && detail.status !== 'disputed' && canOverride && (
                <div className="pt-2 border-t border-slate-100">
                  {!overrideOpen ? (
                    <button
                      onClick={() => setOverrideOpen(true)}
                      className="text-xs px-3 py-1.5 rounded bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 font-semibold"
                    >
                      Manual admin override
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-orange-700">Manual activation override</p>
                      <p className="text-xs text-slate-500">This will activate the cover and mark it as manually overridden. A full audit log entry will be created.</p>
                      <select
                        value={overrideCategory}
                        onChange={(e) => setOverrideCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5"
                      >
                        <option value="">Select reason category…</option>
                        {OVERRIDE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <textarea
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Explain why this override is necessary (min 10 chars)…"
                        rows={3}
                        className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 resize-none"
                      />
                      {overrideError && <p className="text-xs text-red-600">{overrideError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={submitOverride}
                          disabled={overrideLoading || !overrideCategory || overrideReason.length < 10}
                          className="text-xs px-3 py-1.5 rounded bg-orange-600 text-white font-semibold disabled:opacity-50 hover:bg-orange-700"
                        >
                          {overrideLoading ? 'Activating…' : 'Confirm override'}
                        </button>
                        <button
                          onClick={() => { setOverrideOpen(false); setOverrideError(''); }}
                          className="text-xs px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
