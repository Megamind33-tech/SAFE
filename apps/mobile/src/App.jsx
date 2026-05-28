import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
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
import safeRoadBackground from './assets/safe-road-background.png';
import safeLogoClean from './assets/real/safe_logo_clean.png';
import safeAppIconMaster3D from './assets/SAFE_app_icon_master_3D_1024.png';
import shareTrackMap from './assets/share-track-map.png';
import heroContainerMobile from './assets/hero/safe_hero_container_mobile_transparent.png';
import heroContainerLarge from './assets/hero/safe_hero_container_transparent.png';
import busHeroCity from './assets/real/bus_hero_city_clean.png';
import coverVerificationArt from './assets/real/cover_verification_clean.png';
import roadToSecurityArt from './assets/transport/mint_green_road_to_security_and_peace_transparent.png';
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
import { createSupportReport } from './services/helpSafety.js';
import SettingsScreen from './screens/SettingsScreen.jsx';
import QRScannerScreen from './screens/QRScannerScreen.jsx';
import VehicleVerifiedScreen from './screens/VehicleVerifiedScreen.jsx';
import PaymentBrandIcon from './components/PaymentBrandIcon.jsx';
import { getPaymentMethods, resolveDefaultCheckoutId } from './services/paymentMethods.js';
import {
  resolveActiveCover,
} from './utils/activeCover.js';
import navHomeIcon from './assets/pack/icons/nav-home.svg';
import navCoverIcon from './assets/pack/icons/nav-cover-active.svg';
import navVerifyIcon from './assets/pack/icons/qr-scan.svg';
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
import { clearToken, loadToken, login, me, registerPassenger, saveToken, activeCover as fetchActiveCover, coverHistory } from './api/safeApi.js';
import {
  clearQrQaMode,
  clearQrQaResult,
  isQrQaCapture,
  readQrQaMode,
  readQrQaCode,
  readQrQaResult,
} from './utils/qrQa.js';
import { extractQrCodeFromLocation, replaceLocationAfterQrLaunch } from './utils/qrLaunch.js';
import { verifyQrCode } from './services/qr.js';

const bgImage = zambiaScene;

