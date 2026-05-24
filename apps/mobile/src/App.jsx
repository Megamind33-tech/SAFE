import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Bus,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  CreditCard,
  FileText,
  HelpCircle,
  HeartPulse,
  Home,
  Info,
  Lock,
  Mail,
  MapPin,
  MessageCircle,
  Menu,
  Navigation2,
  Plus,
  Radio,
  RefreshCcw,
  Search,
  Send,
  Share2,
  Shield,
  ShieldCheck,
  Siren,
  Smartphone,
  Upload,
  User,
  WalletCards,
} from 'lucide-react';
import zambiaScene from './assets/zambia-commute-scene.svg';
import safeLogo from './assets/SAFE_app_icon_master_3D_1024.png';
import safeRoadBackground from './assets/safe-road-background.png';
import shareTrackMap from './assets/share-track-map.png';
import lusakaNightAerial from './assets/lusaka-night-aerial.png';
import HomeScreen from './screens/HomeScreen.jsx';
import CoverScreen from './screens/CoverScreen.jsx';
import ViewPolicyScreen from './screens/ViewPolicyScreen.jsx';
import ClaimsScreen from './screens/ClaimsScreen.jsx';
import ClaimFlowDescribeStep from './screens/ClaimFlowDescribeStep.jsx';
import ClaimFlowUploadStep from './screens/ClaimFlowUploadStep.jsx';
import ClaimFlowReviewStep from './screens/ClaimFlowReviewStep.jsx';
import ClaimFlowSubmittedStep from './screens/ClaimFlowSubmittedStep.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import { createEmptyClaimDraft, buildClaimSubmitPayload, hasUploadInProgress, normalizeClaimDraft, normalizeClaimDocuments, primaryClaimSlipUrl } from './claimDraftUtils.js';
import navHomeIcon from './assets/pack/icons/nav-home.svg';
import navCoverIcon from './assets/pack/icons/nav-cover-active.svg';
import navClaimsIcon from './assets/pack/icons/nav-claims.svg';
import navAccountIcon from './assets/pack/icons/nav-account.svg';
import { buyCover, clearToken, createClaim, loadToken, login, me, registerPassenger, saveToken, activeCover, coverHistory, listClaims, verifyVehicle } from './api/safeApi.js';

const bgImage = zambiaScene;

const trip = {
  route: 'Matero to Town',
  vehicle: 'LSK 2481',
  departure: '09:40 AM',
  policy: 'SAFE-2026-0518-2943',
  validUntil: '13:42',
};

const coverPlans = [
  {
    id: 'basic',
    name: 'Basic Cover',
    price: 'K3',
    summary: 'Emergency accident cash support',
    payout: 'Up to K3,000',
    tone: 'silver',
  },
  {
    id: 'plus',
    name: 'Plus Cover',
    price: 'K5',
    summary: 'Higher payout plus accident and disability support',
    payout: 'Up to K5,000',
    tone: 'green',
  },
];

const historyItems = [
  {
    day: '18',
    month: 'May',
    year: '2026',
    route: 'Matero to Town',
    vehicle: 'LSK 2481',
    cover: 'Plus Cover (K5)',
    status: 'Active',
    type: 'active',
  },
  {
    day: '17',
    month: 'May',
    year: '2026',
    route: 'Kwino to Town',
    vehicle: 'BAE 5677',
    cover: 'Plus Cover (K5)',
    status: 'Active',
    type: 'active',
  },
  {
    day: '15',
    month: 'May',
    year: '2026',
    route: 'Matero to Town',
    vehicle: 'LSK 2481',
    cover: 'Basic Cover (K3)',
    status: 'Claim submitted',
    type: 'claim',
  },
  {
    day: '14',
    month: 'May',
    year: '2026',
    route: 'Chawama to Town',
    vehicle: 'BAE 5677',
    cover: 'Basic Cover (K3)',
    status: 'Expired',
    type: 'expired',
  },
];

const paymentMethods = [
  { id: 'airtel', name: 'Airtel Money', detail: 'Pay with Airtel Money', icon: Smartphone, accent: 'red' },
  { id: 'mtn', name: 'MTN Mobile Money', detail: 'Pay with MTN MoMo', icon: WalletCards, accent: 'yellow' },
  { id: 'card', name: 'Visa / Mastercard', detail: 'Card payment', icon: CreditCard, accent: 'blue' },
];

