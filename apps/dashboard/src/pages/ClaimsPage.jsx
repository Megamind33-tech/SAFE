import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  dashboardClaimDetail,
  dashboardClaims,
  loadDashboardToken,
  updateClaimStatus,
} from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorCard,
  FilterTabs,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'needs_action', label: 'Needs action' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'paid', label: 'Paid' },
];

export default function ClaimsPage() {
  const [searchParams] = useSearchParams();
  const [claims, setClaims] = useState([]);
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(searchParams.get('selected') || null);
  const [tab, setTab] = useState(searchParams.get('status') || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [documentsMetadataOnly, setDocumentsMetadataOnly] = useState(true);
  const token = loadDashboardToken();
  const { can } = useDashboardSession();

  const statusActions = [
    { status: 'under_review', permission: 'claims.update_status' },
    { status: 'needs_action', permission: 'claims.update_status' },
    { status: 'approved', permission: 'claims.approve' },
    { status: 'rejected', permission: 'claims.reject' },
    { status: 'paid', permission: 'claims.mark_paid' },
  ].filter((a) => can(a.permission));

  async function loadClaims() {
    if (!token) return;
    setLoading(true);
    try {
      const status = tab === 'all' ? undefined : tab;
      const data = await dashboardClaims(token, status);
      setClaims(data.claims || []);
      setDocumentsMetadataOnly(Boolean(data.documentsMetadataOnly));
      setError('');
      if (selectedId) openClaim(selectedId);
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

  const columns = [
    { key: 'ref', label: 'Reference', render: (c) => <span className="font-mono text-xs">{c.reference}</span> },
    { key: 'passenger', label: 'Passenger', render: (c) => c.passengerUser?.passengerProfile?.fullName || c.passengerUser?.phone || '—' },
    { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
    { key: 'filed', label: 'Filed', render: (c) => <span className="text-xs text-slate-500">{fmtDateTime(c.createdAt)}</span> },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Claims queue"
        description="Admin status changes create timeline events. Paid requires approved first."
        actions={
          <button type="button" onClick={loadClaims} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">Refresh</button>
        }
      />

      {error ? <ErrorCard message={error} /> : null}
      {documentsMetadataOnly ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Document upload storage is not connected — claim documents show metadata only until blob storage is configured.
        </div>
      ) : null}

      <FilterTabs value={tab} onChange={setTab} options={STATUS_TABS} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={claims} onRowClick={(c) => openClaim(c.id)} emptyTitle="No claims in this queue" />}
        </Card>

        {!detail ? (
          <Card><EmptyState title="Claim detail" description="Select a claim for timeline, documents metadata, and status actions." /></Card>
        ) : (
          <DetailPanel title={detail.reference}>
            <StatusBadge status={detail.status} />
            <div className="text-sm text-slate-700">{detail.description}</div>
            <div className="text-xs text-slate-500 space-y-1">
              <div>Incident: {fmtDateTime(detail.incidentAt)}</div>
              <div>Location: {detail.location || '—'}</div>
              <div>Police ref: {detail.policeReference || '—'}</div>
              <div>Medical ref: {detail.medicalReference || '—'}</div>
            </div>
            {detail.payout ? (
              <div className="text-xs">Payout: K{detail.payout.amount} · <StatusBadge status={detail.payout.status} /></div>
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
                  <li key={e.id}><strong>{e.title}</strong> — {fmtDateTime(e.createdAt)}</li>
                ))}
              </ul>
            </div>
            {statusActions.length ? (
              <div className="flex flex-wrap gap-2 pt-2">
                {statusActions.map(({ status }) => (
                  <button
                    key={status}
                    type="button"
                    disabled={busy}
                    onClick={() => patchStatus(status)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-black uppercase disabled:opacity-50"
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 pt-2">Your role cannot change claim status.</p>
            )}
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
