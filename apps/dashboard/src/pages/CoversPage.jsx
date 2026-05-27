import React, { useEffect, useState } from 'react';
import { dashboardCovers, loadDashboardToken } from '../api/dashboardApi.js';

const FILTERS = ['all', 'active', 'pending', 'expired', 'failed'];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CoversPage() {
  const [filter, setFilter] = useState('all');
  const [covers, setCovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardCovers(token, filter)
      .then((d) => setCovers(d.covers || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, filter]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-black text-safe-ink">Covers & policies</h1>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-2 text-xs font-black capitalize ${filter === f ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading covers…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Policy</th>
                <th className="px-4 py-3 text-left">Passenger</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Ends</th>
              </tr>
            </thead>
            <tbody>
              {covers.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{c.policyId}</td>
                  <td className="px-4 py-3">{c.passenger?.fullName || c.passenger?.phone || '—'}</td>
                  <td className="px-4 py-3">{c.planName}</td>
                  <td className="px-4 py-3"><span className="uppercase text-[10px] font-black">{c.paymentStatus ?? '—'}</span></td>
                  <td className="px-4 py-3">{c.vehicle?.plateNumber ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(c.endsAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
