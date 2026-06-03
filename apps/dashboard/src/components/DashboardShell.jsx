import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bus,
  FileText,
  Handshake,
  LifeBuoy,
  MapPinned,
  Menu,
  QrCode,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { clearDashboardToken, loadDashboardToken } from '../api/dashboardApi.js';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import { NAV_ITEMS } from '../lib/dashboardPermissions.js';
import { hasPermission } from '../lib/dashboardPermissions.js';
import safeAppIcon from '../assets/brand/safe-app-icon.png';
import safeLogoFull from '../assets/brand/safe-logo-full.png';

const ICONS = {
  Overview: BarChart3,
  Vehicles: Bus,
  Partners: Handshake,
  Covers: ShieldCheck,
  Claims: FileText,
  Payments: WalletCards,
  'Live trips': MapPinned,
  'Live ops': MapPinned,
  'QR scans': QrCode,
  Support: LifeBuoy,
  Passengers: Users,
  'Staff users': UserCog,
  Settings: SlidersHorizontal,
  Drivers: Users,
};

function SafeBrand({ compact = false }) {
  return (
    <div className={`flex items-center ${compact ? 'justify-center' : 'gap-3'}`}>
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <img src={safeAppIcon} alt="SAFE" className="h-full w-full object-cover" />
      </div>
      {!compact ? (
        <div className="min-w-0">
          <div className="text-base font-black leading-none tracking-tight text-safe-ink">SAFE</div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Operations</div>
        </div>
      ) : null}
    </div>
  );
}

function NavItems({ onNavigate, compact = false, permissions }) {
  const visible = NAV_ITEMS.filter((item) => hasPermission(permissions, item.permission));
  return (
    <>
      {visible.map(({ to, label, permission }) => {
        const Icon = ICONS[label] || Users;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={compact ? label : undefined}
            onClick={onNavigate}
            className={({ isActive }) =>
              [
                'flex items-center rounded-lg text-sm font-semibold transition-colors mb-0.5',
                compact ? 'justify-center gap-0 px-2 py-2.5 xl:justify-start xl:gap-3 xl:px-3' : 'gap-3 px-3 py-2.5',
                isActive ? 'bg-safe-ink text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100',
              ].join(' ')
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className={compact ? 'hidden xl:inline' : undefined}>{label}</span>
          </NavLink>
        );
      })}
    </>
  );
}

export default function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = loadDashboardToken();
  const { user, permissions, loading, refresh } = useDashboardSession();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true, state: { from: location.pathname } });
    }
  }, [token, location.pathname, navigate]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  function handleLogout() {
    clearDashboardToken();
    refresh();
    navigate('/login', { replace: true, state: { from: '/' } });
  }

  function closeMobileNav() {
    setMobileNavOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {mobileNavOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
            aria-label="Close navigation menu"
            onClick={closeMobileNav}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <SafeBrand />
              <button
                type="button"
                onClick={closeMobileNav}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-safe-ink"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2.5 py-3">
              {!loading ? <NavItems onNavigate={closeMobileNav} permissions={permissions} /> : null}
            </nav>
          </aside>
        </>
      ) : null}

      <div className="flex">
        <aside className="hidden md:flex w-16 xl:w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-3 py-4 xl:px-4">
            <div className="hidden xl:block">
              <SafeBrand />
            </div>
            <div className="xl:hidden">
              <SafeBrand compact />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-1.5 py-3 xl:px-2.5">
            {!loading ? <NavItems compact permissions={permissions} /> : null}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-safe-ink md:hidden"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu size={20} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <img src={safeAppIcon} alt="" className="h-6 w-6 rounded-lg object-cover md:hidden" />
                    <div className="truncate text-sm font-semibold text-safe-ink">SAFE Control Room</div>
                  </div>
                  <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {user?.role ? `${user.role.replace(/_/g, ' ')}` : 'Pilot operations dashboard'}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 md:inline">
                  Real data only
                </span>
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
            </div>
          </header>

          <main className="px-4 py-5 md:px-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