function App() {
  const [screen, setScreen] = useState('splash');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [paymentMethod, setPaymentMethod] = useState('airtel');
  const [claimDraft, setClaimDraft] = useState(() => createEmptyClaimDraft());
  const [submittedClaim, setSubmittedClaim] = useState(null);
  const [policeReference, setPoliceReference] = useState('');
  const [hospitalSlipUrl, setHospitalSlipUrl] = useState('');
  const [historyReturn, setHistoryReturn] = useState('active');
  const [viewPolicyReturn, setViewPolicyReturn] = useState('active');
  const [claimFlowStep, setClaimFlowStep] = useState(1);
  const [session, setSession] = useState(() => ({ token: loadToken(), user: null, ready: false }));

  // New Dynamic States
  const [activeCoverState, setActiveCoverState] = useState(null);
  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [coversHistory, setCoversHistory] = useState([]);
  const [claimsList, setClaimsList] = useState([]);
  
  // Scanner Modal States
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerType, setScannerType] = useState('qr'); // 'qr' or 'plate'
  const [plateInput, setPlateInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Real-time ticking countdown
  const [countdown, setCountdown] = useState('00:00:00');

  const refreshPassengerData = async (token) => {
    if (!token) return;
    try {
      const [activeRes, historyRes, claimsRes] = await Promise.all([
        activeCover(token),
        coverHistory(token),
        listClaims(token),
      ]);
      setActiveCoverState(activeRes?.cover || null);
      setCoversHistory(historyRes?.covers || []);
      setClaimsList(claimsRes?.claims || []);
    } catch (err) {
      console.error('Failed to load passenger data:', err);
    }
  };

  useEffect(() => {
    const token = loadToken();
    if (!token) {
      setSession({ token: '', user: null, ready: true });
      return;
    }

    me(token)
      .then((data) => {
        setSession({ token, user: data.user ?? null, ready: true });
        refreshPassengerData(token);
      })
      .catch(() => {
        clearToken();
        setSession({ token: '', user: null, ready: true });
      });
  }, []);

  useEffect(() => {
    if (session.token) {
      refreshPassengerData(session.token);
    } else {
      setActiveCoverState(null);
      setCoversHistory([]);
      setClaimsList([]);
    }
  }, [session.token]);

  useEffect(() => {
    if (!activeCoverState?.endsAt) {
      setCountdown('00:00:00');
      return;
    }

    const updateTimer = () => {
      const endsAt = new Date(activeCoverState.endsAt);
      const diff = endsAt.getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('00:00:00');
        refreshPassengerData(session.token);
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown([
        String(hours).padStart(2, '0'),
        String(minutes).padStart(2, '0'),
        String(seconds).padStart(2, '0')
      ].join(':'));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeCoverState?.endsAt]);

  const activePlan = useMemo(
    () => coverPlans.find((plan) => plan.id === selectedPlan) ?? coverPlans[1],
    [selectedPlan]
  );

  const goHome = () => setScreen('home');
  const goCover = () => setScreen('active');
  const goClaims = () => setScreen('claim');
  const goProfile = () => setScreen('profile');
  const openHistory = (returnTo = 'active') => {
    setHistoryReturn(returnTo);
    setScreen('history');
  };
  const openViewPolicy = (returnTo = 'active') => {
    setViewPolicyReturn(returnTo);
    setScreen('viewPolicy');
  };
  const openClaimFlow = (step = 1) => {
    if (step === 1) {
      setClaimDraft(createEmptyClaimDraft());
      setPoliceReference('');
      setHospitalSlipUrl('');
      setSubmittedClaim(null);
    }
    setClaimFlowStep(step);
    setScreen('claimFlow');
  };
  const showBottomNav = !['splash', 'onboarding1', 'onboarding2', 'onboarding3', 'login', 'signup', 'chat', 'offline'].includes(screen);

  const screenProps = {
    activePlan,
    submittedClaim,
    claimDraft,
    setClaimDraft,
    policeReference,
    setPoliceReference,
    hospitalSlipUrl,
    setHospitalSlipUrl,
    historyReturn,
    openHistory,
    viewPolicyReturn,
    openViewPolicy,
    openClaimFlow,
    claimFlowStep,
    paymentMethod,
    selectedPlan,
    setSubmittedClaim,
    setPaymentMethod,
    setScreen,
    setSelectedPlan,
    session,
    setSession,
    auth: {
      login,
      registerPassenger,
      saveToken,
    },
    // New Dynamic Props
    activeCoverState,
    countdown,
    scannedVehicle,
    setScannedVehicle,
    coversHistory,
    claimsList,
    refreshPassengerData,
    setShowScannerModal,
    setScannerType,
  };

  return (
    <div className="app-shell">
      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>

      <div className="phone-frame relative">
        {screen === 'splash' && <SplashScreen {...screenProps} />}
        {screen === 'onboarding1' && <OnboardingOne {...screenProps} />}
        {screen === 'onboarding2' && <OnboardingTwo {...screenProps} />}
        {screen === 'onboarding3' && <OnboardingThree {...screenProps} />}
        {screen === 'login' && <LoginScreen {...screenProps} />}
        {screen === 'signup' && <SignupScreen {...screenProps} />}
        {screen === 'home' && <HomeScreen {...screenProps} goCover={goCover} />}
        {screen === 'choose' && <ChooseCoverScreen {...screenProps} />}
        {screen === 'payment' && <PaymentScreen {...screenProps} />}
        {screen === 'active' && <CoverScreen {...screenProps} />}
        {screen === 'viewPolicy' && <ViewPolicyScreen {...screenProps} />}
        {screen === 'history' && <HistoryScreen {...screenProps} />}
        {screen === 'claim' && <ClaimsScreen {...screenProps} />}
        {screen === 'claimFlow' && <ClaimScreen {...screenProps} />}
        {screen === 'profile' && <ProfileScreen {...screenProps} />}
        {screen === 'profilePayments' && <ProfilePaymentMethodsScreen {...screenProps} />}
        {screen === 'trustedContacts' && <TrustedContactsScreen {...screenProps} />}
        {screen === 'settings' && <SettingsScreen {...screenProps} />}
        {screen === 'notifications' && <NotificationsScreen {...screenProps} />}
        {screen === 'helpSafety' && <HelpSafetyScreen {...screenProps} />}
        {screen === 'chat' && <ChatScreen {...screenProps} />}
        {screen === 'offline' && <OfflineScreen {...screenProps} />}
        {showBottomNav && <BottomNav current={navState(screen)} onHome={goHome} onCover={goCover} onClaims={goClaims} onProfile={goProfile} />}
        
        {/* Minibus Verification Scanner Modal Overlay */}
        {showScannerModal && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-[60] flex flex-col justify-end">
            <div className="bg-slate-900 border-t border-slate-800 rounded-t-[32px] p-6 pb-8 space-y-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-white font-black text-lg tracking-tight">
                    {scannerType === 'qr' ? 'Verify Minibus QR' : 'Enter Minibus Plate'}
                  </h2>
                  <p className="text-slate-400 text-[11px] font-semibold mt-0.5">
                    {scannerType === 'qr' ? 'Scan the code near the passenger door' : 'Input the vehicle registration number'}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowScannerModal(false);
                    setError('');
                  }}
                  className="h-8 w-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Main Content */}
              <div className="space-y-4">
                {scannerType === 'qr' ? (
                  <div className="space-y-4">
                    {/* Visual Scan Area */}
                    <div className="relative h-44 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 overflow-hidden flex flex-col items-center justify-center">
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-emerald-400 shadow-[0_0_12px_#34d399] animate-scan" />
                      
                      <div className="relative p-4 rounded-2xl border border-dashed border-emerald-400/40 animate-pulse">
                        <ShieldCheck size={38} className="text-emerald-400" />
                      </div>
                      <span className="text-[9px] font-black tracking-widest text-emerald-400 mt-3 uppercase animate-pulse">
                        Positioning sensor active
                      </span>
                    </div>

                    {/* Detected Vehicles List */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">
                        Detected Nearby Vehicles
                      </span>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3.5 bg-slate-800/60 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition-all text-left"
                        onClick={async () => {
                          setError('');
                          try {
                            const data = await verifyVehicle(session.token, { qrCode: 'SAFE-LSK-2481' });
                            setScannedVehicle(data);
                            setScreen('choose');
                            setShowScannerModal(false);
                          } catch (e) {
                            setError(e.message || 'Failed to verify vehicle');
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                            <Bus size={20} />
                          </span>
                          <div>
                            <strong className="block text-white text-xs font-black">SAFE-LSK-2481</strong>
                            <small className="block text-slate-400 text-[10px] font-bold">Matero ➔ Town Route</small>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/50 border border-emerald-500/20 px-3 py-1 rounded-full uppercase">
                          Select
                        </span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase block">
                        Zambian Plate Number
                      </span>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-slate-400">
                          <Bus size={18} />
                        </span>
                        <input
                          type="text"
                          placeholder="e.g. LSK 2481"
                          value={plateInput}
                          onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                          className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl py-3.5 pl-12 pr-4 text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 tracking-wider"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        setError('');
                        if (!plateInput.trim()) {
                          setError('Please input a minibus plate number.');
                          return;
                        }
                        setLoading(true);
                        try {
                          const data = await verifyVehicle(session.token, { plateNumber: plateInput.trim() });
                          setScannedVehicle(data);
                          setScreen('choose');
                          setShowScannerModal(false);
                        } catch (e) {
                          setError(e.message || 'Failed to verify vehicle');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl transition-all shadow-[0_4px_16px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                      disabled={loading}
                    >
                      {loading ? 'Verifying...' : 'Verify & Continue'}
                    </button>
                  </div>
                )}

                {error && (
                  <p className="text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-500/20 px-3 py-2 rounded-xl text-center">
                    ⚠️ {error}
                  </p>
                )}
              </div>

              {/* Footer Toggle */}
              <div className="border-t border-slate-800 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setScannerType(scannerType === 'qr' ? 'plate' : 'qr');
                    setError('');
                  }}
                  className="text-xs font-black text-emerald-400 hover:underline tracking-wide"
                >
                  {scannerType === 'qr' ? 'Enter Minibus Plate Number' : 'Use QR Scanner Sim'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function navState(screen) {
  if (screen === 'home') return 'home';
  if (['choose', 'payment', 'active', 'history', 'viewPolicy'].includes(screen)) return 'cover';
  if (['claim', 'claimFlow'].includes(screen)) return 'claims';
  return 'profile';
}

function IconButton({ label, children, onClick, quiet = false }) {
  return (
    <button className={quiet ? 'icon-btn quiet' : 'icon-btn'} type="button" aria-label={label} onClick={onClick}>
      {children}
    </button>
  );
}

function TopBar({ onBack, title, action }) {
  return (
    <header className="top-bar">
      <IconButton label="Go back" quiet onClick={onBack}>
        <ArrowLeft size={22} />
      </IconButton>
      {title && <strong className="top-title">{title}</strong>}
      <div className="top-action">{action}</div>
    </header>
  );
}

function BottomNav({ current, onHome, onCover, onClaims, onProfile }) {
  const items = [
    { id: 'home', label: 'Home', icon: navHomeIcon, onClick: onHome },
    { id: 'cover', label: 'Cover', icon: navCoverIcon, onClick: onCover },
    { id: 'claims', label: 'Claims', icon: navClaimsIcon, onClick: onClaims },
    { id: 'profile', label: 'Profile', icon: navAccountIcon, onClick: onProfile },
  ];

  const navClassName = [
    'bottom-nav',
    current === 'claims' ? 'bottom-nav--claims-current' : '',
    current === 'profile' ? 'bottom-nav--profile-current' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav className={navClassName} aria-label="Primary">
      {items.map((item) => {
        const active = current === item.id;
        return (
          <button className={`nav-item ${active ? 'active' : ''}`} key={item.id} type="button" onClick={item.onClick}>
            {item.id === 'claims' && active ? (
              <FileText
                className="nav-item-icon nav-item-icon--claims-active"
                size={22}
                strokeWidth={2}
                color="#FFC612"
                aria-hidden="true"
              />
            ) : item.id === 'profile' && active ? (
              <CircleUserRound
                className="nav-item-icon nav-item-icon--profile-active"
                size={22}
                strokeWidth={2}
                color="#FFC612"
                aria-hidden="true"
              />
            ) : (
              <img className="nav-item-icon" src={item.icon} alt="" aria-hidden="true" />
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MiniStatusBar() {
  return (
    <div className="mini-status" aria-label="Phone status">
      <strong>9:41</strong>
      <span>
        <Radio size={14} fill="currentColor" />
        <Navigation2 size={14} fill="currentColor" />
        <span className="battery-dot" />
      </span>
    </div>
  );
}

function SplashScreen({ setScreen }) {
  return (
    <main className="screen no-nav splash-screen">
      <div className="splash-road" style={{ backgroundImage: `url(${safeRoadBackground})` }} />
      <MiniStatusBar />
      <section className="splash-content">
        <div className="safe-shield-mark">
          <img src={safeLogo} alt="SAFE logo" />
        </div>
        <h1>SAFE</h1>
        <p><span>You ride.</span> We protect.</p>
      </section>
      <section className="splash-actions">
        <button className="yellow-btn" type="button" onClick={() => setScreen('onboarding1')}>Get Started</button>
        <button className="ghost-btn" type="button" onClick={() => setScreen('login')}>Log In</button>
      </section>
    </main>
  );
}

function OnboardingShell({ body, children, highlight, onNext, setScreen, step, title }) {
  return (
    <main className="screen no-nav onboarding-screen">
      <MiniStatusBar />
      <div className="skip-row">
        <button type="button" onClick={() => setScreen('signup')}>Skip</button>
      </div>
      <section className="onboarding-visual">
        {children}
      </section>
      <section className="onboarding-copy">
        <h1>{title}<br /><span>{highlight}</span></h1>
        <p>{body}</p>
      </section>
      <footer className="onboarding-footer">
        <div className="progress-dots" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((item) => <span className={item === step ? 'active' : ''} key={item} />)}
        </div>
        <button className="next-round" type="button" aria-label="Next step" onClick={onNext}>
          <ChevronRight size={24} />
        </button>
      </footer>
    </main>
  );
}

function OnboardingOne({ setScreen }) {
  return (
    <OnboardingShell
      body="We're here to make every journey safer and more secure for you."
      highlight="Every Ride"
      onNext={() => setScreen('onboarding2')}
      setScreen={setScreen}
      step={1}
      title="Safety First,"
    >
      <div className="illustration-circle driver">
        <div className="driver-wheel" />
        <div className="driver-face" />
        <div className="driver-body" />
        <div className="shield-badge"><ShieldCheck size={33} /></div>
      </div>
    </OnboardingShell>
  );
}

function OnboardingTwo({ setScreen }) {
  return (
    <OnboardingShell
      body="Real-time monitoring and instant alerts for your peace of mind."
      highlight="Always On"
      onNext={() => setScreen('onboarding3')}
      setScreen={setScreen}
      step={2}
      title="Smart Protection"
    >
      <div className="illustration-circle smart">
        <div className="city-bars"><span /><span /><span /><span /><span /></div>
        <div className="phone-illustration">
          <ShieldCheck size={46} />
          <small />
          <small />
        </div>
        <div className="check-badge"><Check size={26} /></div>
      </div>
    </OnboardingShell>
  );
}

function OnboardingThree({ setScreen }) {
  return (
    <OnboardingShell
      body="Share your trip and let your loved ones follow your journey in real time."
      highlight="Stay Connected."
      onNext={() => setScreen('signup')}
      setScreen={setScreen}
      step={3}
      title="Share. Track."
    >
      <div className="illustration-circle map">
        <img className="real-map-illustration" src={shareTrackMap} alt="Secure route tracking map" />
      </div>
    </OnboardingShell>
  );
}

function LoginScreen({ setScreen, setSession, auth }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen no-nav auth-screen">
      <div className="auth-bg" style={{ backgroundImage: `url(${safeRoadBackground})` }} />
      <MiniStatusBar />
      <section className="auth-card">
        <img className="auth-logo" src={safeLogo} alt="SAFE logo" />
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to SAFE</h1>

        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            setBusy(true);
            try {
              const data = await auth.login({ identifier, password });
              auth.saveToken(data.token);
              setSession({ token: data.token, user: data.user ?? null, ready: true });
              setScreen('home');
            } catch (e) {
              setError(e?.message || 'Login failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            <span>Phone or email</span>
            <div className="auth-input">
              <User size={18} />
              <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} placeholder="+260 or email address" />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="auth-input">
              <Lock size={18} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" type="password" />
            </div>
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="yellow-btn" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <button className="text-link" type="button">Forgot password?</button>
        <p className="auth-switch">New to SAFE? <button type="button" onClick={() => setScreen('signup')}>Create account</button></p>
      </section>
    </main>
  );
}

function SignupScreen({ setScreen, setSession, auth }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen no-nav auth-screen signup-screen">
      <div className="auth-bg" style={{ backgroundImage: `url(${safeRoadBackground})` }} />
      <MiniStatusBar />
      <section className="auth-card">
        <img className="auth-logo" src={safeLogo} alt="SAFE logo" />
        <p className="eyebrow">Create your account</p>
        <h1>Join SAFE</h1>

        <form
          className="auth-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setError('');
            setBusy(true);
            try {
              const data = await auth.registerPassenger({ phone, password, fullName });
              auth.saveToken(data.token);
              setSession({ token: data.token, user: data.user ?? null, ready: true });
              setScreen('home');
            } catch (e) {
              setError(e?.message || 'Sign up failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            <span>Full name</span>
            <div className="auth-input">
              <User size={18} />
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Moses Banda" />
            </div>
          </label>
          <label>
            <span>Mobile number</span>
            <div className="auth-input">
              <Smartphone size={18} />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+260 97 000 0000" />
            </div>
          </label>
          <label>
            <span>Password</span>
            <div className="auth-input">
              <Lock size={18} />
              <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Create password" type="password" />
            </div>
          </label>
          {error ? <p className="auth-error">{error}</p> : null}
          <button className="yellow-btn" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <button type="button" onClick={() => setScreen('login')}>Log in</button></p>
      </section>
    </main>
  );
}

function TripRows() {
  return (
    <div className="trip-rows">
      <div className="trip-row">
        <span className="row-icon"><MapPin size={18} /></span>
        <span>Route</span>
        <strong>{trip.route}</strong>
      </div>
      <div className="trip-row">
        <span className="row-icon"><Bus size={18} /></span>
        <span>Minibus ID</span>
        <strong>{trip.vehicle}</strong>
      </div>
      <div className="trip-row">
        <span className="row-icon"><Clock3 size={18} /></span>
        <span>Departure</span>
        <strong>{trip.departure}</strong>
      </div>
    </div>
  );
}

function ChooseCoverScreen({ selectedPlan, setSelectedPlan, setScreen, scannedVehicle }) {
  return (
    <main className="screen padded">
      <TopBar onBack={() => setScreen('home')} />
      <section className="page-heading">
        <h1>Choose your cover</h1>
        {scannedVehicle && (
          <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-full select-none">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-black text-slate-300">
              Verified Minibus: <strong className="text-white">{scannedVehicle.vehicle?.plateNumber}</strong> ({scannedVehicle.route ? `${scannedVehicle.route.origin} ➔ ${scannedVehicle.route.destination}` : 'Lusaka'})
            </span>
          </div>
        )}
      </section>

      <section className="plan-list">
        {coverPlans.map((plan) => (
          <button
            className={`plan-card ${selectedPlan === plan.id ? 'selected' : ''}`}
            key={plan.id}
            type="button"
            onClick={() => setSelectedPlan(plan.id)}
          >
            <span className={`plan-shield ${plan.tone}`}>
              <ShieldCheck size={38} />
            </span>
            <span className="plan-main">
              <span className="plan-label">{plan.name}</span>
              <strong>{plan.price}</strong>
              <span>{plan.summary}</span>
              <span className="chips">
                <span>{plan.payout}</span>
                <span><Clock3 size={14} /> Valid 4h</span>
              </span>
            </span>
            <span className="checkmark">{selectedPlan === plan.id ? <Check size={18} /> : <ChevronRight size={18} />}</span>
          </button>
        ))}
      </section>

      <button className="primary-btn sticky-cta" type="button" onClick={() => setScreen('payment')}>
        <span>Continue to payment</span>
        <ArrowRight size={18} />
      </button>
    </main>
  );
}

function PaymentScreen({ activePlan, paymentMethod, selectedPlan, session, setPaymentMethod, setScreen, scannedVehicle, refreshPassengerData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen padded payment-screen">
      <div className="soft-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(248,249,250,.2), rgba(248,249,250,.9)), url(${bgImage})` }} />
      <TopBar onBack={() => setScreen('choose')} />
      <section className="page-heading with-lock">
        <div>
          <h1>Pay securely</h1>
        </div>
        <Lock size={28} />
      </section>

      <section className="summary-card">
        <h2>Trip summary</h2>
        <div className="summary-row"><Bus size={18} /><span>Route</span><strong>{scannedVehicle?.route ? `${scannedVehicle.route.origin} to ${scannedVehicle.route.destination}` : trip.route}</strong></div>
        <div className="summary-row"><FileText size={18} /><span>Vehicle</span><strong>{scannedVehicle?.vehicle?.plateNumber || trip.vehicle}</strong></div>
        <div className="summary-row"><ShieldCheck size={18} /><span>Cover plan</span><strong>{activePlan.name} ({activePlan.price})</strong></div>
        <div className="summary-row"><Clock3 size={18} /><span>Validity</span><strong>4 hours</strong></div>
      </section>

      <section className="payment-methods">
        <h2>Choose payment method</h2>
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const selected = paymentMethod === method.id;
          return (
            <button className={`method-card ${selected ? 'selected' : ''}`} key={method.id} type="button" onClick={() => setPaymentMethod(method.id)}>
              <span className={`brand-mark ${method.accent}`}><Icon size={23} /></span>
              <span>
                <strong>{method.name}</strong>
                <small>{method.detail}</small>
              </span>
              <span className="radio-dot">{selected && <Check size={14} />}</span>
            </button>
          );
        })}
      </section>

      <section className="payment-dock">
        <div><span>Total</span><strong>{activePlan.price}</strong></div>
        <button
          className="primary-btn"
          type="button"
          disabled={busy}
          onClick={async () => {
            setError('');
            if (!session?.token) {
              setScreen('login');
              return;
            }
            setBusy(true);
            try {
              await buyCover(session.token, {
                plan: selectedPlan === 'basic' ? 'basic' : 'plus',
                plateNumber: scannedVehicle?.vehicle?.plateNumber || 'LSK 2481',
                paymentMethod,
              });
              await refreshPassengerData(session.token);
              setScreen('active');
            } catch (e) {
              setError(e?.message || 'Payment failed');
            } finally {
              setBusy(false);
            }
          }}
        >
          <Lock size={18} />
          <span>{busy ? 'Confirming…' : 'Confirm payment'}</span>
        </button>
      </section>

      {error ? <p className="payment-error">{error}</p> : null}
    </main>
  );
}


function HistoryScreen({ historyReturn, setScreen, coversHistory, claimsList }) {
  const [filter, setFilter] = useState('All');

  const visibleItems = useMemo(() => {
    const items = coversHistory.map((cover) => {
      const date = new Date(cover.createdAt);
      const day = String(date.getDate());
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = String(date.getFullYear());
      
      const route = cover.route ? `${cover.route.origin} to ${cover.route.destination}` : 'Lusaka Commute';
      const vehicle = cover.vehicle?.plateNumber || 'LSK 2481';
      const coverPlanName = `${cover.plan === 'basic' ? 'Basic' : 'Plus'} Cover (K${cover.amount})`;
      
      // Find matching claim
      const claim = claimsList.find((c) => c.tripCoverId === cover.id);
      let status = 'Expired';
      let type = 'expired';
      
      if (claim) {
        type = 'claim';
        if (claim.status === 'submitted') status = 'Claim submitted';
        else if (claim.status === 'processing') status = 'Processing';
        else if (claim.status === 'approved') status = 'Approved';
        else if (claim.status === 'rejected') status = 'Rejected';
        else if (claim.status === 'paid') status = 'Paid';
      } else {
        const isCurrentlyActive = cover.status === 'active' && new Date(cover.endsAt).getTime() > Date.now();
        if (isCurrentlyActive) {
          status = 'Active';
          type = 'active';
        }
      }
      
      return {
        id: cover.id,
        day,
        month,
        year,
        route,
        vehicle,
        cover: coverPlanName,
        status,
        type,
      };
    });
    
    if (filter === 'All') return items;
    if (filter === 'Active') return items.filter((item) => item.type === 'active');
    if (filter === 'Expired') return items.filter((item) => item.type === 'expired');
    if (filter === 'Claim') return items.filter((item) => item.type === 'claim');
    return items;
  }, [coversHistory, claimsList, filter]);

  return (
    <main className="screen padded">
      <header className="history-top">
        <IconButton label="Back" quiet onClick={() => setScreen(historyReturn)}><ArrowLeft size={22} /></IconButton>
        <div>
          <IconButton label="Search" quiet><Search size={22} /></IconButton>
          <span className="avatar">M</span>
        </div>
      </header>

      <section className="page-heading">
        <h1>My cover history</h1>
      </section>

      <section className="filter-row" aria-label="Cover filters">
        {['All', 'Active', 'Expired', 'Claim'].map((item) => (
          <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>
            {item === 'Claim' ? 'Claims' : item}
          </button>
        ))}
      </section>

      <section className="history-list">
        {visibleItems.map((item) => (
          <article className={`history-card ${item.type}`} key={`${item.day}-${item.vehicle}-${item.status}`}>
            <div className="date-tile">
              <strong>{item.day}</strong>
              <span>{item.month}</span>
              <small>{item.year}</small>
            </div>
            <div className="history-main">
              <strong>{item.route}</strong>
              <span>{item.vehicle}</span>
              <span>{item.cover}</span>
            </div>
            <span className={`status-pill ${item.type}`}>
              {item.type === 'active' && <CheckCircle2 size={14} />}
              {item.type === 'claim' && <FileText size={14} />}
              {item.type === 'expired' && <Lock size={14} />}
              {item.status}
            </span>
          </article>
        ))}
      </section>
    </main>
  );
}

function ClaimScreen({
  claimDraft,
  setClaimDraft,
  session,
  submittedClaim,
  setSubmittedClaim,
  policeReference,
  setPoliceReference,
  hospitalSlipUrl,
  setHospitalSlipUrl,
  refreshPassengerData,
  setScreen,
  activeCoverState,
  coversHistory = [],
  claimFlowStep = 1,
}) {
  const [step, setStep] = useState(claimFlowStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const draft = normalizeClaimDraft(claimDraft);
  const draftDocuments = draft.documents;

  const activeCover = activeCoverState || coversHistory[0];

  const finishClaimFlow = () => {
    setClaimDraft(createEmptyClaimDraft());
    setPoliceReference('');
    setHospitalSlipUrl('');
    setSubmittedClaim(null);
    setStep(1);
  };

  const syncHospitalSlipFromDraft = (documents) => {
    setHospitalSlipUrl(primaryClaimSlipUrl(documents) || '');
  };

  const handleNarrativeChange = (value) => {
    setClaimDraft((prev) => ({
      ...normalizeClaimDraft(prev),
      incidentNarrative: value,
    }));
    setError('');
  };

  const handleDocumentsChange = (nextOrUpdater) => {
    setClaimDraft((prev) => {
      const current = normalizeClaimDraft(prev);
      const nextDocuments =
        typeof nextOrUpdater === 'function'
          ? nextOrUpdater(current.documents)
          : normalizeClaimDocuments(nextOrUpdater);
      const nextDraft = {
        ...current,
        documents: normalizeClaimDocuments(nextDocuments),
      };
      syncHospitalSlipFromDraft(nextDraft.documents);
      return nextDraft;
    });
  };

  if (submittedClaim) {
    return (
      <ClaimFlowSubmittedStep
        claim={submittedClaim}
        activeCover={activeCover}
        fallbackPolicyId={trip.policy}
        fallbackVehicle={trip.vehicle}
        onBackToClaims={() => {
          finishClaimFlow();
          setScreen('claim');
        }}
        onBackToHome={() => {
          finishClaimFlow();
          setScreen('home');
        }}
      />
    );
  }

  if (step === 1) {
    return (
      <ClaimFlowDescribeStep
        incidentNarrative={draft.incidentNarrative}
        onNarrativeChange={handleNarrativeChange}
        onBack={() => setScreen('claim')}
        onNext={() => setStep(2)}
      />
    );
  }

  if (step === 2) {
    return (
      <ClaimFlowUploadStep
        documents={draftDocuments}
        onDocumentsChange={handleDocumentsChange}
        onBack={() => setStep(1)}
        onNext={() => setStep(3)}
        onUploadLater={() => setStep(3)}
      />
    );
  }

  if (step === 3) {
    const narrativeValid = draft.incidentNarrative.trim().length >= 10;
    const canSubmit = narrativeValid && !hasUploadInProgress(draftDocuments);

    return (
      <ClaimFlowReviewStep
        incidentNarrative={draft.incidentNarrative}
        documents={draftDocuments}
        activeCover={activeCover}
        fallbackPolicyId={trip.policy}
        fallbackVehicle={trip.vehicle}
        fallbackRoute={trip.route.replace(' to ', ' → ')}
        busy={busy}
        error={error}
        canSubmit={canSubmit}
        onBack={() => setStep(2)}
        onEditNarrative={() => setStep(1)}
        onEditEvidence={() => setStep(2)}
        onSubmit={async () => {
          setError('');
          if (!session?.token) {
            setScreen('login');
            return;
          }
          if (!narrativeValid) {
            setError('Please add an accident narrative of at least 10 characters.');
            return;
          }
          setBusy(true);
          try {
            const payload = buildClaimSubmitPayload(draft, {
              tripCoverId: activeCover?.id || undefined,
              policeReference,
            });
            const result = await createClaim(session.token, payload);
            syncHospitalSlipFromDraft(draftDocuments);
            if (refreshPassengerData) {
              await refreshPassengerData(session.token);
            }
            setSubmittedClaim(result.claim);
          } catch (e) {
            setError('Claim could not be submitted. Please try again.');
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  return null;
}

function ProfilePaymentMethodsScreen({ paymentMethod, setPaymentMethod, setScreen }) {
  return (
    <main className="screen padded detail-screen">
      <TopBar onBack={() => setScreen('profile')} title="Payment methods" action={<Plus size={21} />} />
      <section className="page-heading compact">
        <h1>How you pay</h1>
      </section>
      <section className="wallet-list">
        {paymentMethods.map((method) => {
          const Icon = method.icon;
          const selected = paymentMethod === method.id;
          return (
            <button className={`wallet-card ${selected ? 'selected' : ''}`} key={method.id} type="button" onClick={() => setPaymentMethod(method.id)}>
              <span className={`brand-mark ${method.accent}`}><Icon size={23} /></span>
              <span>
                <strong>{method.name}</strong>
                <small>{method.detail}</small>
              </span>
              <span className="default-pill">{selected ? 'Default' : 'Use'}</span>
            </button>
          );
        })}
      </section>
      <section className="secure-note">
        <Lock size={20} />
        <p>SAFE never stores your full card or mobile money PIN.</p>
      </section>
    </main>
  );
}

function NotificationsScreen({ setScreen }) {
  const [settings, setSettings] = useState({
    cover: true,
    claims: true,
    payment: true,
    safety: false,
  });

  const rows = [
    { id: 'cover', title: 'Cover reminders', detail: 'Expiry and renewal alerts', icon: ShieldCheck },
    { id: 'claims', title: 'Claim updates', detail: 'Submission, review, and payout status', icon: FileText },
    { id: 'payment', title: 'Payment receipts', detail: 'Successful purchases and failed attempts', icon: WalletCards },
    { id: 'safety', title: 'Safety notices', detail: 'Route and connection updates', icon: Bell },
  ];

  return (
    <main className="screen padded detail-screen">
      <TopBar onBack={() => setScreen('profile')} title="Notifications" />
      <section className="page-heading compact">
        <h1>Stay updated</h1>
      </section>
      <section className="toggle-list">
        {rows.map((row) => {
          const Icon = row.icon;
          const active = settings[row.id];
          return (
            <button
              className="toggle-row"
              key={row.id}
              type="button"
              onClick={() => setSettings((current) => ({ ...current, [row.id]: !current[row.id] }))}
            >
              <span className="row-icon"><Icon size={18} /></span>
              <span><strong>{row.title}</strong><small>{row.detail}</small></span>
              <span className={`switch ${active ? 'on' : ''}`}><i /></span>
            </button>
          );
        })}
      </section>
    </main>
  );
}

function HelpSafetyScreen({ setScreen }) {
  return (
    <main className="screen padded detail-screen help-screen">
      <TopBar onBack={() => setScreen('profile')} title="Help and safety" />
      <section className="help-hero">
        <ShieldCheck size={44} />
        <h1>SAFE support</h1>
      </section>

      <section className="help-grid">
        <button type="button" className="help-card" onClick={() => setScreen('claim')}>
          <Siren size={24} />
          <span><strong>Report an accident</strong><small>Start a claim and upload documents.</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="help-card" onClick={() => setScreen('active')}>
          <Shield size={24} />
          <span><strong>My active cover</strong><small>View policy, route, and expiry time.</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="help-card" onClick={() => setScreen('offline')}>
          <AlertTriangle size={24} />
          <span><strong>Connection help</strong><small>See the offline recovery screen.</small></span>
          <ChevronRight size={18} />
        </button>
      </section>

      <section className="support-panel">
        <h2>Need help now?</h2>
        <button type="button" onClick={() => setScreen('chat')}><MessageCircle size={18} /> Chat with SAFE</button>
        <button type="button"><Mail size={18} /> support@safe.co.zm</button>
      </section>
    </main>
  );
}

function ChatScreen({ setScreen }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      from: 'safe',
      text: 'Hi Moses. SAFE support is here. What do you need help with today?',
      time: 'Now',
    },
    {
      id: 2,
      from: 'user',
      text: 'I need help understanding my accident cover.',
      time: 'Now',
    },
    {
      id: 3,
      from: 'safe',
      text: 'No problem. Your current Plus Cover protects this Matero to Town trip for 4 hours and supports accident claims.',
      time: 'Now',
    },
  ]);

  const quickReplies = ['Start a claim', 'Payment issue', 'View cover', 'Offline help'];

  const sendMessage = (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), from: 'user', text: trimmed, time: 'Now' },
      { id: Date.now() + 1, from: 'safe', text: 'Thanks. A SAFE agent will review this and guide you through the next step.', time: 'Now' },
    ]);
    setMessage('');
  };

  return (
    <main className="screen no-nav chat-screen">
      <header className="chat-top">
        <IconButton label="Go back" quiet onClick={() => setScreen('helpSafety')}><ArrowLeft size={22} /></IconButton>
        <div className="chat-title">
          <span><MessageCircle size={18} /></span>
          <div>
            <strong>Chat with SAFE</strong>
            <small>Usually replies instantly</small>
          </div>
        </div>
        <IconButton label="Safety info" quiet onClick={() => setScreen('helpSafety')}><Info size={21} /></IconButton>
      </header>

      <section className="chat-messages" aria-label="Chat messages">
        {messages.map((item) => (
          <article className={`message-bubble ${item.from}`} key={item.id}>
            <p>{item.text}</p>
            <small>{item.time}</small>
          </article>
        ))}
      </section>

      <section className="quick-replies" aria-label="Quick replies">
        {quickReplies.map((reply) => (
          <button type="button" key={reply} onClick={() => setMessage(reply)}>{reply}</button>
        ))}
      </section>

      <form className="chat-composer" onSubmit={sendMessage}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Type your message..." />
        <button type="submit" aria-label="Send message"><Send size={18} /></button>
      </form>
    </main>
  );
}

function OfflineScreen({ setScreen }) {
  return (
    <main className="screen no-nav offline-screen">
      <div className="offline-backdrop" style={{ backgroundImage: `linear-gradient(180deg, rgba(4,17,40,.86), rgba(4,17,40,.94)), url(${bgImage})` }} />
      <section className="offline-card">
        <span className="offline-icon"><AlertTriangle size={58} /></span>
        <h1>Connection Lost</h1>
        <p>It looks like you're offline. Please check your internet connection to continue using SAFE.</p>
        <button className="primary-btn" type="button" onClick={() => setScreen('helpSafety')}>
          <RefreshCcw size={18} />
          <span>Retry</span>
        </button>
        <button className="secondary-btn" type="button" onClick={() => setScreen('active')}>
          <ShieldCheck size={18} />
          <span>Go to My Cover</span>
        </button>
      </section>
    </main>
  );
}

export default App;
