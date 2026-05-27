import React, { useEffect, useState } from 'react';
import {
  createStaffUser,
  dashboardStaff,
  loadDashboardToken,
  updateStaffUser,
} from '../api/dashboardApi.js';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import {
  Card,
  DataTable,
  ErrorCard,
  LoadingBlock,
  PageHeader,
  StatusBadge,
} from '../components/admin/ui.jsx';
import { fmtDateTime } from '../lib/format.js';

const ROLES = [
  'super_admin',
  'admin',
  'operations_manager',
  'claims_officer',
  'finance_officer',
  'support_agent',
  'fleet_manager',
  'partner_manager',
  'auditor',
];

export default function StaffUsersPage() {
  const token = loadDashboardToken();
  const { can } = useDashboardSession();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    email: '',
    fullName: '',
    phone: '',
    role: 'support_agent',
    password: '',
  });
  const [note, setNote] = useState('');

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const data = await dashboardStaff(token, {
        search: search || undefined,
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: statusFilter,
      });
      setStaff(data.staff || []);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token, search, roleFilter, statusFilter]);

  if (!can('staff.manage')) {
    return null;
  }

  async function handleCreate(e) {
    e.preventDefault();
    setNote('');
    try {
      const data = await createStaffUser(token, form);
      setNote(data.temporaryPasswordNote || 'Staff user created.');
      setShowCreate(false);
      setForm({ email: '', fullName: '', phone: '', role: 'support_agent', password: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleEditRole(userId, role, isActive) {
    try {
      await updateStaffUser(token, userId, { role, isActive });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff users"
        subtitle="Company dashboard accounts and roles. Email invitations are not connected yet."
        actions={
          <button
            type="button"
            className="rounded-lg bg-safe-ink px-4 py-2 text-sm font-bold text-white"
            onClick={() => setShowCreate(true)}
          >
            Add staff user
          </button>
        }
      />

      {error ? <ErrorCard message={error} /> : null}
      {note ? (
        <Card>
          <p className="text-sm text-amber-900">{note}</p>
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </Card>

      {loading ? (
        <LoadingBlock label="Loading staff…" />
      ) : (
        <DataTable
          columns={[
            { key: 'name', label: 'Name', render: (r) => r.fullName || '—' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role', render: (r) => <StatusBadge tone="neutral">{r.role}</StatusBadge> },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <StatusBadge tone={r.isActive ? 'success' : 'warning'}>
                  {r.isActive ? 'active' : 'inactive'}
                </StatusBadge>
              ),
            },
            { key: 'createdAt', label: 'Created', render: (r) => fmtDateTime(r.createdAt) },
            {
              key: 'actions',
              label: 'Actions',
              render: (r) => (
                <button
                  type="button"
                  className="text-xs font-bold text-safe-ink"
                  onClick={() => setEditing(r)}
                >
                  Edit
                </button>
              ),
            },
          ]}
          rows={staff}
          emptyLabel="No staff users match your filters."
        />
      )}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-safe-ink mb-3">Add staff user</h2>
            <form className="grid gap-3" onSubmit={handleCreate}>
              <label className="text-sm">
                Full name
                <input
                  required
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Email
                <input
                  required
                  type="email"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Phone (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Role
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Temporary password
                <input
                  required
                  type="password"
                  minLength={8}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <p className="text-xs text-slate-500">
                Temporary password must be changed manually after first login. Email invitation is not connected yet.
              </p>
              <div className="flex gap-2 justify-end">
                <button type="button" className="text-sm font-semibold" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-safe-ink px-4 py-2 text-sm font-bold text-white">
                  Create
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <Card className="w-full max-w-md">
            <h2 className="text-lg font-bold text-safe-ink mb-3">Edit staff user</h2>
            <p className="text-sm text-slate-600 mb-3">{editing.email}</p>
            <div className="grid gap-3">
              <label className="text-sm">
                Role
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  defaultValue={editing.role}
                  id="edit-role"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" defaultChecked={editing.isActive} id="edit-active" />
                Active
              </label>
              <div className="flex gap-2 justify-end">
                <button type="button" className="text-sm font-semibold" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-safe-ink px-4 py-2 text-sm font-bold text-white"
                  onClick={() => {
                    const role = document.getElementById('edit-role').value;
                    const isActive = document.getElementById('edit-active').checked;
                    handleEditRole(editing.id, role, isActive);
                    setEditing(null);
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
