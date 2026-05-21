import React from 'react';

export default function FraudPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Regulatory Center</div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">National Compliance Score</div>
              <span className="material-symbols-outlined text-slate-500" aria-hidden="true">
                policy
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-4xl font-black tracking-tight text-safe-ink">94.2</div>
              <div className="text-sm font-semibold text-slate-500">/ 100</div>
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                trending_up
              </span>
              +1.2 pts from last quarter
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div className="h-full w-[94.2%] bg-safe-ink rounded-full" />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-slate-500">
              <span>Target: 95.0</span>
              <span>On Track</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-red-500/10" />
          <div className="relative">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-red-700 inline-flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                    warning
                  </span>
                  Action Required
                </div>
                <div className="mt-2 text-xl md:text-2xl font-black tracking-tight text-safe-ink">2 Critical Regulatory Alerts</div>
              </div>
              <button type="button" className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white hover:bg-red-700">
                Review Now
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {[
                {
                  icon: 'gavel',
                  title: 'DOT Audit Imminent · Region 4',
                  desc: 'Vehicle maintenance logs missing for 12 units in fleet terminal B.',
                },
                {
                  icon: 'assignment_late',
                  title: 'Expired Hazmat Certifications',
                  desc: '3 drivers operating with expired Class C hazardous materials endorsements.',
                },
              ].map((a) => (
                <div key={a.title} className="rounded-2xl border border-red-200 bg-white/80 backdrop-blur p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-600" aria-hidden="true">
                    {a.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-safe-ink">{a.title}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-600">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black tracking-tight text-safe-ink">Certification Renewals (Q3)</div>
            <span className="material-symbols-outlined text-slate-500" aria-hidden="true">
              verified
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {[
              { label: 'Fleet Safety Inspections', pct: 82, tone: 'good' },
              { label: 'Driver Defensive Training', pct: 45, tone: 'warn', note: 'Requires immediate attention to meet EOQ target.' },
              { label: 'Emissions Compliance (State)', pct: 98, tone: 'good' },
            ].map((p) => (
              <div key={p.label}>
                <div className="flex items-end justify-between gap-3">
                  <div className="text-sm font-black text-safe-ink">{p.label}</div>
                  <div className="text-sm font-black text-slate-600">{p.pct}%</div>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={[
                      'h-full rounded-full',
                      p.tone === 'warn' ? 'bg-amber-400' : 'bg-emerald-500',
                    ].join(' ')}
                    style={{ width: `${p.pct}%` }}
                  />
                </div>
                {p.note ? <div className="mt-2 text-xs font-semibold text-amber-800">{p.note}</div> : null}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500">Flagged Regulatory Issues</div>
            <button type="button" className="text-xs font-black text-safe-ink hover:underline">
              View All
            </button>
          </div>
          <div className="max-h-[320px] overflow-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-slate-200 text-sm">
                {[
                  { dot: 'bg-red-500', title: 'HOS Violation · ID 8492', meta: 'Driver: M. Jenkins', status: 'Unresolved', tone: 'bad' },
                  { dot: 'bg-amber-400', title: 'Weight Limit Warning', meta: 'Unit: TRK-442', status: 'Investigating', tone: 'warn' },
                  { dot: 'bg-amber-400', title: 'Insurance Lapse Imminent', meta: 'Fleet: Northeast Div', status: 'Pending', tone: 'warn' },
                  { dot: 'bg-slate-300', title: 'Routine Audit Follow-up', meta: 'Facility: HQ', status: 'Closed', tone: 'neutral' },
                ].map((r) => (
                  <tr key={r.title} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className={['h-2 w-2 rounded-full', r.dot].join(' ')} aria-hidden="true" />
                        <span className="font-black text-safe-ink">{r.title}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 font-semibold hidden sm:table-cell">{r.meta}</td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                          r.tone === 'bad'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : r.tone === 'warn'
                              ? 'bg-amber-50 border-amber-200 text-amber-800'
                              : 'bg-slate-50 border-slate-200 text-slate-600',
                        ].join(' ')}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
