import React, { useEffect, useState } from 'react';
import { dashboardPayments, dashboardPaymentsConfig, loadDashboardToken } from '../api/dashboardApi.js';

const FILTERS = ['', 'pending', 'succeeded', 'failed'];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PaymentsPage() {
  const [filter, setFilter] = useState('');
  const [payments, setPayments] = useState([]);
  const [config, setConfig] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      dashboardPayments(token, filter || undefined),
      dashboardPaymentsConfig(token),
    ])
      .then(([payRes, cfgRes]) => {
        setPayments(payRes.payments || []);
        setNote(payRes.reconciliationNote || '');
        setConfig(cfgRes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, filter]);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-black text-safe-ink">Payments</h1>

      {config ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm space-y-1">
          <div><strong>Gateway:</strong> {config.paymentGatewayEnabled ? 'Enabled' : 'Not connected'}</div>
          <div><strong>Simulate success:</strong> {config.paymentSimulateSuccess ? 'On (dev only)' : 'Off'}</div>
          <div className="text-xs text-slate-500">{config.webhook?.note}</div>
          <div className="text-xs font-mono text-slate-600">Webhook: POST /api/shared/webhooks/payment</div>
        </div>
      ) : null}

      {note ? <div className="text-xs text-slate-500">{note}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f || 'all'}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-2 text-xs font-black ${filter === f ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200'}`}
          >
            {f || 'all'}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
        {loading ? (
          <div className="p-8 text-sm text-slate-500">Loading payments…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Passenger</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Vehicle</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{p.id.slice(-8)}</td>
                  <td className="px-4 py-3">{p.passenger?.fullName || p.passenger?.phone || '—'}</td>
                  <td className="px-4 py-3 font-bold">K{p.amount}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3 uppercase text-[10px] font-black">{p.status}</td>
                  <td className="px-4 py-3">{p.vehiclePlate ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
