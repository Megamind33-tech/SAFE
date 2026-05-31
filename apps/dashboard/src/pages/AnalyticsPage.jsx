import React, { useEffect, useState } from 'react';
import { dashboardAnalytics, loadDashboardToken } from '../api/dashboardApi.js';
import {
  Card,
  ErrorCard,
  LoadingBlock,
  MetricCard,
  PageHeader,
} from '../components/admin/ui.jsx';

function fmt(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function fmtZmw(n) {
  if (n == null) return '—';
  return `K ${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BreakdownRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 text-sm">
      <span className="text-slate-600">{label}</span>
      <strong className="text-safe-ink">{fmt(value)}</strong>
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) return;
    dashboardAnalytics(token)
      .then((d) => setAnalytics(d.analytics))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="space-y-4 max-w-[1600px] mx-auto"><PageHeader title="Executive Analytics" description="Performance and risk monitoring across the SAFE network." /><LoadingBlock /></div>;
  if (error) return <div className="space-y-4 max-w-[1600px] mx-auto"><PageHeader title="Executive Analytics" description="Performance and risk monitoring across the SAFE network." /><ErrorCard message={error} /></div>;
  if (!analytics) return null;

  const { covers, passengers, payments, claims, revenue, scans, fraudFlags } = analytics;
  const paymentRate = payments.successRate != null ? `${payments.successRate}%` : '—';

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <PageHeader
        title="Executive Analytics"
        description="Performance and risk monitoring across the SAFE network."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Covers today" value={fmt(covers.today)} sub="Sold today" />
        <MetricCard label="Covers this week" value={fmt(covers.week)} sub="Last 7 days" />
        <MetricCard label="Covers this month" value={fmt(covers.month)} sub="Last 30 days" />
        <MetricCard label="Active covers" value={fmt(covers.active)} sub="Live right now" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Revenue today" value={fmtZmw(revenue.todayZmw)} sub="ZMW" />
        <MetricCard label="Revenue this week" value={fmtZmw(revenue.weekZmw)} sub="Last 7 days" />
        <MetricCard label="Revenue this month" value={fmtZmw(revenue.monthZmw)} sub="Last 30 days" />
        <MetricCard label="Total revenue" value={fmtZmw(revenue.totalZmw)} sub="All time" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Passengers" value={fmt(passengers.total)} sub={`+${fmt(passengers.today)} today`} />
        <MetricCard label="Payment success" value={paymentRate} sub={`${fmt(payments.succeeded)} succeeded`} />
        <MetricCard label="QR scans today" value={fmt(scans.today)} sub={`${fmt(scans.total)} total`} />
        <MetricCard label="Fraud flags" value={fmt(fraudFlags.total)} sub={`${fmt(fraudFlags.week)} this week`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-black text-safe-ink mb-3">Claims breakdown</div>
          <BreakdownRow label="Total submitted" value={claims.total} />
          <BreakdownRow label="Approved" value={claims.approved} />
          <BreakdownRow label="Paid out" value={claims.paid} />
          <BreakdownRow label="Rejected" value={claims.rejected} />
        </Card>

        <Card>
          <div className="text-sm font-black text-safe-ink mb-3">Payment summary</div>
          <BreakdownRow label="Succeeded" value={payments.succeeded} />
          <BreakdownRow label="Pending" value={payments.pending} />
          <BreakdownRow label="Failed" value={payments.failed} />
          <BreakdownRow label="Reversed" value={payments.reversed} />
        </Card>
      </div>

      <p className="text-xs text-slate-500">
        Generated: {analytics.generatedAt ? new Date(analytics.generatedAt).toLocaleString() : '—'}
      </p>
    </div>
  );
}