function App() {
  const [screen, setScreen] = useState('splash');
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
  const [qrResult, setQrResult] = useState(null);
  const [pendingQrCode, setPendingQrCode] = useState(null);
  const consumedQrLaunchRef = useRef(false);
  const [coversHistory, setCoversHistory] = useState([]);
  const [coverFlow, setCoverFlow] = useState({
    selectedPlan: null,
    selectedPaymentMethod: null,
    purchaseResult: null,
  });
  
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
    const code = extractQrCodeFromLocation();
    if (code) setPendingQrCode(code);
  }, []);

  useEffect(() => {
    if (!session.ready || !pendingQrCode) return;
    if (!session.token) {
      if (screen === 'splash') setScreen('login');
      return;
    }
  }, [session.ready, session.token, pendingQrCode, screen]);

  useEffect(() => {
    if (!session.ready || !pendingQrCode) return;
    if (isQrQaCapture && readQrQaMode()) return;
    if (!session.token) return;
    if (consumedQrLaunchRef.current) return;

    consumedQrLaunchRef.current = true;
    let cancelled = false;
    verifyQrCode(session.token, pendingQrCode)
      .then((result) => {
        if (cancelled) return;
        setQrResult(result);
        setPendingQrCode(null);
        replaceLocationAfterQrLaunch();
        if (result.status === 'verified') {
          setScreen('vehicleVerified');
        } else {
          setQrResult(result);
          setScreen('qrScanner');
        }
      })
      .catch(() => {
        if (cancelled) return;
        setPendingQrCode(null);
        replaceLocationAfterQrLaunch();
        setQrResult({ status: 'invalid', qrType: 'vehicle', reason: 'invalid' });
        setScreen('qrScanner');
      });

    return () => {
      cancelled = true;
    };
  }, [session.ready, session.token, pendingQrCode]);

  useEffect(() => {
    if (!session.ready || !session.token) return;

    const applyHashRoute = () => {
      if (pendingQrCode && isQrQaCapture && readQrQaMode()) return;
      const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
      const hashBase = hash.split('?')[0];
      if (hashBase.startsWith('qr/')) {
        if (consumedQrLaunchRef.current) return;
        const code = extractQrCodeFromLocation();
        if (code) setPendingQrCode(code);
        return;
      }
      if (hashBase === 'liveTrip') setScreen('liveTrip');
      else if (hashBase === 'viewPolicy') setScreen('viewPolicy');
      else if (hashBase === 'qrScanner') setScreen('qrScanner');
      else if (hashBase === 'vehicleVerified') {
        const qaResult = readQrQaResult();
        if (qaResult) setQrResult(qaResult);
        setScreen('vehicleVerified');
      } else if (hashBase === 'coverPlansQr') {
        const qaResult = readQrQaResult();
        if (qaResult) {
          import('./services/qr.js').then(({ toCoverVehicleContext }) => {
            setScannedVehicle(toCoverVehicleContext(qaResult));
            setScreen('coverPlans');
          });
        }
      }
    };

    applyHashRoute();
    window.addEventListener('hashchange', applyHashRoute);
    return () => window.removeEventListener('hashchange', applyHashRoute);
  }, [session.ready, session.token, pendingQrCode]);

  useEffect(() => {
    if (!session.ready || !isQrQaCapture) return;
    const mode = readQrQaMode();
    if (mode === 'permission') setScreen('qrScanner');
    if (mode === 'manual') setScreen('qrScanner');
    if (mode === 'verified-no-cover' || mode === 'verified-active-cover' || mode === 'start-trip-ready') {
      const qaResult = readQrQaResult();
      if (qaResult) setQrResult(qaResult);
      setScreen('vehicleVerified');
    }
    if (mode === 'buy-cover-prefilled') {
      const qaResult = readQrQaResult();
      if (qaResult) {
        setQrResult(qaResult);
        import('./services/qr.js').then(({ toCoverVehicleContext }) => {
          setScannedVehicle(toCoverVehicleContext(qaResult));
          setScreen('coverPlans');
        });
      }
    }
  }, [session.ready]);

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
  const goVerify = () => {
    if (!session?.token) {
      setScreen('login');
      return;
    }
    setScreen('qrScanner');
  };
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
  const openQrScanner = () => setScreen('qrScanner');
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
    setPaymentMethod,
    setScreen,
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
    qrResult,
    setQrResult,
    coversHistory,
    selectedHistoryCover,
    refreshPassengerData,
    openQrScanner,
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
            scannedVehicle={scannedVehicle}
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
        {screen === 'qrScanner' && (
          <QRScannerScreen
            key={`qr-${readQrQaMode() || 'scan'}-${readQrQaCode() || 'none'}-${qrResult?.status || 'none'}`}
            session={session}
            setScreen={setScreen}
            initialMode={readQrQaMode() === 'manual' ? 'manual' : 'scan'}
            initialCode={readQrQaCode()}
            initialInvalidState={
              qrResult && qrResult.status !== 'verified' && !pendingQrCode ? qrResult : null
            }
            qaForcePermission={readQrQaMode() === 'permission'}
            qaForceDenied={readQrQaMode() === 'denied'}
            onVerified={(result) => {
              setQrResult(result);
              if (isQrQaCapture) {
                import('./utils/qrQa.js').then(({ setQrQaResult }) => setQrQaResult(result));
              }
            }}
          />
        )}
        {screen === 'vehicleVerified' && (
          <VehicleVerifiedScreen
            session={session}
            setScreen={setScreen}
            qrResult={qrResult}
            setScannedVehicle={setScannedVehicle}
            openLiveTrip={openLiveTrip}
            refreshPassengerData={refreshPassengerData}
          />
        )}
        {screen === 'chat' && <ChatScreen {...screenProps} />}
        {screen === 'offline' && <OfflineScreen {...screenProps} />}
        {showBottomNav && (
          <BottomNav
            current={navState(screen)}
            onHome={goHome}
            onCover={goCover}
            onVerify={goVerify}
            onClaims={goClaims}
            onProfile={goProfile}
          />
        )}
      </div>
    </div>
  );
}

