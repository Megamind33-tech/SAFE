import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardOverview, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  ErrorCard,
  LoadingBlock,
  MetricCard,
  PageHeader,
  StatusBadge,
  WarningBanner,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

export default function DashboardOverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) return;
    dashboardOverview(token)
      .then(setData)
      .catch((e) => setError(e?.message || 'Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  const m = data?.metrics;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Operations overview"
        description="Real-time SAFE pilot metrics from backend data. Zeros mean zero — not placeholders."
      />

      {error ? <ErrorCard message={error} onRetry={() => window.location.reload()} /> : null}
      {loading ? <LoadingBlock label="Loading overview…" /> : null}

      {!loading && m ? (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <MetricCard label="Covers sold today" value={String(m.coversSoldToday)} sub="Succeeded payments" to="/covers?status=active" />
            <MetricCard label="Active covers" value={String(m.activeCovers)} sub="Paid & in force" to="/covers?status=active" />
            <MetricCard label="Pending payments" value={String(m.pendingPayments)} sub="Awaiting gateway" to="/payments?status=pending" />
            <MetricCard label="Failed payments" value={String(m.failedPayments)} sub="Needs follow-up" to="/payments?status=failed" />
            <MetricCard label="Active claims" value={String(m.activeClaims)} sub="Open pipeline" to="/claims" />
            <MetricCard label="Claims needing action" value={String(m.claimsNeedingAction)} sub="Submitted / needs action" to="/claims?status=needs_action" />
            <MetricCard label="Open support reports" value={String(m.openSupport)} sub="Passenger issues" to="/support?status=open" />
            <MetricCard label="Vehicles with QR" value={String(m.vehiclesWithQr)} sub="Active QR codes" to="/vehicles?qrStatus=active" />
            <MetricCard label="Recent QR scans (24h)" value={String(m.recentScans)} sub="Scan log activity" to="/qr-scans" />
            <MetricCard label="Active trips" value={String(m.activeTrips)} sub="Trip tracking records" to="/live-trips?bucket=active" />
            <MetricCard label="Registered passengers" value={String(m.registeredPassengers)} sub="Passenger accounts" to="/users" />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <div className="text-sm font-black text-safe-ink mb-3">Recent activity</div>
              {!data.panels?.recentActivity?.length ? (
                <p className="text-sm text-slate-500">No recent activity recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.panels.recentActivity.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2">
                      <div>
                        <Link to={item.href} className="text-sm font-bold text-safe-ink hover:underline">
                          {item.title}
                        </Link>
                        <div className="text-xs text-slate-500 mt-0.5">{item.detail}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{fmtDateTime(item.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="text-sm font-black text-safe-ink mb-3">Claims needing action</div>
              {!data.panels?.claimsNeedingAction?.length ? (
                <p className="text-sm text-slate-500">No claims waiting on operations.</p>
              ) : (
                <ul className="space-y-2">
                  {data.panels.claimsNeedingAction.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <div>
                        <Link to={`/claims?selected=${c.id}`} className="text-sm font-bold text-safe-ink hover:underline">
                          {c.reference}
                        </Link>
                        <div className="text-xs text-slate-500">{c.passenger?.fullName || c.passenger?.phone || 'Passenger'} · {c.vehiclePlate || 'No vehicle'}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="text-sm font-black text-safe-ink mb-3">Payment issues</div>
              {!data.panels?.paymentIssues?.length ? (
                <p className="text-sm text-slate-500">No pending or failed payments.</p>
              ) : (
                <ul className="space-y-2">
                  {data.panels.paymentIssues.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <div>
                        <Link to={`/payments?selected=${p.id}`} className="text-sm font-bold text-safe-ink hover:underline">
                          K{p.amount} · {p.method}
                        </Link>
                        <div className="text-xs text-slate-500">{p.passenger?.fullName || p.passenger?.phone || 'Passenger'}</div>
                      </div>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="text-sm font-black text-safe-ink mb-3">QR scan activity</div>
              {!data.panels?.qrActivity?.length ? (
                <p className="text-sm text-slate-500">No QR scans logged yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.panels.qrActivity.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                      <div>
                        <Link to="/qr-scans" className="text-sm font-bold text-safe-ink hover:underline">
                          {s.vehiclePlate || s.qrCode || 'Unknown vehicle'}
                        </Link>
                        <div className="text-xs text-slate-500 uppercase">{s.result}</div>
                      </div>
                      <span className="text-[10px] text-slate-400">{fmtDateTime(s.scannedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </>
      ) : null}
    </div>
  );
}
