import React, { useCallback, useEffect, useState } from 'react';
import {
  dashboardVehicleQr,
  dashboardVehicleScans,
  dashboardVehicles,
  generateVehicleQr,
  loadDashboardToken,
  regenerateVehicleQr,
  updateVehicleQr,
} from '../api/dashboardApi.js';

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const token = loadDashboardToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await dashboardVehicles(token);
      setVehicles(data.vehicles || []);
      setError('');
    } catch (e) {
      setError(e.message || 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = vehicles.find((v) => v.id === selectedId) ?? null;

  async function openVehicle(id) {
    setSelectedId(id);
    setQrData(null);
    setScans([]);
    if (!token) return;
    try {
      const [qr, scanRes] = await Promise.all([
        dashboardVehicleQr(token, id),
        dashboardVehicleScans(token, id),
      ]);
      setQrData(qr);
      setScans(scanRes.scans || []);
    } catch (e) {
      setError(e.message || 'Failed to load vehicle QR');
    }
  }

  async function runQrAction(action) {
    if (!token || !selectedId) return;
    setBusy(true);
    setError('');
    try {
      let data;
      if (action === 'generate') data = await generateVehicleQr(token, selectedId);
      else if (action === 'regenerate') data = await regenerateVehicleQr(token, selectedId);
      else if (action === 'disable' && qrData?.qr?.id) {
        data = await updateVehicleQr(token, selectedId, { qrId: qrData.qr.id, action: 'disable' });
        data = { qr: data.qr, qrImageSvg: qrData.qrImageSvg, qrImagePngDataUrl: qrData.qrImagePngDataUrl };
      } else return;
      if (action !== 'disable') {
        const refreshed = await dashboardVehicleQr(token, selectedId);
        setQrData(refreshed);
      } else {
        setQrData((prev) => ({ ...prev, qr: data.qr }));
      }
      const scanRes = await dashboardVehicleScans(token, selectedId);
      setScans(scanRes.scans || []);
      await load();
    } catch (e) {
      setError(e.message || 'QR action failed');
    } finally {
      setBusy(false);
    }
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

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-safe-ink">Fleet · Vehicles</h1>
        <button type="button" onClick={load} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-8 text-sm text-slate-500">Loading vehicles…</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Plate</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Partner</th>
                  <th className="px-4 py-3">QR</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => openVehicle(v.id)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${selectedId === v.id ? 'bg-safe-ink/5' : ''}`}
                  >
                    <td className="px-4 py-3 font-bold">{v.plateNumber}</td>
                    <td className="px-4 py-3">{v.route ? `${v.route.origin} → ${v.route.destination}` : '—'}</td>
                    <td className="px-4 py-3">{v.partner?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.qr?.code ?? 'None'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${v.operationalStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                        {v.operationalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          {!selected ? (
            <p className="text-sm text-slate-500">Select a vehicle to manage QR and scan logs.</p>
          ) : (
            <>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</div>
                <div className="text-lg font-black text-safe-ink">{selected.plateNumber}</div>
                <div className="text-xs text-slate-500">{selected.partner?.name ?? 'No partner'}</div>
              </div>

              {qrData?.qr ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600">Code: <span className="font-mono">{qrData.qr.code}</span></div>
                  <div className="text-xs text-slate-500 break-all">{qrData.qr.publicUrl}</div>
                  <div className="text-xs text-slate-500">Last scanned: {fmt(qrData.qr.lastScannedAt)}</div>
                  {qrData.qrImageSvg ? (
                    <div className="border border-slate-200 rounded-xl p-3 bg-white" dangerouslySetInnerHTML={{ __html: qrData.qrImageSvg }} />
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => runQrAction('generate')} className="rounded-lg bg-safe-ink text-white px-3 py-2 text-xs font-bold disabled:opacity-50">Generate QR</button>
                <button type="button" disabled={busy} onClick={() => runQrAction('regenerate')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50">Regenerate</button>
                <button type="button" disabled={busy} onClick={() => runQrAction('disable')} className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-xs font-bold disabled:opacity-50">Disable QR</button>
                <button type="button" onClick={downloadSvg} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Download SVG</button>
                <button type="button" onClick={downloadPng} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Download PNG</button>
              </div>

              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Recent scans</div>
                <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
                  {scans.length === 0 ? <li className="text-slate-400">No scans logged yet.</li> : null}
                  {scans.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                      <span className="font-semibold uppercase">{s.result}</span>
                      <span className="text-slate-500">{fmt(s.scannedAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
