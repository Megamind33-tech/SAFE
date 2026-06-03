import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { dashboardLogin, saveDashboardToken } from '../api/dashboardApi.js';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import safeAppIcon from '../assets/brand/safe-app-icon.png';
import safeLogoFull from '../assets/brand/safe-logo-full.png';

export default function DashboardLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useDashboardSession();
  const from = typeof location.state?.from === 'string' ? location.state.from : '/';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await dashboardLogin({ identifier: email, password });
      saveDashboardToken(data.token);
      await refresh();
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(0,197,107,0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef7f1_100%)] px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(2,6,23,0.12)] backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            <img src={safeAppIcon} alt="SAFE" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <img src={safeLogoFull} alt="SAFE Dashboard" className="h-10 w-auto object-contain" />
            <div className="-mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Operations dashboard</div>
          </div>
        </div>

        <div className="mt-7 text-2xl font-black tracking-tight text-safe-ink">Admin login</div>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Sign in to monitor SAFE covers, linked vehicles, claims, payments, and live operations.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-safe-ink outline-none focus:border-safe-ink"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>

          <label className="block">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-safe-ink outline-none focus:border-safe-ink"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <div className="text-sm font-semibold text-red-600">{error}</div> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-safe-electric px-4 py-3 text-safe-ink font-black shadow-sm active:scale-[0.99] transition-transform disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full text-center text-xs font-bold text-slate-500 hover:text-safe-ink"
        >
          Back to overview
        </button>
      </div>
    </div>
  );
}
