import React, { useMemo, useState } from 'react';

function MetricCard({ label, value, sub, icon, tone = 'neutral' }) {
  const toneClasses =
    tone === 'good'
      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={['rounded-2xl border p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]', toneClasses].join(' ')}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</div>
        <span className="material-symbols-outlined text-slate-500" aria-hidden="true">
          {icon}
        </span>
      </div>
      <div className="mt-2 text-3xl font-black tracking-tight text-safe-ink">{value}</div>
      {sub ? <div className="mt-2 text-xs font-semibold text-slate-500">{sub}</div> : null}
    </div>
  );
}

function Pill({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'shrink-0 rounded-full px-3 py-1.5 text-xs font-black transition-colors',
        active ? 'bg-safe-ink text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function PartnersPage() {
  const categories = useMemo(() => ['All Categories', 'Hospitals', 'Garages', 'Underwriters', 'Authorities'], []);
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const rows = useMemo(
    () => [
      {
        id: 'levy',
        name: 'Levy Mwanawasa Hospital',
        subtitle: 'Class A Medical Facility',
        kindIcon: 'local_hospital',
        status: 'Live · v2.4',
        uptime: { value: '99.9%', tone: 'good' },
        volume: 'ZMW 4.2M',
        cta: 'Manage',
      },
      {
        id: 'rtsa',
        name: 'RTSA Database Sync',
        subtitle: 'Transport Authority',
        kindIcon: 'account_balance',
        status: 'Live · SOAP',
        uptime: { value: '92.4% (Degraded)', tone: 'warn' },
        volume: '142k Records',
        cta: 'Manage',
      },
      {
        id: 'autoworld',
        name: 'Autoworld Central',
        subtitle: 'Certified Repair Center',
        kindIcon: 'car_repair',
        status: 'Live · v3.0',
        uptime: { value: '100%', tone: 'good' },
        volume: 'ZMW 850k',
        cta: 'Manage',
      },
      {
        id: 'madison',
        name: 'Madison Gen. Insurance',
        subtitle: 'Underwriting Partner',
        kindIcon: 'shield',
        status: 'Provisioning',
        uptime: { value: 'N/A', tone: 'neutral' },
        volume: '--',
        cta: 'Review',
        muted: true,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Ecosystem Hub</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50"
          >
            Export Report
          </button>
          <button
            type="button"
            className="rounded-xl bg-safe-electric px-4 py-2.5 text-xs font-black text-safe-ink shadow-sm active:scale-[0.99] transition-transform inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              add
            </span>
            New Integration
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MetricCard label="Active Partners" value="142" sub="+12% MoM" icon="domain" />
        <MetricCard label="API Health Score" value="99.8%" sub="Optimal (30d)" icon="monitor_heart" tone="good" />
        <MetricCard label="MTD Settlement Volume" value="ZMW 14.2M" sub="Across 3,421 claims" icon="account_balance_wallet" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
        <div className="border-b border-slate-200 p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <Pill key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
                {cat}
              </Pill>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]"
                aria-hidden="true"
              >
                filter_list
              </span>
              <select className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-safe-electric/30 focus:border-safe-electric">
                <option>Sort by: Volume (High to Low)</option>
                <option>Sort by: Status</option>
                <option>Sort by: Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-200">
          {rows.map((row) => (
            <div
              key={row.id}
              className={[
                'p-4 hover:bg-slate-50 transition-colors flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between',
                row.muted ? 'opacity-75' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-3 min-w-0 lg:w-[36%]">
                <div className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 grid place-items-center shrink-0">
                  <span className="material-symbols-outlined text-safe-ink" aria-hidden="true">
                    {row.kindIcon}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-safe-ink">{row.name}</div>
                  <div className="truncate text-xs font-semibold text-slate-500">{row.subtitle}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 items-center lg:flex-1">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Integration</div>
                  <div className="mt-1 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-700">
                    {row.status}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">API Uptime (30d)</div>
                  <div
                    className={[
                      'mt-1 text-xs font-black',
                      row.uptime.tone === 'good'
                        ? 'text-emerald-700'
                        : row.uptime.tone === 'warn'
                          ? 'text-amber-700'
                          : 'text-slate-500',
                    ].join(' ')}
                  >
                    {row.uptime.value}
                  </div>
                </div>
                <div className="sm:col-span-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">30d Volume</div>
                  <div className="mt-1 text-xs font-black text-safe-ink">{row.volume}</div>
                </div>
                <div className="flex justify-end lg:justify-end sm:col-span-3 lg:col-span-1">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-safe-ink hover:bg-slate-50"
                  >
                    {row.cta}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold text-slate-500">Showing 1 to 4 of 142 entries</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-400 grid place-items-center"
              disabled
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                chevron_left
              </span>
            </button>
            <button type="button" className="h-9 w-9 rounded-xl bg-safe-ink text-white text-xs font-black">
              1
            </button>
            <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-xs font-black text-safe-ink">
              2
            </button>
            <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-xs font-black text-safe-ink">
              3
            </button>
            <span className="px-2 text-slate-400 text-sm font-black">…</span>
            <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-700 grid place-items-center">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

