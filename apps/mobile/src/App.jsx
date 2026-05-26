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
import CoverPlanSelectScreen from './screens/CoverPlanSelectScreen.jsx';
import CoverReviewScreen from './screens/CoverReviewScreen.jsx';
import CoverPaymentScreen from './screens/CoverPaymentScreen.jsx';
import CoverPurchaseStatusScreen from './screens/CoverPurchaseStatusScreen.jsx';
import { writeCachedCoverScreen } from './services/cover.js';
import ViewPolicyScreen from './screens/ViewPolicyScreen.jsx';
import LiveTripScreen from './screens/LiveTripScreen.jsx';
import ClaimsScreen from './screens/ClaimsScreen.jsx';
import ClaimFlowScreen from './screens/ClaimFlowScreen.jsx';
import ClaimDetailScreen from './screens/ClaimDetailScreen.jsx';
import ProfileScreen from './screens/ProfileScreen.jsx';
import CoverHistoryScreen, { CoverHistoryDetailScreen } from './screens/CoverHistoryScreen.jsx';
import PaymentMethodsScreen from './screens/PaymentMethodsScreen.jsx';
import TrustedContactsScreen from './screens/TrustedContactsScreen.jsx';
import NotificationsScreen from './screens/NotificationsScreen.jsx';
import HelpSafetyScreen from './screens/HelpSafetyScreen.jsx';
import SettingsScreen from './screens/SettingsScreen.jsx';
import PaymentBrandIcon from './components/PaymentBrandIcon.jsx';
import { getPaymentMethods, resolveDefaultCheckoutId } from './services/paymentMethods.js';
import {
  resolveActiveCover,
} from './utils/activeCover.js';
import navHomeIcon from './assets/pack/icons/nav-home.svg';
import navCoverIcon from './assets/pack/icons/nav-cover-active.svg';
import navClaimsIcon from './assets/pack/icons/nav-claims.svg';
import navAccountIcon from './assets/pack/icons/nav-account.svg';
import { writeCachedClaims } from './services/claims.js';
import {
  clearQaOpenClaimFlowFlag,
  clearQaSubmittedClaimId,
  isClaimsQaCapture,
  readQaOpenClaimFlowFlag,
  readQaSubmittedClaimId,
} from './utils/claimsQa.js';
import { clearToken, loadToken, login, me, registerPassenger, saveToken, activeCover as fetchActiveCover, coverHistory, verifyVehicle } from './api/safeApi.js';

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

const paymentMethods = [
  { id: 'airtel', name: 'Airtel Money', detail: 'Pay with Airtel Money', brandType: 'airtel' },
  { id: 'mtn', name: 'MTN Mobile Money', detail: 'Pay with MTN MoMo', brandType: 'mtn' },
  { id: 'card', name: 'Visa / Mastercard', detail: 'Card payment', brandType: 'visa_mastercard', dual: true },
];

