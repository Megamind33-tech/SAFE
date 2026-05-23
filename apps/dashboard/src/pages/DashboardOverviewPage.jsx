import React, { useEffect, useState } from 'react';
import { dashboardMetrics, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Users,
  ShieldCheck,
  DollarSign,
  FileText,
  Truck,
  QrCode,
  ShieldPlus,
  CalendarCheck,
  AlertTriangle,
  CreditCard,
  CheckCircle,
  XCircle,
  Flag,
  Banknote,
} from 'lucide-react';

function KPI({ label, value, icon: Icon, colorClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] hover:shadow-[0_10px_30px_rgba(2,6,23,0.06)] transition-all flex items-start justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-2 text-3xl font-black tracking-tight text-safe-ink">{value}</div>
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) {
      setLoading(false);
      return;
    }
    dashboardMetrics(token)
      .then((data) => setMetrics(data.metrics ?? null))
      .catch((e) => setError(e?.message || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (v) => (v != null ? String(v) : '—');
  const fmtK = (v) => (v != null ? `K${Number(v).toLocaleString()}` : '—');

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Dashboard Overview</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI
          label="Total Users"
          value={fmt(metrics?.totalUsers)}
          icon={Users}
          colorClass="bg-slate-100 text-safe-ink"
        />
        <KPI
          label="Active Covers"
          value={fmt(metrics?.activeCovers)}
          icon={ShieldCheck}
          colorClass="bg-emerald-50 text-emerald-700 border border-emerald-100"
        />
        <KPI
          label="Total Revenue"
          value={fmtK(metrics?.totalRevenue)}
          icon={DollarSign}
          colorClass="bg-safe-electric/20 text-safe-ink border border-safe-electric/30"
        />
        <KPI
          label="Pending Claims"
          value={fmt(metrics?.claimsPending)}
          icon={FileText}
          colorClass="bg-amber-50 text-amber-700 border border-amber-100"
        />
        <KPI
          label="Total Vehicles"
          value={fmt(metrics?.totalVehicles)}
          icon={Truck}
          colorClass="bg-blue-50 text-blue-700 border border-blue-100"
        />
        <KPI
          label="QR Scans"
          value={fmt(metrics?.totalQRScans)}
          icon={QrCode}
          colorClass="bg-violet-50 text-violet-700 border border-violet-100"
        />
        <KPI
          label="Covers Today"
          value={fmt(metrics?.coversToday)}
          icon={ShieldPlus}
          colorClass="bg-teal-50 text-teal-700 border border-teal-100"
        />
        <KPI
          label="Covers This Week"
          value={fmt(metrics?.coversThisWeek)}
          icon={CalendarCheck}
          colorClass="bg-indigo-50 text-indigo-700 border border-indigo-100"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
        <div className="text-sm font-black text-safe-ink flex items-center gap-2 mb-4">
          <CreditCard size={16} />
          Payment Stats
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Payments</div>
            <div className="mt-1 text-2xl font-black text-safe-ink">{fmt(metrics?.payments)}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center justify-center gap-1">
              <CheckCircle size={12} /> Successful
            </div>
            <div className="mt-1 text-2xl font-black text-emerald-700">{fmt(metrics?.successfulPayments)}</div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center justify-center gap-1">
              <XCircle size={12} /> Failed
            </div>
            <div className="mt-1 text-2xl font-black text-red-700">{fmt(metrics?.failedPayments)}</div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)] flex items-start justify-between">
          <div>
            <div className="text-sm font-black text-safe-ink flex items-center gap-2">
              <Flag size={16} className="text-rose-600" />
              Fraud Flags
            </div>
            <div className="mt-3 text-4xl font-black text-safe-ink">{fmt(metrics?.fraudFlags)}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Total flagged incidents</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)] flex items-start justify-between">
          <div>
            <div className="text-sm font-black text-safe-ink flex items-center gap-2">
              <Banknote size={16} className="text-emerald-600" />
              Total Payouts
            </div>
            <div className="mt-3 text-4xl font-black text-safe-ink">{fmtK(metrics?.totalPayouts)}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">Claims paid out</div>
          </div>
        </div>
      </section>
    </div>
  );
}
