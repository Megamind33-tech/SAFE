import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardLogin, saveDashboardToken } from '../api/dashboardApi.js';

export default function DashboardLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@safe.local');
  const [password, setPassword] = useState('admin1234');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await dashboardLogin({ identifier: email, password });
      saveDashboardToken(data.token);
      navigate('/');
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_60px_rgba(2,6,23,0.08)]">
        <div className="text-sm font-extrabold tracking-wide text-safe-ink">SAFE Dashboard</div>
        <div className="mt-1 text-2xl font-black tracking-tight text-safe-ink">Admin login</div>

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
