import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { dashboardSupportReports, loadDashboardToken, updateSupportReport } from '../api/dashboardApi.js';
import {
  Card,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const STATUSES = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'submitted', label: 'Submitted' },
];

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('status') || '');
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState('');
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

  async function saveNote() {
    if (!token || !selected) return;
    try {
      const data = await updateSupportReport(token, selected.id, { adminNote });
      setSelected(data.report);
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title="Support reports" description="Passenger support issues with persisted status updates." />
      {error ? <ErrorCard message={error} /> : null}
      <FilterTabs value={filter} onChange={setFilter} options={STATUSES} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding={false}>
          {loading ? (
            <LoadingBlock />
          ) : reports.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">No support reports yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reports.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => { setSelected(r); setAdminNote(r.adminNote || ''); }} className="w-full text-left px-4 py-3 hover:bg-slate-50">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-sm">{r.problemType}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{fmtDateTime(r.createdAt)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          {!selected ? (
            <p className="text-sm text-slate-500">Select a report to view message and update status.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-sm"><strong>Type:</strong> {selected.problemType}</div>
              <div className="text-sm">
                <strong>User:</strong>{' '}
                {selected.user?.fullName || selected.user?.phone || selected.user?.id}
                {selected.user?.id ? (
                  <> · <Link to={`/users`} className="text-safe-green font-bold hover:underline">View passengers</Link></>
                ) : null}
              </div>
              <div className="text-sm whitespace-pre-wrap rounded-xl bg-slate-50 p-3 border border-slate-100">{selected.message}</div>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Admin note (saved to backend)"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm min-h-[80px]"
              />
              <button type="button" onClick={saveNote} className="rounded-lg bg-safe-ink text-white px-3 py-2 text-xs font-bold">Save note</button>
              <div className="flex flex-wrap gap-2">
                {['open', 'in_progress', 'resolved'].map((s) => (
                  <button key={s} type="button" onClick={() => setStatus(selected.id, s)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold capitalize">
                    Mark {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
