import React, { useEffect, useState } from 'react';
import { dashboardPartner, dashboardPartners, loadDashboardToken } from '../api/dashboardApi.js';

export default function PartnersPage() {
  const [partners, setPartners] = useState([]);
  const [detail, setDetail] = useState(null);
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
    try {
      const data = await dashboardPartner(token, id);
      setDetail(data.partner);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-black text-safe-ink">Transport partners</h1>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading partners…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Partner</th>
                  <th className="px-4 py-3 text-left">Vehicles</th>
                  <th className="px-4 py-3 text-left">Drivers</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} onClick={() => openPartner(p.id)} className="border-t cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold">{p.name}</td>
                    <td className="px-4 py-3">{p.vehicleCount}</td>
                    <td className="px-4 py-3">{p.driverCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          {!detail ? (
            <p className="text-sm text-slate-500">Select a partner for fleet and performance summary.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-lg font-black">{detail.name}</div>
                <div className="text-xs text-slate-500">{detail.stats?.commissionNote}</div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Active covers</div><div className="text-xl font-black">{detail.stats?.activeCovers ?? 0}</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] uppercase text-slate-400">Verified scans</div><div className="text-xl font-black">{detail.stats?.verifiedScans ?? 0}</div></div>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Vehicles</div>
                <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {(detail.vehicles || []).map((v) => (
                    <li key={v.id} className="flex justify-between border-b border-slate-100 py-1">
                      <span className="font-bold">{v.plateNumber}</span>
                      <span className="text-slate-500">{v.qr?.code ?? 'No QR'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
