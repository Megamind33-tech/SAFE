import React, { useEffect, useMemo, useState } from 'react';
import {
  dashboardClaimDetail,
  dashboardClaims,
  loadDashboardToken,
  updateClaimStatus,
} from '../api/dashboardApi.js';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under review' },
  { id: 'needs_action', label: 'Needs action' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'paid', label: 'Paid' },
];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [documentsMetadataOnly, setDocumentsMetadataOnly] = useState(true);
  const token = loadDashboardToken();

  async function loadClaims() {
    if (!token) return;
    setLoading(true);
    try {
      const status = tab === 'all' ? undefined : tab;
      const data = await dashboardClaims(token, status);
      setClaims(data.claims || []);
      setDocumentsMetadataOnly(Boolean(data.documentsMetadataOnly));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClaims();
  }, [token, tab]);

  async function openClaim(id) {
    setSelectedId(id);
    if (!token) return;
    try {
      const data = await dashboardClaimDetail(token, id);
      setDetail(data.claim);
    } catch (e) {
      setError(e.message);
    }
  }

  async function patchStatus(status, note) {
    if (!token || !selectedId) return;
    setBusy(true);
    try {
      const data = await updateClaimStatus(token, selectedId, { status, note });
      setDetail(data.claim);
      await loadClaims();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => claims, [claims]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-safe-ink">Claims queue</h1>
        <button type="button" onClick={loadClaims} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">Refresh</button>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {documentsMetadataOnly ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Document upload storage is not connected — claim documents show metadata only until SAFE_CLAIMS_UPLOAD_ENABLED is wired to storage.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${tab === t.id ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className={`xl:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-x-auto ${detail ? '' : ''}`}>
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading claims…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Passenger</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Filed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openClaim(c.id)}
                    className={`border-t cursor-pointer hover:bg-slate-50 ${selectedId === c.id ? 'bg-safe-ink/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs">{c.reference}</td>
                    <td className="px-4 py-3">{c.passengerUser?.passengerProfile?.fullName || c.passengerUser?.phone || '—'}</td>
                    <td className="px-4 py-3 uppercase text-[10px] font-black">{c.status}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmt(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          {!detail ? (
            <p className="text-sm text-slate-500">Select a claim for detail, timeline, and status updates.</p>
          ) : (
            <>
              <div>
                <div className="text-[10px] uppercase text-slate-400">Reference</div>
                <div className="font-mono font-bold">{detail.reference}</div>
                <div className="text-xs uppercase font-black mt-1">{detail.status}</div>
              </div>
              <div className="text-sm text-slate-700">{detail.description}</div>
              <div className="text-xs text-slate-500">Location: {detail.location || '—'}</div>
              {detail.payout ? (
                <div className="text-xs">Payout: K{detail.payout.amount} · {detail.payout.status}</div>
              ) : null}

              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Documents (metadata)</div>
                <ul className="text-xs space-y-1">
                  {(detail.documents || []).length === 0 ? <li className="text-slate-400">No document records</li> : null}
                  {(detail.documents || []).map((d) => (
                    <li key={d.id}>{d.type}: {d.filename} ({d.status})</li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Timeline</div>
                <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
                  {(detail.timeline || []).map((e) => (
                    <li key={e.id}><strong>{e.title}</strong> — {fmt(e.createdAt)}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {['under_review', 'needs_action', 'approved', 'rejected', 'paid'].map((s) => (
                  <button key={s} type="button" disabled={busy} onClick={() => patchStatus(s)} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase disabled:opacity-50">
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
