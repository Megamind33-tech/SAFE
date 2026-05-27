import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createVehicle,
  dashboardPartners,
  dashboardVehicleCovers,
  dashboardVehicleQr,
  dashboardVehicleScans,
  dashboardVehicles,
  generateVehicleQr,
  loadDashboardToken,
  regenerateVehicleQr,
  updateVehicle,
  updateVehicleQr,
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
  SearchInput,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

export default function VehiclesPage() {
  const [searchParams] = useSearchParams();
  const [vehicles, setVehicles] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedId, setSelectedId] = useState(searchParams.get('selected') || null);
  const [qrData, setQrData] = useState(null);
  const [scans, setScans] = useState([]);
  const [covers, setCovers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [partnerFilter, setPartnerFilter] = useState('');
  const [qrFilter, setQrFilter] = useState(searchParams.get('qrStatus') || 'all');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const token = loadDashboardToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [vehicleRes, partnerRes] = await Promise.all([
        dashboardVehicles(token, {
          search,
          status: statusFilter,
          partnerId: partnerFilter || undefined,
          qrStatus: qrFilter,
        }),
        dashboardPartners(token),
      ]);
      setVehicles(vehicleRes.vehicles || []);
      setPartners(partnerRes.partners || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, partnerFilter, qrFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  async function openVehicle(id) {
    setSelectedId(id);
    setQrData(null);
    setScans([]);
    setCovers([]);
    if (!token) return;
    try {
      const [qr, scanRes, coverRes] = await Promise.all([
        dashboardVehicleQr(token, id).catch(() => null),
        dashboardVehicleScans(token, id),
        dashboardVehicleCovers(token, id),
      ]);
      setQrData(qr);
      setScans(scanRes.scans || []);
      setCovers(coverRes.covers || []);
    } catch (e) {
      setError(e.message || 'Failed to load vehicle detail');
    }
  }

  async function runQrAction(action) {
    if (!token || !selectedId) return;
    setBusy(true);
    setError('');
    try {
      if (action === 'generate') await generateVehicleQr(token, selectedId);
      else if (action === 'regenerate') await regenerateVehicleQr(token, selectedId);
      else if (action === 'disable' && qrData?.qr?.id) {
        await updateVehicleQr(token, selectedId, { qrId: qrData.qr.id, action: 'disable' });
      }
      const refreshed = await dashboardVehicleQr(token, selectedId);
      setQrData(refreshed);
      const scanRes = await dashboardVehicleScans(token, selectedId);
      setScans(scanRes.scans || []);
      await load();
    } catch (e) {
      setError(e.message || 'QR action failed');
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend() {
    if (!token || !selected) return;
    setBusy(true);
    try {
      await updateVehicle(token, selected.id, { isSuspended: !selected.isSuspended });
      await load();
      setSelectedId(selected.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    if (!token || !newPlate.trim()) return;
    setBusy(true);
    try {
      const res = await createVehicle(token, {
        plateNumber: newPlate.trim(),
        transportPartnerId: partnerFilter || undefined,
      });
      setShowAdd(false);
      setNewPlate('');
      await load();
      if (res.vehicle?.id) openVehicle(res.vehicle.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function copyQrUrl() {
    if (!qrData?.qr?.publicUrl) return;
    navigator.clipboard?.writeText(qrData.qr.publicUrl);
  }

  function downloadSvg() {
    if (!qrData?.qrImageSvg || !qrData?.qr?.code) return;
    const blob = new Blob([qrData.qrImageSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${qrData.qr.code}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPng() {
    if (!qrData?.qrImagePngDataUrl || !qrData?.qr?.code) return;
    const a = document.createElement('a');
    a.href = qrData.qrImagePngDataUrl;
    a.download = `${qrData.qr.code}.png`;
    a.click();
  }

  const columns = useMemo(
    () => [
      { key: 'plate', label: 'Plate', render: (v) => <span className="font-bold">{v.plateNumber}</span> },
      {
        key: 'route',
        label: 'Route',
        render: (v) => (v.route ? `${v.route.origin} → ${v.route.destination}` : '—'),
      },
      { key: 'partner', label: 'Partner', render: (v) => v.partner?.name ?? '—' },
      { key: 'qr', label: 'QR', render: (v) => <span className="font-mono text-xs">{v.qr?.code ?? 'None'}</span> },
      {
        key: 'status',
        label: 'Status',
        render: (v) => <StatusBadge status={v.operationalStatus} />,
      },
      {
        key: 'qrStatus',
        label: 'QR status',
        render: (v) => <StatusBadge status={v.qrStatus} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Fleet · Vehicles"
        description="Manage fleet records, QR codes, and vehicle-linked covers."
        actions={
          <>
            <button type="button" onClick={load} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">
              Refresh
            </button>
            <button type="button" onClick={() => setShowAdd(true)} className="rounded-xl bg-safe-ink px-4 py-2 text-xs font-black text-white">
              Add vehicle
            </button>
          </>
        }
      />

      {error ? <ErrorCard message={error} onRetry={load} /> : null}

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search plate number…" />
        <FilterTabs
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
          ]}
        />
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <FilterTabs
          value={qrFilter}
          onChange={setQrFilter}
          options={[
            { value: 'all', label: 'Any QR' },
            { value: 'active', label: 'QR active' },
            { value: 'disabled', label: 'QR disabled' },
            { value: 'expired', label: 'QR expired' },
            { value: 'none', label: 'No QR' },
          ]}
        />
        <select
          value={partnerFilter}
          onChange={(e) => setPartnerFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
        >
          <option value="">All partners</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" padding={false}>
          {loading ? (
            <LoadingBlock />
          ) : (
            <DataTable columns={columns} rows={vehicles} onRowClick={(v) => openVehicle(v.id)} emptyTitle="No vehicles found" />
          )}
        </Card>

        {!selected ? (
          <Card>
            <EmptyState title="Select a vehicle" description="Choose a row to view QR controls, scans, and covers." />
          </Card>
        ) : (
          <DetailPanel title={selected.plateNumber}>
            <div className="text-xs text-slate-500 space-y-1">
              <div>Partner: {selected.partner?.name ?? 'None'}</div>
              <div>Route: {selected.route ? `${selected.route.origin} → ${selected.route.destination}` : 'Unassigned'}</div>
              <div>Covers: {selected.coverCount}</div>
              <div className="flex gap-2 pt-1">
                <StatusBadge status={selected.operationalStatus} />
                <StatusBadge status={selected.qrStatus} />
              </div>
            </div>

            <button type="button" disabled={busy} onClick={toggleSuspend} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">
              {selected.isSuspended ? 'Activate vehicle' : 'Suspend vehicle'}
            </button>

            {qrData?.qr ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold">Code: <span className="font-mono">{qrData.qr.code}</span></div>
                <div className="text-xs text-slate-500 break-all">{qrData.qr.publicUrl}</div>
                <div className="text-xs text-slate-500">Last scanned: {fmtDateTime(qrData.qr.lastScannedAt)}</div>
                <StatusBadge status={qrData.qr.status === 'active' && qrData.qr.isActive ? 'active' : 'disabled'} />
                {qrData.qrImageSvg ? (
                  <div className="border border-slate-200 rounded-xl p-3 bg-white" dangerouslySetInnerHTML={{ __html: qrData.qrImageSvg }} />
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No QR generated yet.</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => runQrAction('generate')} className="rounded-lg bg-safe-ink text-white px-3 py-2 text-xs font-bold disabled:opacity-50">Generate</button>
              <button type="button" disabled={busy} onClick={() => runQrAction('regenerate')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50">Regenerate</button>
              <button type="button" disabled={busy} onClick={() => runQrAction('disable')} className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Disable</button>
              <button type="button" onClick={copyQrUrl} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Copy URL</button>
              <button type="button" onClick={downloadSvg} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">SVG</button>
              <button type="button" onClick={downloadPng} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">PNG</button>
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent scans</div>
              {scans.length === 0 ? (
                <p className="text-xs text-slate-400">No scans logged.</p>
              ) : (
                <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {scans.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                      <StatusBadge status={s.result} />
                      <span className="text-slate-500">{fmtDateTime(s.scannedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent covers</div>
              {covers.length === 0 ? (
                <p className="text-xs text-slate-400">No covers linked.</p>
              ) : (
                <ul className="space-y-1 max-h-32 overflow-y-auto text-xs">
                  {covers.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                      <span className="font-mono">{c.policyId}</span>
                      <StatusBadge status={c.paymentStatus || c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DetailPanel>
        )}
      </div>

      {showAdd ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form onSubmit={handleAddVehicle} className="w-full max-w-md rounded-2xl bg-white p-4 space-y-3">
            <div className="text-lg font-black text-safe-ink">Add vehicle</div>
            <input
              value={newPlate}
              onChange={(e) => setNewPlate(e.target.value)}
              placeholder="Plate number"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button>
              <button type="submit" disabled={busy} className="rounded-xl bg-safe-ink text-white px-4 py-2 text-xs font-bold">Create</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
