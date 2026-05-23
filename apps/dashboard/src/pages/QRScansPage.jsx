import React, { useEffect, useState } from 'react';
import { dashboardQRScans, loadDashboardToken } from '../api/dashboardApi.js';
import { QrCode, AlertTriangle, Inbox } from 'lucide-react';

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function QRScansPage() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardQRScans(token)
      .then((data) => setScans(data.scans ?? []))
      .catch((e) => setError(e?.message || 'Failed to load QR scans'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">QR Scans</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Vehicle QR code scan history.</div>
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
          <span className="text-xs font-bold uppercase tracking-wider">Loading scans…</span>
        </div>
      ) : scans.length === 0 ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Inbox size={36} />
          <span className="text-xs font-bold">No QR scans found</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3.5 px-5">Time</th>
                  <th className="py-3.5 px-5">Scanned By</th>
                  <th className="py-3.5 px-5">Vehicle</th>
                  <th className="py-3.5 px-5">QR Code</th>
                  <th className="py-3.5 px-5">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {scans.map((s) => {
                  const scannedBy = s.scannedByUser?.passengerProfile?.fullName || s.scannedByUser?.phone || '—';
                  const vehicle = s.vehicle?.plateNumber || '—';
                  const qrCode = s.qrCode?.code || s.qrCode?.id?.slice(0, 8) || '—';
                  const result = s.result || '—';
                  const isValid = result.toLowerCase() === 'valid';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtTime(s.createdAt)}</td>
                      <td className="py-3.5 px-5 font-black text-safe-ink">{scannedBy}</td>
                      <td className="py-3.5 px-5 text-xs font-bold text-slate-600 uppercase">{vehicle}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-500 font-mono">{qrCode}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                          isValid
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {result}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            Showing {scans.length} scan{scans.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
