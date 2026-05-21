import React, { useEffect, useState, useMemo } from 'react';
import { 
  Search, 
  FileText, 
  Image as ImageIcon, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  X, 
  User, 
  Calendar, 
  MapPin, 
  Maximize2,
  ChevronRight,
  TrendingUp,
  Download,
  AlertTriangle
} from 'lucide-react';
import { dashboardClaims, approveClaim, rejectClaim, loadDashboardToken } from '../api/dashboardApi.js';

export default function ClaimsPage() {
  const [claims, setClaims] = useState([]);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [successToast, setSuccessToast] = useState('');

  // Fetch claims on load
  const fetchClaims = async () => {
    const token = loadDashboardToken();
    if (!token) {
      setError('Admin token not found. Please log in first using the "Admin login" button above.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dashboardClaims(token);
      setClaims(data.claims || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Failed to load claims queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Set selected claim object
  const selectedClaim = useMemo(() => {
    return claims.find(c => c.id === selectedClaimId) || null;
  }, [claims, selectedClaimId]);

  // Handle Approve Claim Action
  const handleApprove = async (claimId) => {
    const token = loadDashboardToken();
    if (!token) return;
    setActionBusy(true);
    setError('');
    try {
      await approveClaim(token, claimId);
      // Update local state to show approved
      setClaims(prev => prev.map(c => {
        if (c.id === claimId) {
          return { ...c, status: 'approved' };
        }
        return c;
      }));
      setSuccessToast(`Claim Approved Successfully! Payout of ZMW 1,200 has been dispatched in status 'pending'.`);
      setTimeout(() => setSuccessToast(''), 6000);
    } catch (err) {
      setError(err?.message || 'Failed to approve claim');
    } finally {
      setActionBusy(false);
    }
  };

  // Handle Reject Claim Action
  const handleReject = async (claimId) => {
    const token = loadDashboardToken();
    if (!token) return;
    setActionBusy(true);
    setError('');
    try {
      await rejectClaim(token, claimId);
      // Update local state to show rejected
      setClaims(prev => prev.map(c => {
        if (c.id === claimId) {
          return { ...c, status: 'rejected' };
        }
        return c;
      }));
      setSuccessToast('Claim has been rejected.');
      setTimeout(() => setSuccessToast(''), 4000);
    } catch (err) {
      setError(err?.message || 'Failed to reject claim');
    } finally {
      setActionBusy(false);
    }
  };

  // Count helper for badge tabs
  const tabCounts = useMemo(() => {
    const counts = { All: claims.length, Pending: 0, Approved: 0, Rejected: 0 };
    claims.forEach(c => {
      if (c.status === 'submitted' || c.status === 'processing') counts.Pending++;
      else if (c.status === 'approved') counts.Approved++;
      else if (c.status === 'rejected') counts.Rejected++;
    });
    return counts;
  }, [claims]);

  // Filtering & Searching Logic
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      // 1. Status Filter
      if (statusFilter === 'Pending' && c.status !== 'submitted' && c.status !== 'processing') return false;
      if (statusFilter === 'Approved' && c.status !== 'approved') return false;
      if (statusFilter === 'Rejected' && c.status !== 'rejected') return false;

      // 2. Search Query Filter
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      const name = c.passengerUser?.passengerProfile?.fullName?.toLowerCase() || '';
      const phone = c.passengerUser?.phone?.toLowerCase() || '';
      const policyId = c.tripCover?.id?.toLowerCase() || '';
      const vehicle = c.tripCover?.vehicle?.plateNumber?.toLowerCase() || '';
      const routeStr = `${c.tripCover?.route?.origin || ''} ${c.tripCover?.route?.destination || ''}`.toLowerCase();
      const policeRef = c.policeReference?.toLowerCase() || '';
      const desc = c.description?.toLowerCase() || '';

      return name.includes(term) || 
             phone.includes(term) || 
             policyId.includes(term) || 
             vehicle.includes(term) || 
             routeStr.includes(term) || 
             policeRef.includes(term) || 
             desc.includes(term);
    });
  }, [claims, searchQuery, statusFilter]);

  // Formatter for DateTime
  const formatDate = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-emerald-600 border border-emerald-500 px-5 py-4 text-white shadow-2xl flex items-center gap-3 animate-slide-in max-w-md">
          <CheckCircle size={24} className="shrink-0 animate-bounce" />
          <div className="text-sm font-semibold">{successToast}</div>
          <button onClick={() => setSuccessToast('')} className="hover:text-emerald-200">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink flex items-center gap-2">
            Claims Queue
            <span className="bg-slate-200 text-slate-700 text-xs font-black px-2.5 py-1 rounded-full">{tabCounts.All} Total</span>
          </div>
        </div>

        <button 
          onClick={fetchClaims} 
          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-black text-safe-ink flex items-center gap-2 shadow-sm transition active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Refresh Queue
        </button>
      </div>

      {/* Error Alert Box */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 flex items-start gap-3 shadow-sm">
          <AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
          <div>
            <div className="font-black text-red-900">Audit Operation Error</div>
            <div className="mt-1 text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Search and Filters Strip */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.03)] flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Segmented Tabs */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          {[
            { id: 'All', label: 'All' },
            { id: 'Pending', label: `Pending (${tabCounts.Pending})` },
            { id: 'Approved', label: `Approved (${tabCounts.Approved})` },
            { id: 'Rejected', label: `Rejected (${tabCounts.Rejected})` }
          ].map(tab => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all ${
                  active ? 'bg-safe-ink text-white shadow-sm' : 'text-slate-500 hover:text-safe-ink hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Live Search Box */}
        <div className="relative w-full md:w-80">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search claims, name, plate, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 focus:border-safe-ink focus:bg-white rounded-xl text-xs font-semibold text-safe-ink outline-none transition"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Queue Table & Detail Drawer */}
      <div className={`grid grid-cols-1 ${selectedClaim ? 'xl:grid-cols-3' : 'grid-cols-1'} gap-3 items-start`}>
        {/* Claims Table Container */}
        <div className={`rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-[0_10px_30px_rgba(2,6,23,0.03)] ${selectedClaim ? 'xl:col-span-2' : ''}`}>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col justify-center items-center gap-3">
                <div className="h-10 w-10 border-4 border-slate-200 border-t-safe-ink rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Analyzing database claims queue…</span>
              </div>
            ) : filteredClaims.length === 0 ? (
              <div className="py-20 text-center px-4">
                <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full grid place-items-center mx-auto mb-4">
                  <FileText size={32} />
                </div>
                <h3 className="text-sm font-black text-safe-ink">No claims match filters</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  There are no submitted claims under this filter option or matching your query criteria.
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setStatusFilter('All'); }} 
                    className="mt-4 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-safe-ink hover:bg-slate-200 transition"
                  >
                    Clear Filter Search
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-5">Commuter</th>
                    <th className="py-4 px-4">Trip / Route</th>
                    <th className="py-4 px-4">Policy Reference</th>
                    <th className="py-4 px-4">Filed On</th>
                    <th className="py-4 px-4 text-center">Hospital Slip</th>
                    <th className="py-4 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredClaims.map((claim) => {
                    const isSelected = selectedClaimId === claim.id;
                    const commName = claim.passengerUser?.passengerProfile?.fullName || 'Commuter';
                    const commPhone = claim.passengerUser?.phone || 'No phone';
                    const plate = claim.tripCover?.vehicle?.plateNumber || 'Unknown';
                    const origin = claim.tripCover?.route?.origin || 'Departure';
                    const dest = claim.tripCover?.route?.destination || 'Arrival';
                    const dateStr = formatDate(claim.createdAt);
                    
                    return (
                      <tr 
                        key={claim.id} 
                        onClick={() => setSelectedClaimId(claim.id === selectedClaimId ? null : claim.id)}
                        className={`cursor-pointer hover:bg-slate-50/60 transition duration-150 ${
                          isSelected ? 'bg-safe-ink/5' : ''
                        }`}
                      >
                        {/* Commuter */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-safe-ink text-white font-black text-xs rounded-full grid place-items-center shrink-0">
                              {commName[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-black text-safe-ink leading-tight">{commName}</div>
                              <div className="text-[10px] font-semibold text-slate-400 mt-0.5">{commPhone}</div>
                            </div>
                          </div>
                        </td>

                        {/* Trip & Route */}
                        <td className="py-4 px-4">
                          <div className="text-xs font-black text-safe-ink leading-tight flex items-center gap-1.5">
                            <span>{origin}</span>
                            <span className="text-[10px] text-slate-400">→</span>
                            <span>{dest}</span>
                          </div>
                          <div className="mt-1">
                            <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md text-[9px] font-black text-slate-600 uppercase tracking-wide">
                              {plate}
                            </span>
                          </div>
                        </td>

                        {/* Policy */}
                        <td className="py-4 px-4">
                          <div className="text-[11px] font-black text-safe-ink leading-tight">{claim.tripCover?.id || '—'}</div>
                          <div className="text-[9px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                            <Shield size={10} className="shrink-0" />
                            {claim.policeReference ? (
                              <span className="font-bold text-slate-700 bg-slate-100 rounded px-1">{claim.policeReference}</span>
                            ) : (
                              <span className="italic">No police ref</span>
                            )}
                          </div>
                        </td>

                        {/* Filed On */}
                        <td className="py-4 px-4 text-xs font-semibold text-slate-600">
                          {dateStr}
                        </td>

                        {/* Document Indicator */}
                        <td className="py-4 px-4 text-center">
                          {claim.hospitalSlipUrl ? (
                            <span 
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase"
                              title="Medical documentation attached"
                            >
                              <ImageIcon size={10} />
                              Attached
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-400">
                              None
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-block rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                              claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              claim.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                              claim.status === 'processing' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              'bg-slate-100 text-slate-800 border border-slate-200'
                            }`}>
                              {claim.status === 'submitted' ? 'New Submission' : claim.status}
                            </span>
                            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Claim Review Sidebar Detail Panel */}
        {selectedClaim && (
          <aside className="rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(2,6,23,0.06)] overflow-hidden animate-slide-in shrink-0">
            {/* Drawer Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-start justify-between">
              <div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  selectedClaim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  selectedClaim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  selectedClaim.status === 'processing' ? 'bg-amber-100 text-amber-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {selectedClaim.status}
                </span>
                <h2 className="mt-1.5 text-base font-black text-safe-ink">
                  {selectedClaim.passengerUser?.passengerProfile?.fullName || 'Commuter Claim'}
                </h2>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                  ID: {selectedClaim.id}
                </p>
              </div>
              <button 
                onClick={() => setSelectedClaimId(null)}
                className="h-8 w-8 rounded-lg border border-slate-200 bg-white grid place-items-center hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition shadow-sm"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Commuter Information Card */}
              <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50/50">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2"> commuter & policy details</div>
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Mobile Phone:</span>
                    <strong className="font-bold text-safe-ink">{selectedClaim.passengerUser?.phone || '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Policy Reference:</span>
                    <strong className="font-bold text-safe-ink tracking-tight">{selectedClaim.tripCover?.id || '—'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Cover Plan Level:</span>
                    <strong className="font-bold text-safe-ink capitalize">
                      {selectedClaim.tripCover?.plan === 'plus' ? 'Plus Cover (K5)' : 'Basic Cover (K3)'}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Claim Date filed:</span>
                    <strong className="font-bold text-safe-ink">{formatDate(selectedClaim.createdAt)}</strong>
                  </div>
                </div>
              </div>

              {/* Trip Route Details */}
              <div className="rounded-2xl border border-slate-200 p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Journey securing Intel</div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center text-safe-ink shrink-0">
                    <span className="material-symbols-outlined text-[20px]">commute</span>
                  </div>
                  <div>
                    <strong className="block text-xs font-black text-safe-ink">
                      {selectedClaim.tripCover?.route?.origin || 'Matero'} to {selectedClaim.tripCover?.route?.destination || 'Town'}
                    </strong>
                    <div className="mt-0.5 text-[10px] font-semibold text-slate-500">
                      Minibus plate: <span className="font-black text-slate-800">{selectedClaim.tripCover?.vehicle?.plateNumber || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Accident Narrative */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Commuter Accident Narrative</div>
                <blockquote className="rounded-2xl border border-slate-150 bg-slate-50 p-3.5 text-xs text-slate-700 italic font-semibold leading-relaxed relative overflow-hidden">
                  <div className="absolute right-2.5 bottom-0 text-slate-200/50 font-black text-4xl select-none">“</div>
                  {selectedClaim.description}
                </blockquote>
              </div>

              {/* Police / RTSA ref details */}
              <div className="rounded-2xl border border-slate-200 p-3 flex justify-between items-center bg-slate-50/20">
                <div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">RTSA / Police Report Ref</div>
                  <strong className="block text-xs font-black text-safe-ink mt-0.5">
                    {selectedClaim.policeReference || 'No report attached'}
                  </strong>
                </div>
                <div className="h-8 w-8 rounded-lg bg-red-50 text-red-600 grid place-items-center border border-red-100 shrink-0">
                  <Shield size={16} />
                </div>
              </div>

              {/* Medical Document upload / preview */}
              <div className="space-y-1.5">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hospital Medical Slip Evidence</div>
                {selectedClaim.hospitalSlipUrl ? (
                  <div className="group border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-slate-50 relative min-h-[160px] flex flex-col justify-center items-center">
                    <img 
                      src={selectedClaim.hospitalSlipUrl} 
                      alt="Commuter medical slip evidence" 
                      className="max-h-[150px] object-contain cursor-zoom-in transition duration-300 group-hover:scale-[1.03]"
                      onClick={() => setLightboxUrl(selectedClaim.hospitalSlipUrl)}
                    />
                    <div className="absolute inset-0 bg-safe-ink/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                      <button 
                        onClick={() => setLightboxUrl(selectedClaim.hospitalSlipUrl)}
                        className="rounded-xl bg-white text-safe-ink px-3.5 py-2 text-xs font-black shadow-lg flex items-center gap-1.5 hover:scale-105 transition"
                      >
                        <Maximize2 size={13} />
                        Zoom Slip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 py-6 text-center text-slate-400">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-slate-300" />
                    <span className="text-[10px] font-bold">No hospital admission slip attached</span>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-2">
              {selectedClaim.status === 'submitted' || selectedClaim.status === 'processing' ? (
                <>
                  <button
                    disabled={actionBusy}
                    onClick={() => handleApprove(selectedClaim.id)}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {actionBusy ? (
                      <span className="h-4.5 w-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    <span>Approve & Disburse Payout (ZMW 1,200)</span>
                  </button>

                  <button
                    disabled={actionBusy}
                    onClick={() => handleReject(selectedClaim.id)}
                    className="w-full py-2.5 bg-white border border-red-200 hover:bg-red-50 disabled:opacity-50 text-red-600 text-xs font-bold rounded-xl transition active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {actionBusy ? (
                      <span className="h-4 w-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    <span>Reject Commuter Claim</span>
                  </button>
                </>
              ) : selectedClaim.status === 'approved' ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-center text-xs font-semibold text-emerald-800">
                  <div className="font-black text-emerald-950 flex items-center justify-center gap-1.5">
                    <CheckCircle size={15} /> Approved & Paid
                  </div>
                  <div className="mt-1 text-[10px] text-emerald-700">
                    A ZMW 1,200 payout was successfully issued to Moses Banda. Reference ID is set in audit logs.
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center text-xs font-semibold text-red-800">
                  <div className="font-black text-red-950 flex items-center justify-center gap-1.5">
                    <XCircle size={15} /> Rejected & Archived
                  </div>
                  <div className="mt-0.5 text-[10px] text-red-600">
                    This claim request has been marked as rejected and closed. Commuter notified.
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Lightbox / Fullscreen Modal Document Viewer */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-safe-ink/90 backdrop-blur-md flex flex-col justify-center items-center p-4">
          <div className="absolute top-4 right-4 flex gap-3">
            <a 
              href={lightboxUrl} 
              download="Commuter_Medical_Slip.svg"
              className="h-10 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center gap-2 transition"
            >
              <Download size={15} />
              Download
            </a>
            <button 
              onClick={() => setLightboxUrl(null)} 
              className="h-10 w-10 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white grid place-items-center transition"
            >
              <X size={20} />
            </button>
          </div>
          <div className="max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            <img 
              src={lightboxUrl} 
              alt="Medical document fullscreen display" 
              className="max-h-[80vh] max-w-full object-contain rounded-2xl bg-white p-3 shadow-2xl animate-scale-up" 
            />
          </div>
          <div className="mt-4 text-xs font-semibold text-white/70 max-w-md text-center">
            Lusaka Commuter Accident Claim Evidence · Hospital Slip Audit
          </div>
        </div>
      )}
    </div>
  );
}
