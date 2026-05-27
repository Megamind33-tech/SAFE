import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardUser, dashboardUsers, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  DataTable,
  DetailPanel,
  EmptyState,
  ErrorCard,
  LoadingBlock,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dashboardUsers(token, search)
      .then((d) => setUsers(d.users || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, search]);

  async function openUser(id) {
    if (!token) return;
    try {
      const data = await dashboardUser(token, id);
      setDetail(data.user);
    } catch (e) {
      setError(e.message);
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (u) => u.fullName || '—' },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'covers', label: 'Covers', render: (u) => u.coverCount },
    { key: 'claims', label: 'Claims', render: (u) => u.claimCount },
    {
      key: 'status',
      label: 'Status',
      render: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Passengers"
        description="Passenger accounts with masked phone numbers. Select a row for full activity."
      />

      {error ? <ErrorCard message={error} /> : null}

      <SearchInput value={search} onChange={setSearch} placeholder="Search name or phone…" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={users} onRowClick={(u) => openUser(u.id)} emptyTitle="No passengers found" />}
        </Card>

        {!detail ? (
          <Card>
            <EmptyState title="Passenger detail" description="Select a passenger to view covers, claims, and support history." />
          </Card>
        ) : (
          <DetailPanel title={detail.fullName || 'Passenger'} onClose={() => setDetail(null)}>
            <div className="text-sm space-y-2">
              <div>Phone: {detail.phone || '—'}</div>
              <div>Email: {detail.email || '—'}</div>
              <div>Joined: {fmtDateTime(detail.createdAt)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-slate-400">Covers</div><div className="font-black text-lg">{detail.counts.covers}</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-slate-400">Claims</div><div className="font-black text-lg">{detail.counts.claims}</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-slate-400">Payment methods</div><div className="font-black text-lg">{detail.counts.paymentMethods}</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="text-slate-400">QR scans</div><div className="font-black text-lg">{detail.counts.qrScans}</div></div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Recent covers</div>
              {detail.covers.length === 0 ? (
                <p className="text-xs text-slate-500">None</p>
              ) : (
                <ul className="text-xs space-y-1">
                  {detail.covers.slice(0, 5).map((c) => (
                    <li key={c.id} className="flex justify-between">
                      <Link to={`/covers?selected=${c.id}`} className="font-mono hover:underline">{c.policyId}</Link>
                      <StatusBadge status={c.paymentStatus || c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Support reports</div>
              {detail.supportReports.length === 0 ? (
                <p className="text-xs text-slate-500">None</p>
              ) : (
                <ul className="text-xs space-y-1">
                  {detail.supportReports.slice(0, 5).map((r) => (
                    <li key={r.id}>{r.problemType} · <StatusBadge status={r.status} /></li>
                  ))}
                </ul>
              )}
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
