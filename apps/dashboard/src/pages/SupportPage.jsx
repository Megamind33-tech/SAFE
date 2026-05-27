import React, { useEffect, useState } from 'react';
import { dashboardSupportReports, loadDashboardToken, updateSupportReport } from '../api/dashboardApi.js';

const STATUSES = ['', 'submitted', 'open', 'in_progress', 'resolved'];

function fmt(iso) {
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SupportPage() {
  const [filter, setFilter] = useState('');
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  function load() {
    if (!token) return;
    setLoading(true);
    dashboardSupportReports(token, filter || undefined)
      .then((d) => setReports(d.reports || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [token, filter]);

  async function setStatus(id, status) {
    if (!token) return;
    try {
      await updateSupportReport(token, id, { status });
      load();
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-black text-safe-ink">Support reports</h1>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${filter === s ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200'}`}
          >
            {s || 'all'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reports.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelected(r)} className="w-full text-left px-4 py-3 hover:bg-slate-50">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-sm">{r.problemType}</span>
                      <span className="text-[10px] uppercase font-black text-slate-500">{r.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{fmt(r.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a report to view message and update status.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-sm"><strong>Type:</strong> {selected.problemType}</div>
              <div className="text-sm"><strong>User:</strong> {selected.user?.fullName || selected.user?.phone || selected.user?.id}</div>
              <div className="text-sm whitespace-pre-wrap rounded-xl bg-slate-50 p-3 border border-slate-100">{selected.message}</div>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved'].map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(selected.id, s)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold capitalize">
                    Mark {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
