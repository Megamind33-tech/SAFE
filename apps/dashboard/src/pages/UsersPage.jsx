import React, { useEffect, useState } from 'react';
import { dashboardUsers, loadDashboardToken } from '../api/dashboardApi.js';
import { Users, AlertTriangle, Inbox } from 'lucide-react';

const roleStyle = {
  admin: 'bg-violet-50 border-violet-200 text-violet-700',
  super_admin: 'bg-rose-50 border-rose-200 text-rose-700',
  driver: 'bg-blue-50 border-blue-200 text-blue-700',
  passenger: 'bg-slate-50 border-slate-200 text-slate-600',
  transport_partner: 'bg-teal-50 border-teal-200 text-teal-700',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) { setLoading(false); return; }
    dashboardUsers(token)
      .then((data) => setUsers(data.users ?? []))
      .catch((e) => setError(e?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Users</div>
        <div className="mt-1 text-sm font-semibold text-slate-500">All registered platform users.</div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-safe-ink animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading users…</span>
        </div>
      ) : users.length === 0 ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <Inbox size={36} />
          <span className="text-xs font-bold">No users found</span>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                  <th className="py-3.5 px-5">Name</th>
                  <th className="py-3.5 px-5">Phone / Email</th>
                  <th className="py-3.5 px-5">Role</th>
                  <th className="py-3.5 px-5">Active</th>
                  <th className="py-3.5 px-5 text-right">Covers</th>
                  <th className="py-3.5 px-5 text-right">Claims</th>
                  <th className="py-3.5 px-5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {users.map((u) => {
                  const name = u.passengerProfile?.fullName || u.driverProfile?.fullName || '—';
                  const contact = u.phone || u.email || '—';
                  const role = u.role || '—';
                  const badge = roleStyle[role] || 'bg-slate-50 border-slate-200 text-slate-600';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-5 font-black text-safe-ink">{name}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600">{contact}</td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${badge}`}>
                          {role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Yes
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">No</span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-right font-black text-safe-ink">{u._count?.passengerTripCovers ?? 0}</td>
                      <td className="py-3.5 px-5 text-right font-black text-safe-ink">{u._count?.passengerClaims ?? 0}</td>
                      <td className="py-3.5 px-5 text-xs font-semibold text-slate-600 whitespace-nowrap">{fmtDate(u.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
            Showing {users.length} user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
