import React, { useEffect, useState } from 'react';
import { dashboardMetrics, dashboardPaymentsConfig, loadDashboardToken } from '../api/dashboardApi.js';

export default function SettingsPage() {
  const [metrics, setMetrics] = useState(null);
  const [payments, setPayments] = useState(null);
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    dashboardMetrics(token).then((d) => setMetrics(d.metrics)).catch(() => {});
    dashboardPaymentsConfig(token).then(setPayments).catch(() => {});
  }, [token]);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-black text-safe-ink">Environment & readiness</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm space-y-2">
        <div className="font-black text-safe-ink">Backend flags (from API)</div>
        <div>Payment gateway: {payments?.paymentGatewayEnabled ? 'enabled' : 'disabled'}</div>
        <div>Simulate payment success: {payments?.paymentSimulateSuccess ? 'on (dev)' : 'off'}</div>
        <div>Claims upload: {metrics?.claimsUploadEnabled ? 'enabled' : 'metadata only'}</div>
        <div className="text-xs text-slate-500 pt-2">See docs/PRODUCTION_READINESS.md for full deployment checklist.</div>
      </div>
    </div>
  );
}