function App() {
  const [screen, setScreen] = useState('splash');
  const [selectedPlan, setSelectedPlan] = useState('plus');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [historyReturn, setHistoryReturn] = useState('active');
  const [viewPolicyReturn, setViewPolicyReturn] = useState('active');
  const [selectedHistoryCover, setSelectedHistoryCover] = useState(null);
  const [selectedClaimId, setSelectedClaimId] = useState(null);
  const [claimFlowOpts, setClaimFlowOpts] = useState({});
  const [session, setSession] = useState(() => ({ token: loadToken(), user: null, ready: false }));

  // New Dynamic States
  const [activeCoverState, setActiveCoverState] = useState(null);
  const [scannedVehicle, setScannedVehicle] = useState(null);
  const [coversHistory, setCoversHistory] = useState([]);
  const [coverFlow, setCoverFlow] = useState({
    selectedPlan: null,
    selectedPaymentMethod: null,
    purchaseResult: null,
  });
  
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
      const [activeRes, historyRes] = await Promise.all([
        fetchActiveCover(token),
        coverHistory(token),
      ]);
      setActiveCoverState(activeRes?.cover || null);
      setCoversHistory(historyRes?.covers || []);
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
    if (!session.ready || !isClaimsQaCapture) return;
    if (readQaOpenClaimFlowFlag()) {
      clearQaOpenClaimFlowFlag();
      setClaimFlowOpts({});
      setScreen('claimFlow');
    }
  }, [session.ready]);

  useEffect(() => {
    if (!session.ready || !session.token || !isClaimsQaCapture) return;
    const qaClaimId = readQaSubmittedClaimId();
    if (!qaClaimId) return;
    import('./services/claims.js').then(({ getClaimDetail }) =>
      getClaimDetail(session.token, qaClaimId).then((claim) => {
        if (
          claim?.reference &&
          ['submitted', 'under_review'].includes(String(claim.status))
        ) {
          clearQaSubmittedClaimId();
          setClaimFlowOpts({ qaSubmittedClaimId: claim.id });
          setScreen('claimFlow');
        }
      })
    );
  }, [session.ready, session.token]);

  useEffect(() => {
    if (!session.ready) return;

    getPaymentMethods(session.token)
      .then((methods) => {
        const defaultId = resolveDefaultCheckoutId(methods);
        if (defaultId) {
          setPaymentMethod(defaultId);
        }
      })
      .catch((err) => {
        console.error('Failed to load saved payment methods:', err);
      });
  }, [session.ready, session.token]);

  useEffect(() => {
    if (!session.ready || !session.token) return;
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (hash === 'liveTrip') setScreen('liveTrip');
    else if (hash === 'viewPolicy') setScreen('viewPolicy');
  }, [session.ready, session.token]);

  useEffect(() => {
    if (session.token) {
      refreshPassengerData(session.token);
    } else {
      setActiveCoverState(null);
      setCoversHistory([]);
      writeCachedClaims(null);
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

  const activeCover = useMemo(
    () => resolveActiveCover(activeCoverState, coversHistory),
    [activeCoverState, coversHistory]
  );

  useEffect(() => {
    if ((screen === 'profile' || screen === 'history' || screen === 'coverHistoryDetail') && session.token) {
      refreshPassengerData(session.token);
    }
  }, [screen, session.token]);

  // Legacy Home CTAs still call setScreen('choose'|'payment'); map to the real cover flow.
  useEffect(() => {
    if (screen === 'choose') setScreen('coverPlans');
    if (screen === 'payment') setScreen(coverFlow.selectedPlan ? 'coverReview' : 'coverPay');
  }, [screen, coverFlow.selectedPlan]);

  const goHome = () => setScreen('home');
  const goCover = () => setScreen('active');
  const goClaims = () => setScreen('claim');
  const goProfile = () => setScreen('profile');
  const openHistory = (returnTo = 'active') => {
    setHistoryReturn(returnTo);
    setScreen('history');
  };
  const openCoverHistoryDetail = (cover) => {
    setSelectedHistoryCover(cover ?? null);
    setScreen('coverHistoryDetail');
  };
  const openViewPolicy = (returnTo = 'active') => {
    setViewPolicyReturn(returnTo);
    setScreen('viewPolicy');
  };
  const openLiveTrip = () => setScreen('liveTrip');
  const openClaimFlow = (opts = {}) => {
    setClaimFlowOpts(typeof opts === 'object' ? opts : {});
    setScreen('claimFlow');
  };
  const openClaimDetail = (claimId) => {
    setSelectedClaimId(claimId);
    setScreen('claimDetail');
  };
  const invalidateClaimsCache = () => {
    writeCachedClaims(null);
  };
  const showBottomNav = !['splash', 'onboarding1', 'onboarding2', 'onboarding3', 'login', 'signup', 'chat', 'offline'].includes(screen);

  const screenProps = {
    activePlan,
    historyReturn,
    openHistory,
    openCoverHistoryDetail,
    viewPolicyReturn,
    openViewPolicy,
    openLiveTrip,
    goCover,
    openClaimFlow,
    openClaimDetail,
    invalidateClaimsCache,
    claimFlowOpts,
    selectedClaimId,
    paymentMethod,
    selectedPlan,
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
    activeCover,
    countdown,
    scannedVehicle,
    setScannedVehicle,
    coversHistory,
    selectedHistoryCover,
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
        {screen === 'active' && (
          <CoverScreen
            session={session}
            setScreen={setScreen}
            openHistory={openHistory}
            openClaimFlow={openClaimFlow}
            onBuyCover={() => setScreen('coverPlans')}
            onCheckPendingPurchase={(pending) => {
              setCoverFlow((f) => ({
                ...f,
                purchaseId: pending?.paymentReference || pending?.id,
                purchaseResult: { purchase: { status: 'pending', id: pending?.paymentReference } },
              }));
              setScreen('coverStatus');
            }}
          />
        )}
        {screen === 'coverPlans' && (
          <CoverPlanSelectScreen
            session={session}
            setScreen={setScreen}
            selectedPlanId={coverFlow.selectedPlan?.id}
            scannedVehicle={scannedVehicle}
            onSelectPlan={(plan) => setCoverFlow((f) => ({ ...f, selectedPlan: plan }))}
            onContinue={() => setScreen('coverReview')}
          />
        )}
        {screen === 'coverReview' && (
          <CoverReviewScreen
            session={session}
            setScreen={setScreen}
            selectedPlan={coverFlow.selectedPlan}
            paymentMethod={coverFlow.selectedPaymentMethod}
            onPaymentMethodResolved={(method) =>
              setCoverFlow((f) => ({ ...f, selectedPaymentMethod: method }))
            }
            onContinue={() => setScreen('coverPay')}
            onChangePlan={() => setScreen('coverPlans')}
          />
        )}
        {screen === 'coverPay' && (
          <CoverPaymentScreen
            session={session}
            setScreen={setScreen}
            selectedPlan={coverFlow.selectedPlan}
            selectedPaymentMethodId={coverFlow.selectedPaymentMethod?.id}
            scannedVehicle={scannedVehicle}
            capabilities={coverFlow.capabilities}
            onSelectPaymentMethod={(method) =>
              setCoverFlow((f) => ({ ...f, selectedPaymentMethod: method }))
            }
            onPurchaseStarted={(result) => {
              setCoverFlow((f) => ({
                ...f,
                purchaseResult: result,
                purchaseId: result?.purchase?.id,
              }));
              setScreen('coverStatus');
            }}
          />
        )}
        {screen === 'coverStatus' && (
          <CoverPurchaseStatusScreen
            session={session}
            setScreen={setScreen}
            purchaseId={coverFlow.purchaseId}
            initialPurchase={coverFlow.purchaseResult}
            onComplete={async () => {
              await refreshPassengerData(session.token);
              setScreen('active');
            }}
            onRetryPayment={() => setScreen('coverPay')}
          />
        )}
        {screen === 'viewPolicy' && <ViewPolicyScreen {...screenProps} />}
        {screen === 'liveTrip' && <LiveTripScreen {...screenProps} />}
        {screen === 'history' && (
          <CoverHistoryScreen
            {...screenProps}
            onSelectCover={openCoverHistoryDetail}
            onStartCover={() => setScreen('coverPlans')}
          />
        )}
        {screen === 'coverHistoryDetail' && (
          <CoverHistoryDetailScreen
            {...screenProps}
            selectedCover={selectedHistoryCover}
            historyReturn="history"
          />
        )}
        {screen === 'claim' && <ClaimsScreen {...screenProps} />}
        {screen === 'claimFlow' && (
          <ClaimFlowScreen
            {...screenProps}
            initialStep={claimFlowOpts.step ?? 1}
            resumeClaimId={claimFlowOpts.claimId ?? null}
            qaSubmittedClaimId={claimFlowOpts.qaSubmittedClaimId ?? null}
            claimFlowOpts={claimFlowOpts}
            openClaimDetail={openClaimDetail}
            invalidateClaimsCache={invalidateClaimsCache}
            onExit={() => setScreen('claim')}
          />
        )}
        {screen === 'claimDetail' && (
          <ClaimDetailScreen
            {...screenProps}
            claimId={selectedClaimId}
            onBack={() => setScreen('claim')}
            openClaimFlow={openClaimFlow}
          />
        )}
        {screen === 'profile' && <ProfileScreen {...screenProps} />}
        {screen === 'profilePayments' && <PaymentMethodsScreen {...screenProps} />}
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
                            setScreen('coverPlans');
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
                          setScreen('coverPlans');
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
  if (['choose', 'payment', 'active', 'viewPolicy', 'coverPlans', 'coverReview', 'coverPay', 'coverStatus'].includes(screen)) return 'cover';
  if (['claim', 'claimFlow', 'claimDetail'].includes(screen)) return 'claims';
  if (['history', 'coverHistoryDetail', 'profile', 'profilePayments', 'trustedContacts', 'settings', 'notifications', 'helpSafety'].includes(screen)) {
    return 'profile';
  }
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

function LoginScreen({ setScreen, setSession, auth, refreshPassengerData }) {
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
              let user = data.user ?? null;
              try {
                const meData = await me(data.token);
                user = meData?.user ?? user;
              } catch {
                /* keep login payload user if profile fetch fails */
              }
              if (refreshPassengerData) {
                await refreshPassengerData(data.token);
              }
              setSession({ token: data.token, user, ready: true });
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

/** @deprecated Unreachable legacy fake cover purchase UI — use coverPlans flow. */
function ChooseCoverScreen_LEGACY({ selectedPlan, setSelectedPlan, setScreen, scannedVehicle }) {
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

/** @deprecated Unreachable legacy fake payment UI — use coverPay/coverStatus. */
function PaymentScreen_LEGACY({ activePlan, paymentMethod, selectedPlan, session, setPaymentMethod, setScreen, scannedVehicle, refreshPassengerData }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen padded payment-screen">
      <div className="soft-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(248,249,250,.2), rgba(248,249,250,.9)), url(${bgImage})` }} />
      <TopBar onBack={() => setScreen('coverPlans')} />
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
          const selected = paymentMethod === method.id;
          return (
            <button className={`method-card ${selected ? 'selected' : ''}`} key={method.id} type="button" onClick={() => setPaymentMethod(method.id)}>
              <PaymentBrandIcon
                type={method.brandType}
                dual={method.dual}
                className="method-card__brand"
              />
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
          disabled={busy || !paymentMethod}
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
