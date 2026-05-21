import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  FileText,
  LifeBuoy,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  WalletCards,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/claims', label: 'Claims', icon: FileText },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/payments', label: 'Payments', icon: WalletCards },
  { to: '/analytics', label: 'Reports', icon: Building2 },
  { to: '/live-ops', label: 'Live Ops', icon: Shield },
  { to: '/fraud', label: 'Fraud', icon: ShieldAlert },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function DashboardShell() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-safe-ink text-safe-cloud grid place-items-center shadow-sm">
                <span className="text-safe-electric font-black tracking-wide">S</span>
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide text-safe-ink">SAFE</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Operations</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 pb-6">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                    isActive ? 'bg-safe-ink text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 pb-5">
            <button
              type="button"
              onClick={() => navigate('/claims')}
              className="w-full rounded-xl bg-safe-electric px-4 py-3 text-safe-ink font-black shadow-sm active:scale-[0.99] transition-transform"
            >
              New Claim
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-5 md:px-8 h-16 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-safe-ink">SAFE Dashboard</div>
              <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">API: Shared Backend</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">RBAC: Enabled</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="text-xs font-bold text-slate-600 hover:text-safe-ink"
              >
                Admin login
              </button>
            </div>
          </header>

          <main className="px-5 md:px-8 py-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

