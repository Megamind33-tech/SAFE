import React from 'react';

export default function PaymentsPage() {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Billing & Plans</div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-safe-ink p-4 text-white shadow-[0_10px_30px_rgba(2,6,23,0.14)] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-safe-electric/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-widest text-white/70">Current Plan</div>
                <div className="mt-2 text-2xl font-black tracking-tight">Fleet Pro</div>
              </div>
              <span className="rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
                Active
              </span>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-white/70">Next billing date</div>
                <div className="mt-1 text-sm font-black">15 Nov 2023</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-white/70">Billing cycle</div>
                <div className="mt-1 text-sm font-black">Monthly</div>
              </div>
            </div>

            <div className="mt-6 border-t border-white/15 pt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-3xl font-black tracking-tight">
                  ZMW 4,500<span className="text-sm font-semibold text-white/70">/mo</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-white/70">Approx. $215 USD</div>
              </div>
              <button type="button" className="rounded-xl bg-safe-electric px-4 py-2.5 text-xs font-black text-safe-ink shadow-sm">
                Manage
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
          <div className="flex items-center justify-between">
            <div className="text-lg font-black tracking-tight text-safe-ink">Payment History</div>
            <button type="button" className="text-xs font-black text-safe-ink hover:underline">
              View All
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 overflow-hidden">
            {[
               { title: 'Fleet Pro · Monthly', date: '15 Oct 2023', amount: 'ZMW 4,500', status: 'Paid', icon: 'credit_card' },
               { title: 'Fleet Pro · Monthly', date: '15 Sep 2023', amount: 'ZMW 4,500', status: 'Paid', icon: 'account_balance' },
               { title: 'Fleet Pro · Monthly', date: '15 Aug 2023', amount: 'ZMW 4,500', status: 'Paid', icon: 'credit_card' },
            ].map((tx) => (
              <div key={tx.date} className="p-4 bg-white hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 grid place-items-center text-safe-ink shrink-0">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                      {tx.icon}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-safe-ink">{tx.title}</div>
                    <div className="truncate text-xs font-semibold text-slate-500">{tx.date}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-safe-ink">{tx.amount}</div>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
        <div className="text-lg font-black tracking-tight text-safe-ink">Available Plans</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="text-lg font-black text-safe-ink">Starter</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">For small fleets up to 5 vehicles.</div>
            <div className="mt-4 text-2xl font-black text-safe-ink">
              ZMW 1,200<span className="text-sm font-semibold text-slate-500">/mo</span>
            </div>
            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
              {['Basic Tracking', 'Standard Reports'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]" aria-hidden="true">
                    check_circle
                  </span>
                  {f}
                </div>
              ))}
            </div>
            <button type="button" className="mt-5 w-full rounded-xl border border-safe-ink text-safe-ink px-4 py-2.5 text-xs font-black hover:bg-safe-ink/5">
              Downgrade
            </button>
          </div>

          <div className="rounded-2xl border-2 border-safe-electric bg-white p-3 relative overflow-hidden">
            <div className="absolute top-3 right-3 rounded-full bg-safe-electric px-3 py-1 text-[10px] font-black uppercase tracking-widest text-safe-ink">
              Recommended
            </div>
            <div className="text-lg font-black text-safe-ink">Enterprise</div>
            <div className="mt-1 text-sm font-semibold text-slate-500">Unlimited vehicles, advanced analytics.</div>
            <div className="mt-4 text-2xl font-black text-safe-ink">
              ZMW 12,000<span className="text-sm font-semibold text-slate-500">/mo</span>
            </div>
            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-700">
              {['AI Routing', 'Dedicated Account Manager', 'Custom Integrations'].map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]" aria-hidden="true">
                    check_circle
                  </span>
                  {f}
                </div>
              ))}
            </div>
            <button type="button" className="mt-5 w-full rounded-xl bg-safe-ink px-4 py-2.5 text-xs font-black text-white hover:bg-safe-midnight">
              Upgrade Plan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
