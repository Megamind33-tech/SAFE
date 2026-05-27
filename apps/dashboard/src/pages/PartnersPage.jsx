import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardPartner, dashboardPartners, loadDashboardToken } from '../api/dashboardApi.js';
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
import { filterRows } from '../lib/format.js';

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [detail, setDetail] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    dashboardPartners(token)
      .then((d) => setPartners(d.partners || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function openPartner(id) {
    if (!token) return;
    const data = await dashboardPartner(token, id);
    setDetail(data.partner);
  }

  const rows = filterRows(partners, search, ['name']);
  const columns = [
    { key: 'name', label: 'Partner', render: (p) => <span className="font-bold">{p.name}</span> },
    { key: 'vehicles', label: 'Vehicles', render: (p) => p.vehicleCount },
    { key: 'drivers', label: 'Drivers', render: (p) => p.driverCount },
    { key: 'qr', label: 'QR codes', render: (p) => p.qrCodeCount },
  ];

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <PageHeader title="Transport partners" description="Fleet operators and linked vehicle performance." />
      {error ? <ErrorCard message={error} /> : null}
      <SearchInput value={search} onChange={setSearch} placeholder="Search partner name…" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card padding={false}>
          {loading ? <LoadingBlock /> : <DataTable columns={columns} rows={rows} onRowClick={(p) => openPartner(p.id)} emptyTitle="No partners found" />}
        </Card>

        {!detail ? (
          <Card><EmptyState title="Partner detail" description="Select a partner to view fleet, covers, and scan counts." /></Card>
        ) : (
          <DetailPanel title={detail.name}>
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              Partner earnings are not connected yet. Counts below are from real cover and scan data only.
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Active covers</div><div className="text-xl font-black">{detail.stats?.activeCovers ?? 0}</div></div>
              <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Verified scans</div><div className="text-xl font-black">{detail.stats?.verifiedScans ?? 0}</div></div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Vehicles</div>
              <ul className="text-xs space-y-1 max-h-48 overflow-y-auto">
                {(detail.vehicles || []).map((v) => (
                  <li key={v.id} className="flex justify-between border-b border-slate-100 py-1">
                    <Link to={`/vehicles?selected=${v.id}`} className="font-bold hover:underline">{v.plateNumber}</Link>
                    <StatusBadge status={v.qrStatus || 'none'} />
                  </li>
                ))}
              </ul>
            </div>
          </DetailPanel>
        )}
      </div>
    </div>
  );
}
