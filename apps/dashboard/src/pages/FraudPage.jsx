import React, { useEffect, useState } from 'react';
import { dashboardFraudFlags, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  ErrorCard,
  LoadingBlock,
  MetricCard,
  PageHeader,
  SearchInput,
} from '../components/admin/ui.jsx';
import { fmtDateTime, filterRows } from '../lib/format.js';

const SEVERITY_CLASSES = {
  critical: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-slate-100 text-slate-700',
};

function SeverityBadge({ severity }) {
  const cls = SEVERITY_CLASSES[severity] ?? 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {severity ?? 'unknown'}
    </span>
  );
}

const COLUMNS = [
  {
    key: 'severity',
    label: 'Severity',
    render: (r) => <SeverityBadge severity={r.severity} />,
  },
  { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' },
  {
    key: 'passenger',
    label: 'Passenger',
    render: (r) => r.passengerName || r.passengerPhone || (r.userId ? `…${r.userId.slice(-6)}` : '—'),
  },
  {
    key: 'claimId',
    label: 'Claim ref',
    render: (r) => (r.claimId ? `…${r.claimId.slice(-8)}` : '—'),
  },
  { key: 'createdAt', label: 'Flagged', render: (r) => fmtDateTime(r.createdAt) },
];

export default function FraudPage() {
  const [flags, setFlags] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    dashboardFraudFlags(token)
      .then((d) => {
        setFlags(d.flags || []);
        setStats(d.stats ?? null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const visible = filterRows(flags, search, ['reason', 'passengerName', 'passengerPhone', 'severity']);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Regulatory Center"
        description="Fraud flags, compliance score, and reversed payment monitoring."
      />

      {loading ? <LoadingBlock /> : null}
      {error ? <ErrorCard message={error} /> : null}

      {stats && !loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard label="Total flags" value={stats.totalFlags} />
          <MetricCard
            label="Critical / High"
            value={stats.criticalFlags}
            sub="Requiring immediate review"
          />
          <MetricCard
            label="Compliance rate"
            value={`${stats.complianceRate}%`}
            sub="Covers without reversal"
          />
          <MetricCard label="Total covers issued" value={stats.totalCoversIssued} />
          <MetricCard label="Active covers" value={stats.activeCovers} />
          <MetricCard label="Reversed payments" value={stats.reversedPayments} />
        </div>
      ) : null}

      {!loading ? (
        <Card padding={false}>
          <div className="px-4 pt-4 pb-2">
            <div className="text-sm font-black text-safe-ink mb-3">Fraud flags</div>
            <SearchInput value={search} onChange={setSearch} placeholder="Search flags…" />
          </div>
          <DataTable
            columns={COLUMNS}
            rows={visible}
            emptyTitle="No fraud flags recorded"
          />
        </Card>
      ) : null}
    </div>
  );
}
