import React, { useEffect, useState } from 'react';
import { dashboardMetrics, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Users,
  Shield,
  ShieldOff,
  CheckCircle,
  XCircle,
  DollarSign,
  Banknote,
  AlertTriangle,
  BarChart3,
} from 'lucide-react';

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)] hover:shadow-[0_10px_30px_rgba(2,6,23,0.06)] transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-safe-ink">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardMetrics(token)
      .then((data) => setMetrics(data.metrics ?? null))
      .catch((e) => setError(e?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) => (v != null ? String(v) : '—');
  const fmtK = (v) => (v != null ? `K${Number(v).toLocaleString()}` : '—');

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Analytics</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Key performance metrics across the platform.</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-safe-ink animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading analytics…</span>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <StatCard
            label="Total Passengers"
            value={fmt(metrics?.totalPassengers)}
            icon={Users}
            colorClass="bg-slate-100 text-safe-ink"
          />
          <StatCard
            label="Total Covers"
            value={fmt(metrics?.totalCovers)}
            icon={Shield}
            colorClass="bg-emerald-50 text-emerald-700 border border-emerald-100"
          />
          <StatCard
            label="Expired Covers"
            value={fmt(metrics?.expiredCovers)}
            icon={ShieldOff}
            colorClass="bg-slate-50 text-slate-500 border border-slate-200"
          />
          <StatCard
            label="Claims Approved"
            value={fmt(metrics?.claimsApproved)}
            icon={CheckCircle}
            colorClass="bg-emerald-50 text-emerald-700 border border-emerald-100"
          />
          <StatCard
            label="Claims Rejected"
            value={fmt(metrics?.claimsRejected)}
            icon={XCircle}
            colorClass="bg-red-50 text-red-700 border border-red-100"
          />
          <StatCard
            label="Total Revenue"
            value={fmtK(metrics?.totalRevenue)}
            icon={DollarSign}
            colorClass="bg-safe-electric/20 text-safe-ink border border-safe-electric/30"
          />
          <StatCard
            label="Total Payouts"
            value={fmtK(metrics?.totalPayouts)}
            icon={Banknote}
            colorClass="bg-blue-50 text-blue-700 border border-blue-100"
          />
        </section>
      )}
    </div>
  );
}
