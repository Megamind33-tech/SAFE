import React, { useEffect, useState, useMemo } from 'react';
import { dashboardDrivers, onboardDriver, loadDashboardToken } from '../api/dashboardApi.js';
import { 
  User, 
  Plus, 
  Search, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  X, 
  TrendingUp, 
  Star, 
  Clock, 
  Phone, 
  FileText, 
  Navigation,
  Key,
  CreditCard
} from 'lucide-react';

export default function CustomersPage() {
  const [drivers, setDrivers] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  // Fetch all drivers
  const fetchDrivers = async () => {
    const token = loadDashboardToken();
    if (!token) {
      setError('Admin token not found. Please log in first.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dashboardDrivers(token);
      const roster = data.drivers || [];
      setDrivers(roster);
      setError('');
      if (roster.length > 0 && !selectedId) {
        setSelectedId(roster[0].id);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load drivers roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Set selected driver details
  const selected = useMemo(() => {
    const d = drivers.find((x) => x.id === selectedId);
    if (!d) return drivers[0] || null;

    const vehicle = d.vehicles?.[0];
    const plate = vehicle?.plateNumber || 'None';
    const route = vehicle?.route ? `${vehicle.route.origin} to ${vehicle.route.destination}` : 'Unassigned';
    const compliance = d.licenseNumber ? 'License on file' : 'License not recorded';
    const status = d.user?.isActive ? 'Active' : 'Offline';

    return {
      ...d,
      role: d.licenseNumber ? 'Licensed driver' : 'Driver',
      compliance,
      status,
      plate,
      route,
      vehicleCount: d.vehicles?.length ?? 0,
    };
  }, [drivers, selectedId]);

  // Handle onboarding submission
  const handleOnboard = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!fullName.trim() || !phone.trim() || !password.trim()) {
      setFormError('Name, Phone number, and Password are required.');
      return;
    }

    const token = loadDashboardToken();
    if (!token) {
      setFormError('Authentication required. Log in again.');
      return;
    }

    setFormBusy(true);
    try {
      await onboardDriver(token, {
        fullName: fullName.trim(),
        phone: phone.trim(),
        password: password.trim(),
        licenseNumber: licenseNumber.trim() || undefined,
        plateNumber: plateNumber.trim().toUpperCase() || undefined,
      });

      setSuccessToast(`Successfully onboarded driver ${fullName}!`);
      setTimeout(() => setSuccessToast(''), 5000);

      // Reset form & close
      setFullName('');
      setPhone('');
      setPassword('password123');
      setLicenseNumber('');
      setPlateNumber('');
      setShowOnboardModal(false);

      // Refresh list
      await fetchDrivers();
    } catch (err) {
      setFormError(err?.message || 'Failed to onboard driver.');
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-6 right-6 z-[80] bg-emerald-500 text-slate-950 font-black text-xs px-5 py-4 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-emerald-400 flex items-center gap-3 animate-bounce">
          <CheckCircle size={18} />
          <span>{successToast}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Driver Management</div>
        </div>
        <button 
          type="button" 
          onClick={() => setShowOnboardModal(true)}
          className="rounded-xl bg-safe-ink px-5 py-3 text-xs font-black text-white hover:bg-safe-midnight inline-flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(2,6,23,0.1)] active:scale-98 transition-all"
        >
          <Plus size={18} />
          Onboard Driver
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="h-96 rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-safe-ink animate-spin" />
          <span className="text-xs font-bold uppercase tracking-wider">Loading Fleet Records...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-3">
          
          {/* Active Directory Table Panel */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden flex flex-col justify-between">
            <div className="p-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-black tracking-tight text-safe-ink">Active Directory</div>
              </div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">
                {drivers.length} Driver{drivers.length !== 1 ? 's' : ''} Listed
              </span>
            </div>

            <div className="overflow-auto min-h-[400px] max-h-[620px]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    <th className="py-3.5 px-5">Driver</th>
                    <th className="py-3.5 px-5">Phone</th>
                    <th className="py-3.5 px-5">Vehicles</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {drivers.map((d) => {
                    const active = d.id === selectedId;
                    const compliance = d.licenseNumber ? 'License on file' : 'License not recorded';
                    const status = d.user?.isActive ? 'Active' : 'Offline';

                    return (
                      <tr
                        key={d.id}
                        onClick={() => setSelectedId(d.id)}
                        className={[
                          'cursor-pointer hover:bg-slate-50/50 transition-colors',
                          active ? 'bg-slate-900/[0.03]' : '',
                        ].join(' ')}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-900/5 border border-slate-200 shrink-0 flex items-center justify-center text-safe-ink font-black text-xs select-none">
                              {d.fullName ? d.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                            </div>
                            <div>
                              <div className="text-sm font-black text-safe-ink leading-tight">{d.fullName}</div>
                              <div className="mt-1 text-[10px] font-semibold text-slate-500">
                                {d.user?.phone || 'No phone'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-slate-600 font-bold text-xs">
                          {d.licenseNumber || '—'}
                        </td>
                        <td className="py-4 px-5 text-slate-600 font-bold text-xs">
                          {d.vehicles?.length ?? 0}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={[
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              status === 'Active'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-500',
                            ].join(' ')}
                          >
                            <span
                              className={[
                                'h-1.5 w-1.5 rounded-full',
                                status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300',
                              ].join(' ')}
                              aria-hidden="true"
                            />
                            {status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          <span
                            className={[
                              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              compliance === 'License on file'
                                ? 'bg-slate-50 border-slate-200 text-safe-ink'
                                : 'bg-amber-50 border-amber-200 text-amber-700',
                            ].join(' ')}
                          >
                            {compliance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>Showing 1–{drivers.length} of {drivers.length} records</span>
              <div className="flex gap-2">
                <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-400" disabled>
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    chevron_left
                  </span>
                </button>
                <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-400" disabled>
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                    chevron_right
                  </span>
                </button>
              </div>
            </div>
          </section>

          {/* Sidebar Audit Panel */}
          {selected ? (
            <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.04)] overflow-hidden flex flex-col justify-between">
              <div className="flex flex-col">
                <div className="p-4 bg-safe-ink text-white relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,1)_1px,transparent_0)] [background-size:16px_16px]" />
                  <div className="relative flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-black text-lg select-none">
                      {selected.fullName ? selected.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                    </div>
                    <div>
                      <div className="text-lg font-black leading-tight">{selected.fullName}</div>
                      <div className="mt-1 text-xs font-semibold text-white/70">{selected.role}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3.5 overflow-auto max-h-[500px]">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicles</div>
                      <div className="mt-1 text-lg font-black text-safe-ink">{selected.vehicleCount}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</div>
                      <div className="mt-1 text-sm font-black text-safe-ink">{selected.user?.phone || '—'}</div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Transport Asset Map</div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Minibus Plate</span>
                      <strong className="text-safe-ink font-bold bg-slate-100 px-2 py-0.5 rounded uppercase">{selected.plate}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Route Assigned</span>
                      <strong className="text-safe-ink font-bold">{selected.route}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">License</div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <div className="font-bold text-safe-ink">{selected.licenseNumber || 'Not recorded'}</div>
                      <div className="text-slate-500 mt-1">{selected.compliance}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2 shrink-0">
                <div className="flex gap-2">
                  <a 
                    href={`tel:${selected.user?.phone}`}
                    className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50 flex items-center justify-center gap-1.5"
                  >
                    <Phone size={14} />
                    Call Driver
                  </a>
                  <button 
                    type="button" 
                    className="flex-1 rounded-xl bg-safe-ink py-2.5 text-xs font-black text-white hover:bg-safe-midnight flex items-center justify-center gap-1.5"
                  >
                    <Navigation size={14} />
                    View Route
                  </button>
                </div>
              </div>
            </aside>
          ) : (
            <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.02)] p-6 text-center text-slate-400 flex flex-col items-center justify-center">
              <User size={36} className="text-slate-300 mb-2" />
              <span className="text-xs font-bold">Select a driver from the roster to inspect profile details.</span>
            </aside>
          )}
        </div>
      )}

      {/* Onboard Driver Modal Overlay */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[90] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <header className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-black text-safe-ink tracking-tight flex items-center gap-2">
                  <User size={20} className="text-safe-ink" />
                  Onboard Fleet Operator
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowOnboardModal(false);
                  setFormError('');
                }}
                className="h-8 w-8 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-safe-ink flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </header>

            {/* Modal Form */}
            <form onSubmit={handleOnboard}>
              <div className="p-4 space-y-3 max-h-[460px] overflow-y-auto">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-black flex items-center gap-2.5">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User size={12} />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Obby Tembo"
                    className="w-full bg-slate-50 border border-slate-200 text-safe-ink rounded-xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:border-safe-ink focus:ring-2 focus:ring-safe-ink/10 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Phone size={12} />
                      Mobile Phone <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +260 96 111 2222"
                      className="w-full bg-slate-50 border border-slate-200 text-safe-ink rounded-xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:border-safe-ink focus:ring-2 focus:ring-safe-ink/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Key size={12} />
                      Operator Password <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-safe-ink rounded-xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:border-safe-ink focus:ring-2 focus:ring-safe-ink/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText size={12} />
                      Commercial License (CDL)
                    </label>
                    <input 
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. CDL-719-880B"
                      className="w-full bg-slate-50 border border-slate-200 text-safe-ink rounded-xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:border-safe-ink focus:ring-2 focus:ring-safe-ink/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <CreditCard size={12} />
                      Minibus Plate Number
                    </label>
                    <input 
                      type="text"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      placeholder="e.g. LSK 9283"
                      className="w-full bg-slate-50 border border-slate-200 text-safe-ink rounded-xl py-3 px-3.5 text-xs font-semibold focus:outline-none focus:border-safe-ink focus:ring-2 focus:ring-safe-ink/10 transition-all uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <footer className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboardModal(false);
                    setFormError('');
                  }}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-safe-ink hover:bg-slate-50"
                  disabled={formBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formBusy}
                  className="rounded-xl bg-safe-ink px-5 py-2.5 text-xs font-black text-white hover:bg-safe-midnight flex items-center gap-2 shadow-[0_4px_12px_rgba(2,6,23,0.1)] hover:shadow-[0_4px_16px_rgba(2,6,23,0.15)] transition-all active:scale-98"
                >
                  {formBusy ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border border-white border-t-transparent animate-spin shrink-0" />
                      Onboarding Operator...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Complete Onboarding
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
