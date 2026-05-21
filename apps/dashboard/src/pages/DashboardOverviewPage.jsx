import React, { useEffect, useState } from 'react';
import { dashboardMetrics, loadDashboardToken } from '../api/dashboardApi.js';

function KPI({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black tracking-tight text-safe-ink">{value}</div>
      {sub ? <div className="mt-2 text-xs font-semibold text-slate-500">{sub}</div> : null}
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) return;
    dashboardMetrics(token)
      .then((data) => setMetrics(data.metrics ?? null))
      .catch((e) => setError(e?.message || 'Failed to load metrics'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Dashboard Overview</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Operational snapshot (partners, claims, coverage).</div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Users" value={metrics ? String(metrics.users) : '—'} sub="All roles" />
        <KPI label="Active Covers" value={metrics ? String(metrics.activeCovers) : '—'} sub="Platform-wide" />
        <KPI label="Claims Pending" value={metrics ? String(metrics.claimsPending) : '—'} sub="Submitted + processing" />
        <KPI label="Fraud Flags" value={metrics ? String(metrics.fraudFlags) : '—'} sub="Queue size" />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black text-safe-ink">Zambia Operations Map</div>
              <div className="text-xs font-semibold text-slate-500">Heat + ride density (placeholder)</div>
            </div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Live</div>
          </div>
          <div className="mt-4 h-64 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-500 text-sm font-semibold">
            Map panel
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
          <div className="text-sm font-black text-safe-ink">QR Scans vs Purchases</div>
          <div className="text-xs font-semibold text-slate-500">Conversion (placeholder)</div>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Scans</span>
                <span>12,840</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-[72%] bg-safe-ink"></div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Purchases</span>
                <span>9,210</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full w-[52%] bg-safe-electric"></div>
              </div>
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Target: improve checkout completion with faster mobile flows.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
