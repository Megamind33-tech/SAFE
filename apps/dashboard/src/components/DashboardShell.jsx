import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  FileText,
  Handshake,
  LifeBuoy,
  LogOut,
  QrCode,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Truck,
  Users,
  WalletCards,
} from 'lucide-react';
import { loadDashboardToken, clearDashboardToken, dashboardMe } from '../api/dashboardApi.js';

const nav = [
  { to: '/', label: 'Overview', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/covers', label: 'Covers', icon: Shield },
  { to: '/payments', label: 'Payments', icon: WalletCards },
  { to: '/claims', label: 'Claims', icon: FileText },
  { to: '/vehicles', label: 'Vehicles', icon: Truck },
  { to: '/drivers', label: 'Drivers', icon: Users },
  { to: '/qr-scans', label: 'QR Scans', icon: QrCode },
  { to: '/partners', label: 'Partners', icon: Handshake },
  { to: '/fraud', label: 'Fraud Flags', icon: ShieldAlert },
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function DashboardShell() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const token = loadDashboardToken();

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    dashboardMe(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        clearDashboardToken();
        navigate('/login', { replace: true });
      });
  }, [token]);

  const handleLogout = () => {
    clearDashboardToken();
    navigate('/login');
  };

  if (!token) return null;

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

          <nav className="flex-1 px-2.5 pb-4 overflow-y-auto">
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  [
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                    isActive ? 'bg-safe-ink text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="px-2.5 pb-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} className="shrink-0" />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="px-4 md:px-6 h-12 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-safe-ink">SAFE Dashboard</div>
              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                {user && (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {user.email || user.phone} ({user.role?.replace('_', ' ')})
                  </span>
                )}
              </div>
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
