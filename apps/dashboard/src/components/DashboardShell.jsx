import React, { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bus,
  FileText,
  Handshake,
  LifeBuoy,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  WalletCards,
} from 'lucide-react';
import { clearDashboardToken, loadDashboardToken } from '../api/dashboardApi.js';

const nav = [
  { to: '/', label: 'Overview', icon: BarChart3 },
  { to: '/vehicles', label: 'Vehicles', icon: Bus },
  { to: '/partners', label: 'Partners', icon: Handshake },
  { to: '/covers', label: 'Covers', icon: ShieldCheck },
  { to: '/claims', label: 'Claims', icon: FileText },
  { to: '/payments', label: 'Payments', icon: WalletCards },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/settings', label: 'Readiness', icon: SlidersHorizontal },
  { to: '/customers', label: 'Drivers', icon: Users },
];

export default function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [token, location.pathname, navigate]);

  function handleLogout() {
    clearDashboardToken();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="px-4 py-3">
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

          <nav className="flex-1 px-2.5 pb-4">
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
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-4 md:px-6 h-12 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-safe-ink">SAFE Control Room</div>
              <div className="hidden md:flex items-center gap-3 text-xs font-semibold text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">Pilot readiness</span>
                <span className="rounded-full bg-slate-100 px-3 py-1">{token ? 'Authenticated' : 'Guest'}</span>
              </div>
              {token ? (
                <button type="button" onClick={handleLogout} className="text-xs font-bold text-slate-600 hover:text-safe-ink">
                  Sign out
                </button>
              ) : (
                <button type="button" onClick={() => navigate('/login')} className="text-xs font-bold text-slate-600 hover:text-safe-ink">
                  Admin login
                </button>
              )}
            </div>
          </header>

          <main className="px-4 md:px-6 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