function navState(screen) {
  if (screen === 'home') return 'home';
  if (['choose', 'payment', 'active', 'viewPolicy', 'coverPlans', 'coverReview', 'coverPay', 'coverStatus'].includes(screen)) return 'cover';
  if (['qrScanner', 'vehicleVerified'].includes(screen)) return 'verify';
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

function BottomNav({ current, onHome, onCover, onVerify, onClaims, onProfile }) {
  const items = [
    { id: 'home', label: 'Home', icon: navHomeIcon, onClick: onHome },
    { id: 'cover', label: 'Cover', icon: navCoverIcon, onClick: onCover },
    { id: 'verify', label: 'Verify', icon: navVerifyIcon, onClick: onVerify },
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
            <img className="nav-item-icon" src={item.icon} alt="" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function SplashScreen({ setScreen }) {
  return (
    <main className="screen no-nav splash-screen">
      <div className="splash-road" style={{ backgroundImage: `url(${safeRoadBackground})` }} aria-hidden="true" />
      <div className="splash-overlay" aria-hidden="true" />
      
      <div className="splash-content-wrapper">
        <div className="splash-top-bar-placeholder" />
        
        <div className="splash-brand-section">
          <div className="splash-logo-container">
            <img className="splash-logo-3d" src={safeAppIconMaster3D} alt="SAFE App Icon" />
          </div>
          <h1 className="splash-title">SAFE</h1>
          <p className="splash-promise">
            <span className="highlight-yellow">You ride.</span> We protect.
          </p>
        </div>

        <div className="splash-actions-section">
          <button className="yellow-pill-btn" type="button" onClick={() => setScreen('onboarding1')}>
            Get Started
          </button>
          <button className="outline-pill-btn" type="button" onClick={() => setScreen('login')}>
            Log In
          </button>
        </div>
      </div>
    </main>
  );
}

function OnboardingShell({ body, children, highlight, onNext, setScreen, step, title }) {
  return (
    <main className="screen no-nav onboarding-screen">
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
          <ArrowRight size={22} />
        </button>
      </footer>
    </main>
  );
}

function OnboardingOne({ setScreen }) {
  return (
    <OnboardingShell
      body="Buy cover before you board and travel with total peace of mind."
      highlight="in minutes"
      onNext={() => setScreen('onboarding2')}
      setScreen={setScreen}
      step={1}
      title="Cover your trip"
    >
      <div className="illustration-circle">
        <img className="onboarding-asset" src={busHeroCity} alt="" aria-hidden="true" />
        <div className="shield-badge">
          <ShieldCheck size={32} />
        </div>
      </div>
    </OnboardingShell>
  );
}

function OnboardingTwo({ setScreen }) {
  return (
    <OnboardingShell
      body="We're here to make every journey safer and more secure for you."
      highlight="Every Ride"
      onNext={() => setScreen('onboarding3')}
      setScreen={setScreen}
      step={2}
      title="Safety First,"
    >
      <div className="illustration-circle driver">
        <div className="driver-wheel" />
        <div className="driver-face" />
        <div className="driver-body" />
        <div className="shield-badge">
          <ShieldCheck size={32} />
        </div>
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
        <img className="real-map-illustration" src={shareTrackMap} alt="" aria-hidden="true" />
        <div className="shield-badge">
          <ShieldCheck size={32} />
        </div>
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
      <div className="auth-content-wrapper">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <img className="auth-logo-3d" src={safeAppIconMaster3D} alt="SAFE Logo" />
          </div>
          <p className="auth-eyebrow">Welcome back</p>
          <h1 className="auth-title">Log in to SAFE</h1>
          <p className="auth-subtitle">Log in to manage your cover, trips, and claims.</p>
        </div>

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
              setError(e?.message || 'Login failed. Please check your credentials.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="auth-fields-group">
            <label className="auth-field-label">
              <span>Phone or email</span>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" size={20} />
                <input 
                  value={identifier} 
                  onChange={(event) => setIdentifier(event.target.value)} 
                  placeholder="+260 or email address" 
                  disabled={busy}
                  className="auth-field-input"
                />
              </div>
            </label>
            <label className="auth-field-label">
              <span>Password</span>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={20} />
                <input 
                  value={password} 
                  onChange={(event) => setPassword(event.target.value)} 
                  placeholder="Enter password" 
                  type="password" 
                  disabled={busy}
                  className="auth-field-input"
                />
              </div>
            </label>
          </div>

          {error ? (
            <div className="auth-error-alert" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          <button className="auth-pill-btn-primary" type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer-actions">
          <button className="auth-forgot-password-link" type="button" disabled={busy}>Forgot password?</button>
          <p className="auth-switch-prompt">
            New to SAFE? <button type="button" className="auth-switch-action-btn" onClick={() => setScreen('signup')} disabled={busy}>Create account</button>
          </p>
        </div>
      </div>
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
    <main className="screen no-nav auth-screen">
      <div className="auth-content-wrapper">
        <div className="auth-header">
          <div className="auth-logo-wrapper">
            <img className="auth-logo-3d" src={safeAppIconMaster3D} alt="SAFE Logo" />
          </div>
          <p className="auth-eyebrow">Create your SAFE account</p>
          <h1 className="auth-title">Join SAFE</h1>
          <p className="auth-subtitle">Start protecting your commuter trips in minutes.</p>
        </div>

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
              setError(e?.message || 'Sign up failed. Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="auth-fields-group">
            <label className="auth-field-label">
              <span>Full name</span>
              <div className="auth-input-wrapper">
                <User className="auth-input-icon" size={20} />
                <input 
                  value={fullName} 
                  onChange={(event) => setFullName(event.target.value)} 
                  placeholder="Moses Banda" 
                  disabled={busy}
                  className="auth-field-input"
                />
              </div>
            </label>
            <label className="auth-field-label">
              <span>Mobile number</span>
              <div className="auth-input-wrapper">
                <Smartphone className="auth-input-icon" size={20} />
                <input 
                  value={phone} 
                  onChange={(event) => setPhone(event.target.value)} 
                  placeholder="+260 97 000 0000" 
                  disabled={busy}
                  className="auth-field-input"
                />
              </div>
            </label>
            <label className="auth-field-label">
              <span>Password</span>
              <div className="auth-input-wrapper">
                <Lock className="auth-input-icon" size={20} />
                <input 
                  value={password} 
                  onChange={(event) => setPassword(event.target.value)} 
                  placeholder="Create password" 
                  type="password" 
                  disabled={busy}
                  className="auth-field-input"
                />
              </div>
            </label>
          </div>

          {error ? (
            <div className="auth-error-alert" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
            </div>
          ) : null}

          <button className="auth-pill-btn-primary" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer-actions">
          <p className="auth-switch-prompt">
            Already have an account? <button type="button" className="auth-switch-action-btn" onClick={() => setScreen('login')} disabled={busy}>Log in</button>
          </p>
        </div>
      </div>
    </main>
  );
}

function ChatScreen({ setScreen, session }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const quickReplies = ['Start a claim', 'Payment issue', 'View cover', 'Offline help'];

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    const userMsg = { id: Date.now(), from: 'user', text: trimmed, time: 'Now' };
    setMessages((current) => [...current, userMsg]);
    setMessage('');

    try {
      if (session?.token) {
        await createSupportReport(session.token, {
          problemType: 'other',
          message: trimmed,
        });
      }
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          from: 'safe',
          text: 'Your message has been received. A SAFE support agent will follow up with you shortly.',
          time: 'Now',
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 2,
          from: 'safe',
          text: "We couldn't send your message right now. Please check your connection and try again.",
          time: 'Now',
        },
      ]);
    }
  };

  return (
    <main className="screen no-nav chat-screen">
      <header className="chat-top">
        <IconButton label="Go back" quiet onClick={() => setScreen('helpSafety')}><ArrowLeft size={22} /></IconButton>
        <div className="chat-title">
          <span><MessageCircle size={18} /></span>
          <div>
            <strong>SAFE Support</strong>
            <small>Send a message — we&apos;ll follow up</small>
          </div>
        </div>
        <IconButton label="Safety info" quiet onClick={() => setScreen('helpSafety')}><Info size={21} /></IconButton>
      </header>

      <section className="chat-messages" aria-label="Support messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <MessageCircle size={36} aria-hidden="true" />
            <p>Send us a message below and a SAFE agent will follow up with you.</p>
          </div>
        ) : (
          messages.map((item) => (
            <article className={`message-bubble ${item.from}`} key={item.id}>
              <p>{item.text}</p>
              <small>{item.time}</small>
            </article>
          ))
        )}
      </section>

      <section className="quick-replies" aria-label="Quick topic shortcuts">
        {quickReplies.map((reply) => (
          <button type="button" key={reply} onClick={() => setMessage(reply)}>{reply}</button>
        ))}
      </section>

      <form className="chat-composer" onSubmit={sendMessage}>
        <input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Describe your issue..." />
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
