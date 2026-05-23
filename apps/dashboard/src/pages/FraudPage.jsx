import React, { useEffect, useState } from 'react';
import { dashboardFraudFlags, loadDashboardToken } from '../api/dashboardApi.js';
import { ShieldAlert, AlertTriangle, Inbox } from 'lucide-react';

const severityStyle = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-blue-50 border-blue-200 text-blue-700',
};

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function FraudPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardFraudFlags(token)
      .then((data) => setFlags(data.flags ?? []))
      .catch((e) => setError(e?.message || 'Failed to load fraud flags'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Fraud Flags</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Flagged suspicious activity and fraud incidents.</div>
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
          <span className="text-xs font-bold uppercase tracking-wider">Loading fraud flags…</span>
        </div>
      ) : flags.length === 0 ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <ShieldAlert size={36} />
          <span className="text-sm font-bold">No fraud flags detected</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3.5 px-5">Time</th>
                  <th className="py-3.5 px-5">Severity</th>
                  <th className="py-3.5 px-5">Reason</th>
                  <th className="py-3.5 px-5">User</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {flags.map((f) => {
                  const severity = f.severity?.toLowerCase() || '—';
                  const badge = severityStyle[severity] || 'bg-slate-50 border-slate-200 text-slate-600';
                  const userName = f.user?.passengerProfile?.fullName || f.user?.driverProfile?.fullName || f.user?.phone || f.user?.email || '—';

                  return (
                    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtTime(f.createdAt)}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge}`}>
                          {severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-semibold text-safe-ink">{f.reason || '—'}</td>
                      <td className="py-3.5 px-5 font-black text-safe-ink">{userName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            Showing {flags.length} flag{flags.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
