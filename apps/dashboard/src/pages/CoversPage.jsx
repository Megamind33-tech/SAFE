import React, { useEffect, useState } from 'react';
import { dashboardCovers, loadDashboardToken } from '../api/dashboardApi.js';
import { Shield, AlertTriangle, Inbox } from 'lucide-react';

const statusStyle = {
  active: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  expired: 'bg-slate-50 border-slate-200 text-slate-500',
  pending_payment: 'bg-amber-50 border-amber-200 text-amber-700',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CoversPage() {
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardCovers(token)
      .then((data) => setCovers(data.covers ?? []))
      .catch((e) => setError(e?.message || 'Failed to load covers'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Trip Covers</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">All issued trip insurance covers.</div>
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
          <span className="text-xs font-bold uppercase tracking-wider">Loading covers…</span>
        </div>
      ) : covers.length === 0 ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Inbox size={36} />
          <span className="text-xs font-bold">No covers found</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3.5 px-5">Policy #</th>
                  <th className="py-3.5 px-5">Passenger</th>
                  <th className="py-3.5 px-5">Plan</th>
                  <th className="py-3.5 px-5">Amount</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5">Route</th>
                  <th className="py-3.5 px-5">Vehicle</th>
                  <th className="py-3.5 px-5">Started</th>
                  <th className="py-3.5 px-5">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {covers.map((c) => {
                  const passenger = c.passengerUser?.passengerProfile?.fullName || c.passengerUser?.phone || '—';
                  const route = c.route ? `${c.route.origin} → ${c.route.destination}` : '—';
                  const vehicle = c.vehicle?.plateNumber || '—';
                  const status = c.status || '—';
                  const badge = statusStyle[status] || 'bg-slate-50 border-slate-200 text-slate-600';

                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5 text-xs font-bold text-safe-ink whitespace-nowrap">{c.policyNumber || '—'}</td>
                      <td className="py-3.5 px-5 font-black text-safe-ink">{passenger}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 capitalize">{c.plan || '—'}</td>
                      <td className="py-3.5 px-5 font-black text-safe-ink whitespace-nowrap">
                        {c.currency || ''} {c.amount != null ? Number(c.amount).toLocaleString() : '—'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge}`}>
                          {status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{route}</td>
                      <td className="py-3.5 px-5 text-xs font-bold text-slate-600 uppercase">{vehicle}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtDate(c.startedAt)}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtDate(c.endsAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            Showing {covers.length} cover{covers.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
