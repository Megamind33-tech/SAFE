import React, { useEffect, useState } from 'react';
import { dashboardMetrics, loadDashboardToken } from '../api/dashboardApi.js';
import { 
  Users, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Activity, 
  QrCode, 
  ShoppingBag,
  Sparkles,
  MapPin,
  TrendingUp,
  Compass
} from 'lucide-react';

function KPI({ label, value, sub, icon: Icon, colorClass }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.03)] hover:shadow-[0_10px_30px_rgba(2,6,23,0.06)] transition-all flex items-start justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-2 text-3xl font-black tracking-tight text-safe-ink">{value}</div>
        {sub ? <div className="mt-1.5 text-xs font-semibold text-slate-500">{sub}</div> : null}
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const [activePulse, setActivePulse] = useState(0);

  useEffect(() => {
    const token = loadDashboardToken();
    if (!token) return;
    dashboardMetrics(token)
      .then((data) => setMetrics(data.metrics ?? null))
      .catch((e) => setError(e?.message || 'Failed to load metrics'));
  }, []);

  // Set up minor map animation pulse interval
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePulse(prev => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Compute conversion rates
  const scansCount = metrics?.scans ?? 0;
  const purchasesCount = metrics?.purchases ?? 0;
  const conversionRate = scansCount > 0 ? ((purchasesCount / scansCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.6); opacity: 0; }
          50% { opacity: 0.5; }
          100% { transform: scale(1.8); opacity: 0; }
          default_api:run_command: wait
        }
        @keyframes dash {
          to { stroke-dashoffset: -40; }
        }
        .pulse-circle {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
        }
        .anim-flow {
          stroke-dasharray: 8, 4;
          animation: dash 4s linear infinite;
        }
      `}</style>

      <div>
        <div className="text-2xl md:text-3xl font-black tracking-tight text-safe-ink">Dashboard Overview</div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-black text-red-700 flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI 
          label="Registered Users" 
          value={metrics ? String(metrics.users) : '—'} 
          sub="Passengers & drivers" 
          icon={Users}
          colorClass="bg-slate-100 text-safe-ink"
        />
        <KPI 
          label="Active Covers" 
          value={metrics ? String(metrics.activeCovers) : '—'} 
          sub="Currently in transit" 
          icon={ShieldCheck}
          colorClass="bg-emerald-50 text-emerald-700 border border-emerald-100"
        />
        <KPI 
          label="Claims Pending" 
          value={metrics ? String(metrics.claimsPending) : '—'} 
          sub="Requiring operations review" 
          icon={FileText}
          colorClass="bg-amber-50 text-amber-700 border border-amber-100"
        />
        <KPI 
          label="Fraud Flags Raised" 
          value={metrics ? String(metrics.fraudFlags) : '—'} 
          sub="Risk assessment queue" 
          icon={AlertTriangle}
          colorClass="bg-rose-50 text-rose-700 border border-rose-100"
        />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Zambia Operations Map SVG Component */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <div className="text-sm font-black text-safe-ink flex items-center gap-2">
                <Compass size={16} className="text-safe-ink" />
                Lusaka Transit Veins
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Radar
            </span>
          </div>

          <div className="relative h-72 rounded-2xl border border-slate-150 bg-slate-950 overflow-hidden shadow-inner flex items-center justify-center">
            {/* Grid Overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle, #34d399 1.5px, transparent 1.5px)',
              backgroundSize: '24px 24px'
            }} />

            {/* Vector Route Arteries */}
            <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 500 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Route Arteries (Matero to Town) */}
              <path d="M 50 250 Q 150 240 220 180 T 350 120 T 450 50" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
              <path d="M 50 250 Q 150 240 220 180 T 350 120 T 450 50" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" className="anim-flow" />

              {/* Cross Routes */}
              <path d="M 220 180 Q 280 260 400 270" stroke="#1e293b" strokeWidth="2.5" strokeDasharray="4 4" />
              <path d="M 120 50 Q 220 100 350 120" stroke="#1e293b" strokeWidth="2.5" strokeDasharray="4 4" />

              {/* Station Indicators & Glows */}
              {/* Station 1: Matero */}
              <g className="cursor-pointer">
                <circle cx="50" cy="250" r="12" className="pulse-circle fill-emerald-500/20" />
                <circle cx="50" cy="250" r="5" fill="#34d399" />
                <text x="50" y="275" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">MATERO TERMINAL</text>
              </g>

              {/* Station 2: Lumumba Road Junction */}
              <g className="cursor-pointer">
                <circle cx="220" cy="180" r="10" className="pulse-circle fill-emerald-500/20" style={{ animationDelay: '0.6s' }} />
                <circle cx="220" cy="180" r="4.5" fill="#34d399" />
                <text x="235" y="184" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="start">LUMUMBA RD</text>
              </g>

              {/* Station 3: Cairo Road */}
              <g className="cursor-pointer">
                <circle cx="350" cy="120" r="10" className="pulse-circle fill-emerald-500/20" style={{ animationDelay: '1.2s' }} />
                <circle cx="350" cy="120" r="4.5" fill="#34d399" />
                <text x="365" y="124" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="start">CAIRO RD JUNCTION</text>
              </g>

              {/* Station 4: Town Main Terminal */}
              <g className="cursor-pointer">
                <circle cx="450" cy="50" r="12" className="pulse-circle fill-emerald-500/20 animate-pulse" />
                <circle cx="450" cy="50" r="5" fill="#34d399" />
                <text x="450" y="32" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle">TOWN MAIN TERMINAL</text>
              </g>

              {/* Pulsating active minibuses in motion */}
              {activePulse === 0 && (
                <circle cx="130" cy="225" r="4" fill="#fbbf24" className="animate-ping" />
              )}
              {activePulse === 1 && (
                <circle cx="280" cy="150" r="4" fill="#fbbf24" className="animate-ping" />
              )}
              {activePulse === 2 && (
                <circle cx="400" cy="85" r="4" fill="#fbbf24" className="animate-ping" />
              )}
            </svg>

            {/* Float details HUD */}
            <div className="absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 rounded-xl p-3 backdrop-blur-sm shadow-2xl flex flex-col gap-1 min-w-[150px]">
              <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">Live Telemetry</span>
              <strong className="text-white text-xs font-black flex items-center gap-1.5 mt-0.5">
                <Activity size={14} className="text-emerald-400" />
                Matero ➔ Town Line
              </strong>
              <small className="text-[10px] font-semibold text-slate-400 mt-0.5">Live vehicle counts require trip tracking feed</small>
            </div>
          </div>
        </div>

        {/* QR Conversion KPI Panel Component */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(2,6,23,0.03)] flex flex-col justify-between">
          <div className="border-b border-slate-100 pb-3">
            <div className="text-sm font-black text-safe-ink flex items-center gap-2">
              <TrendingUp size={16} className="text-safe-ink" />
              Checkout Funnel Conversion
            </div>
          </div>

          <div className="my-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-black text-slate-600">
                <span className="flex items-center gap-1.5">
                  <QrCode size={16} className="text-slate-400" />
                  Vehicle QR Scans
                </span>
                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-black">{scansCount}</span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-slate-900 transition-all duration-500" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3.5 relative overflow-hidden">
              <div className="flex justify-between items-center text-xs font-black text-slate-600">
                <span className="flex items-center gap-1.5">
                  <ShoppingBag size={16} className="text-emerald-600" />
                  Purchased Policies
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-black">{purchasesCount}</span>
              </div>
              <div className="mt-2.5 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${conversionRate}%` }}></div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 p-4 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-black text-safe-ink">{conversionRate}%</div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">Scans-to-Covers Conversion</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
