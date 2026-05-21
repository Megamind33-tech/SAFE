import React from 'react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-2xl font-black tracking-tight text-safe-ink">Settings</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">Roles, permissions, integrations, audit logs.</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
        <div className="text-sm font-black text-safe-ink">RBAC</div>
        <div className="mt-3 h-56 rounded-2xl bg-slate-100 border border-slate-200 grid place-items-center text-slate-500 text-sm font-semibold">
          Settings placeholder
        </div>
      </div>
    </div>
  );
}

