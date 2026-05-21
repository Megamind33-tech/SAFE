import React from 'react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Executive Analytics</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Real-time performance and risk monitoring.</div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Safety Index', value: '94.2', sub: '+1.4% QoQ', icon: 'health_and_safety', tone: 'good' },
          { label: 'Active Premium', value: '$24.8M', sub: '+5.2% QoQ', icon: 'account_balance', tone: 'good' },
          { label: 'Avg Claim Time', value: '14d', sub: '+2d vs target', icon: 'timer', tone: 'bad' },
          { label: 'Active Escalations', value: '27', sub: 'Critical: 4', icon: 'warning', tone: 'warn' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={[
              'rounded-2xl border p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] bg-white',
              kpi.tone === 'warn' ? 'border-amber-200 bg-amber-50/40' : kpi.tone === 'bad' ? 'border-red-200' : 'border-slate-200',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{kpi.label}</div>
              <span
                className={[
                  'material-symbols-outlined text-[22px]',
                  kpi.tone === 'bad' ? 'text-red-600' : kpi.tone === 'warn' ? 'text-amber-700' : 'text-safe-ink',
                ].join(' ')}
                aria-hidden="true"
              >
                {kpi.icon}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-3xl font-black tracking-tight text-safe-ink">{kpi.value}</div>
              <div
                className={[
                  'text-xs font-black inline-flex items-center gap-1 rounded-full px-3 py-1',
                  kpi.tone === 'bad'
                    ? 'bg-red-50 text-red-700'
                    : kpi.tone === 'warn'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-emerald-50 text-emerald-700',
                ].join(' ')}
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                  {kpi.tone === 'bad' ? 'trending_up' : 'trending_up'}
                </span>
                {kpi.sub}
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={[
                  'h-full rounded-full',
                  kpi.tone === 'bad' ? 'bg-red-500' : kpi.tone === 'warn' ? 'bg-amber-400' : 'bg-safe-ink',
                ].join(' ')}
                style={{ width: kpi.label === 'Avg Claim Time' ? '65%' : kpi.label === 'Active Escalations' ? '40%' : '85%' }}
              />
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="text-sm font-black text-safe-ink">Incident Volume vs Resolution</div>
              <div className="text-xs font-semibold text-slate-500">Q3 2023 (current)</div>
            </div>
            <button type="button" className="h-9 w-9 rounded-xl grid place-items-center text-slate-500 hover:bg-slate-50" title="More">
              <span className="material-symbols-outlined" aria-hidden="true">
                more_horiz
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="h-56 flex items-end gap-3">
              {[
                { label: 'Apr', a: 60, b: 45 },
                { label: 'May', a: 75, b: 65 },
                { label: 'Jun', a: 50, b: 50 },
                { label: 'Jul', a: 85, b: 70 },
                { label: 'Aug', a: 95, b: 40 },
              ].map((m) => (
                <div key={m.label} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end gap-1 h-44">
                    <div className="w-1/2 rounded-t-xl bg-safe-ink/80" style={{ height: `${m.a}%` }} />
                    <div className="w-1/2 rounded-t-xl bg-safe-electric/80" style={{ height: `${m.b}%` }} />
                  </div>
                  <div className="text-[11px] font-black text-slate-600">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-black text-slate-600">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-safe-ink/80" aria-hidden="true" />
                Reported Incidents
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-safe-electric/80" aria-hidden="true" />
                Resolved Claims
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <div className="text-sm font-black text-safe-ink">Regional Highlights</div>
            <div className="text-xs font-semibold text-slate-500">Risk, performance, and volume indicators</div>
          </div>
          <div className="p-4 space-y-2">
            {[
              { code: 'NE', name: 'North East Corridor', note: 'Highest claim volume', trend: '+12%', tone: 'bad' },
              { code: 'SW', name: 'South West Transit', note: 'Safety target exceeded', trend: '-4%', tone: 'good' },
              { code: 'MW', name: 'Midwest Logistics', note: 'Stable performance', trend: '--', tone: 'neutral' },
            ].map((r) => (
              <div key={r.code} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={[
                      'h-10 w-10 rounded-full grid place-items-center text-xs font-black shrink-0',
                      r.tone === 'good' ? 'bg-emerald-50 text-emerald-700' : r.tone === 'bad' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                  >
                    {r.code}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-safe-ink">{r.name}</div>
                    <div className="truncate text-xs font-semibold text-slate-500">{r.note}</div>
                  </div>
                </div>
                <div
                  className={[
                    'text-sm font-black shrink-0',
                    r.tone === 'good' ? 'text-emerald-700' : r.tone === 'bad' ? 'text-red-700' : 'text-slate-500',
                  ].join(' ')}
                >
                  {r.trend}
                </div>
              </div>
            ))}
            <button type="button" className="w-full rounded-xl border border-safe-ink text-safe-ink px-4 py-2.5 text-xs font-black hover:bg-safe-ink/5">
              Download Full Report
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
