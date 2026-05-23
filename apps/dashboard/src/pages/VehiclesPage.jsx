import React, { useEffect, useState } from 'react';
import { dashboardVehicles, loadDashboardToken } from '../api/dashboardApi.js';
import { Truck, AlertTriangle, Inbox } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardVehicles(token)
      .then((data) => setVehicles(data.vehicles ?? []))
      .catch((e) => setError(e?.message || 'Failed to load vehicles'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Vehicles</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Registered fleet vehicles.</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-safe-ink animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading vehicles…</span>
        </div>
      ) : vehicles.length === 0 ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Inbox size={36} />
          <span className="text-xs font-bold">No vehicles found</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3.5 px-5">Plate</th>
                  <th className="py-3.5 px-5">Bus ID</th>
                  <th className="py-3.5 px-5">Route</th>
                  <th className="py-3.5 px-5">Transport Partner</th>
                  <th className="py-3.5 px-5">Driver</th>
                  <th className="py-3.5 px-5 text-right">Covers</th>
                  <th className="py-3.5 px-5 text-right">QR Scans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {vehicles.map((v) => {
                  const route = v.route ? `${v.route.origin} → ${v.route.destination}` : '—';
                  const partner = v.transportPartner?.name || '—';
                  const driver = v.driver?.fullName || '—';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5 font-black text-safe-ink uppercase">{v.plateNumber || '—'}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{v.busId || '—'}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{route}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{partner}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{driver}</td>
                      <td className="py-3.5 px-5 text-right font-black text-safe-ink">{v._count?.tripCovers ?? 0}</td>
                      <td className="py-3.5 px-5 text-right font-black text-safe-ink">{v._count?.qrScans ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            Showing {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
