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
import iconCamera from './assets/icons/camera-premium.png';
import iconLink from './assets/icons/link-premium.png';
import iconMobile from './assets/icons/mobile-premium.png';
import iconPhoneRinging from './assets/icons/phone-ringing-premium.png';
import iconShield from './assets/icons/sheild-premium.png';
import iconTravel from './assets/icons/travel-premium.png';
import iconWallet from './assets/icons/wallet-premium.png';
import { buyCover, clearToken, createClaim, loadToken, login, me, registerPassenger, saveToken } from './api/safeApi.js';

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
  const [claimText, setClaimText] = useState('');
  const [claimSent, setClaimSent] = useState(false);
  const [historyReturn, setHistoryReturn] = useState('active');
  const [session, setSession] = useState(() => ({ token: loadToken(), user: null, ready: false }));

  useEffect(() => {
    const token = loadToken();
    if (!token) {
      setSession({ token: '', user: null, ready: true });
      return;
    }

    me(token)
      .then((data) => setSession({ token, user: data.user ?? null, ready: true }))
      .catch(() => {
        clearToken();
        setSession({ token: '', user: null, ready: true });
      });
  }, []);

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
  const showBottomNav = !['splash', 'onboarding1', 'onboarding2', 'onboarding3', 'login', 'signup', 'chat', 'offline'].includes(screen);

  const screenProps = {
    activePlan,
    claimSent,
    claimText,
    historyReturn,
    openHistory,
    paymentMethod,
    selectedPlan,
    setClaimSent,
    setClaimText,
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
  };

  return (
    <div className="app-shell">
      <div className="phone-frame">
        {screen === 'splash' && <SplashScreen {...screenProps} />}
        {screen === 'onboarding1' && <OnboardingOne {...screenProps} />}
        {screen === 'onboarding2' && <OnboardingTwo {...screenProps} />}
        {screen === 'onboarding3' && <OnboardingThree {...screenProps} />}
        {screen === 'login' && <LoginScreen {...screenProps} />}
        {screen === 'signup' && <SignupScreen {...screenProps} />}
        {screen === 'home' && <HomeScreen {...screenProps} />}
        {screen === 'choose' && <ChooseCoverScreen {...screenProps} />}
        {screen === 'payment' && <PaymentScreen {...screenProps} />}
        {screen === 'active' && <ActiveCoverScreen {...screenProps} />}
        {screen === 'history' && <HistoryScreen {...screenProps} />}
        {screen === 'claim' && <ClaimScreen {...screenProps} />}
        {screen === 'profile' && <ProfileScreen {...screenProps} />}
        {screen === 'profilePayments' && <ProfilePaymentMethodsScreen {...screenProps} />}
        {screen === 'notifications' && <NotificationsScreen {...screenProps} />}
        {screen === 'helpSafety' && <HelpSafetyScreen {...screenProps} />}
        {screen === 'chat' && <ChatScreen {...screenProps} />}
        {screen === 'offline' && <OfflineScreen {...screenProps} />}
        {showBottomNav && <BottomNav current={navState(screen)} onHome={goHome} onCover={goCover} onClaims={goClaims} onProfile={goProfile} />}
      </div>
    </div>
  );
}

function navState(screen) {
  if (screen === 'home') return 'home';
  if (['choose', 'payment', 'active', 'history'].includes(screen)) return 'cover';
  if (screen === 'claim') return 'claims';
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
    { id: 'home', label: 'Home', icon: Home, onClick: onHome },
    { id: 'cover', label: 'Cover', icon: Shield, onClick: onCover },
    { id: 'claims', label: 'Claims', icon: FileText, onClick: onClaims },
    { id: 'profile', label: 'Profile', icon: User, onClick: onProfile },
  ];

  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) => {
        const Icon = item.icon;
        const active = current === item.id;
        return (
          <button className={`nav-item ${active ? 'active' : ''}`} key={item.id} type="button" onClick={item.onClick}>
            <Icon size={22} strokeWidth={active ? 2.6 : 2} fill={active ? 'currentColor' : 'none'} />
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
        <p className="auth-subtitle">Access your cover, claims, and trip safety tools.</p>

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
        <p className="auth-subtitle">Set up quick access before you buy cover or submit a claim.</p>

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

function HomeScreen({ setScreen }) {
  const quickActions = [
    { label: 'Scan QR', detail: 'Board faster', asset: iconCamera, action: () => setScreen('choose'), tone: 'yellow' },
    { label: 'Enter Vehicle', detail: 'Use plate number', asset: iconMobile, action: () => setScreen('choose'), tone: 'blue' },
    { label: 'Monthly Cover', detail: 'Commuter pass', asset: iconWallet, action: () => setScreen('choose'), tone: 'navy' },
    { label: 'SOS Emergency', detail: 'Fast claim help', asset: iconPhoneRinging, action: () => setScreen('claim'), tone: 'danger' },
    { label: 'Share Trip', detail: 'Live route link', asset: iconLink, action: () => setScreen('chat'), tone: 'glass' },
    { label: 'Verified Buses', detail: 'Nearby routes', asset: iconTravel, action: () => setScreen('history'), tone: 'glass' },
  ];

  return (
    <main className="screen home-screen premium-home">
      <section className="mobility-hero">
        <div className="hero-environment" style={{ backgroundImage: `url(${lusakaNightAerial})` }} />
        <header className="home-top-row">
          <div className="home-identity">
            <p>Good morning, Moses</p>
            <strong>SAFE active in motion</strong>
          </div>
          <div className="home-top-actions">
            <button className="location-pill" type="button" aria-label="Current city">
              <MapPin size={15} />
              <span>Lusaka</span>
            </button>
            <button className="notify-btn" type="button" aria-label="Notifications" onClick={() => setScreen('notifications')}>
              <Bell size={19} />
              <i />
            </button>
          </div>
        </header>

        <section className="active-cover-card" aria-label="Active cover">
          <div className="cover-card-glow" />
          <div className="cover-card-head">
            <span className="protection-status"><i />Protected</span>
            <span className="cover-countdown">03:42:18</span>
          </div>
          <img className="cover-orb-icon" src={iconShield} alt="" />
          <h1>{trip.route}</h1>
          <p className="route-subtitle">Live commuter protection for this minibus trip</p>

          <div className="cover-intel-grid">
            <div><span>Vehicle</span><strong>{trip.vehicle}</strong></div>
            <div><span>Driver</span><strong>Verified</strong></div>
            <div><span>Departed</span><strong>{trip.departure}</strong></div>
            <div><span>Cover</span><strong>Plus</strong></div>
          </div>

          <button className="share-trip-btn" type="button" onClick={() => setScreen('chat')}>
            <Share2 size={18} />
            <span>Share protected trip</span>
            <ArrowRight size={17} />
          </button>
        </section>
      </section>

      <section className="home-content-flow">
        <section className="live-route-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Live route intelligence</p>
              <h2>Protected route map</h2>
            </div>
            <span className="route-live-pill"><i />Live</span>
          </div>
          <div className="route-map-surface" style={{ backgroundImage: `url(${shareTrackMap})` }}>
            <div className="map-vignette" />
            <span className="map-status-card">
              <ShieldCheck size={17} />
              <strong>Route secured</strong>
            </span>
            <span className="route-pulse-dot" />
          </div>
        </section>

        <section className="quick-action-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Move faster</p>
              <h2>Quick actions</h2>
            </div>
          </div>
          <div className="premium-action-grid">
            {quickActions.map((action) => {
              return (
                <button className={`premium-action-card ${action.tone}`} key={action.label} type="button" onClick={action.action}>
                  <span><img src={action.asset} alt="" /></span>
                  <strong>{action.label}</strong>
                  <small>{action.detail}</small>
                </button>
              );
            })}
          </div>
        </section>

        <section className="trust-activity-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">SAFE network</p>
              <h2>Live trust activity</h2>
            </div>
          </div>
          <div className="activity-grid">
            <div><strong>18,420</strong><span>protected commuters today</span></div>
            <div><strong>94%</strong><span>claims reviewed under 24h</span></div>
            <div><strong>126</strong><span>verified minibuses nearby</span></div>
            <div><strong>31</strong><span>active Lusaka routes</span></div>
          </div>
        </section>
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

function ChooseCoverScreen({ selectedPlan, setSelectedPlan, setScreen }) {
  return (
    <main className="screen padded">
      <TopBar onBack={() => setScreen('home')} />
      <section className="page-heading">
        <h1>Choose your cover</h1>
        <p>Simple cover. Serious support.</p>
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

      <section className="reassurance">
        <BadgeCheck size={22} />
        <p>Affordable protection built for daily commuters.</p>
      </section>

      <button className="primary-btn sticky-cta" type="button" onClick={() => setScreen('payment')}>
        <span>Continue to payment</span>
        <ArrowRight size={18} />
      </button>
    </main>
  );
}

function PaymentScreen({ activePlan, paymentMethod, selectedPlan, session, setPaymentMethod, setScreen }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen padded payment-screen">
      <div className="soft-visual" style={{ backgroundImage: `linear-gradient(180deg, rgba(248,249,250,.2), rgba(248,249,250,.9)), url(${bgImage})` }} />
      <TopBar onBack={() => setScreen('choose')} />
      <section className="page-heading with-lock">
        <div>
          <h1>Pay securely</h1>
          <p>Your payment is safe with SAFE.</p>
        </div>
        <Lock size={28} />
      </section>

      <section className="summary-card">
        <h2>Trip summary</h2>
        <div className="summary-row"><Bus size={18} /><span>Route</span><strong>{trip.route}</strong></div>
        <div className="summary-row"><FileText size={18} /><span>Vehicle</span><strong>{trip.vehicle}</strong></div>
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
                plateNumber: trip.vehicle,
                paymentMethod,
              });
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

function ActiveCoverScreen({ openHistory, setScreen }) {
  return (
    <main className="screen active-screen">
      <section className="cover-hero" style={{ backgroundImage: `linear-gradient(180deg, rgba(248,249,250,.88), rgba(248,249,250,.55), rgba(248,249,250,1)), url(${bgImage})` }}>
        <header className="cover-top">
          <IconButton label="Menu" quiet><Menu size={22} /></IconButton>
          <strong>SAFE</strong>
          <IconButton label="Notifications" quiet><Bell size={22} /></IconButton>
        </header>
        <div className="protected-lockup">
          <div>
            <h1>You're protected</h1>
            <p>We've got your back.</p>
          </div>
          <span className="big-shield"><ShieldCheck size={116} /></span>
        </div>
      </section>

      <section className="active-content">
        <div className="timer-block">
          <span>Cover active</span>
          <strong>03:42:18</strong>
          <small>remaining</small>
        </div>

        <section className="policy-card">
          <div><span>Policy ID</span><strong>{trip.policy}</strong></div>
          <div><span>Vehicle</span><strong>{trip.vehicle}</strong></div>
          <div><span>Route</span><strong>{trip.route}</strong></div>
          <div><span>Valid until</span><strong>{trip.validUntil}</strong></div>
        </section>

        <button className="safety-banner" type="button" onClick={() => openHistory('active')}>
          <ShieldCheck size={24} />
          <span><strong>You're covered for accidents.</strong><small>Be safe and ride happy.</small></span>
          <ChevronRight size={18} />
        </button>

        <section className="stacked-actions">
          <button className="secondary-btn" type="button" onClick={() => openHistory('active')}>
            <FileText size={19} />
            <span>View Policy</span>
          </button>
          <button className="danger-btn" type="button" onClick={() => setScreen('claim')}>
            <Siren size={19} />
            <span>Report Accident</span>
          </button>
        </section>
      </section>
    </main>
  );
}

function HistoryScreen({ historyReturn, setScreen }) {
  const [filter, setFilter] = useState('All');
  const visibleItems = filter === 'All' ? historyItems : historyItems.filter((item) => item.status.toLowerCase().includes(filter.toLowerCase()));

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
        <p>Your recent trips and covers.</p>
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

function ClaimScreen({ claimText, session, setClaimText, claimSent, setClaimSent, setScreen }) {
  const chars = claimText.length;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <main className="screen padded claim-screen">
      <TopBar onBack={() => setScreen('active')} />
      <section className="page-heading">
        <h1>Report an accident</h1>
        <p>We're here to help you.</p>
      </section>

      <section className="steps" aria-label="Claim progress">
        <span className="active">1</span>
        <span>2</span>
        <span>3</span>
      </section>

      {claimSent && (
        <section className="success-banner">
          <CheckCircle2 size={22} />
          <span><strong>Claim submitted</strong><small>SAFE will review it with care.</small></span>
        </section>
      )}

      <section className="claim-list">
        <button className="claim-card" type="button">
          <span className="claim-icon medical"><HeartPulse size={24} /></span>
          <span><strong>Upload hospital slip</strong><small>Add a clear photo or PDF</small></span>
          <span className="outline-action"><Upload size={16} /> Upload</span>
        </button>

        <button className="claim-card" type="button">
          <span className="claim-icon police"><Shield size={24} /></span>
          <span><strong>Add police / RTSA reference</strong><small>Enter reference number</small></span>
          <ChevronRight size={19} />
        </button>

        <section className="claim-card vertical">
          <div className="claim-title-row">
            <span className="claim-icon note"><FileText size={24} /></span>
            <span><strong>Describe what happened</strong><small>Tell us what happened</small></span>
          </div>
          <label className="textarea-wrap">
            <textarea
              maxLength={500}
              value={claimText}
              onChange={(event) => setClaimText(event.target.value)}
              placeholder="Type your description here..."
            />
            <span>{chars}/500</span>
          </label>
        </section>
      </section>

      <button
        className="primary-btn sticky-cta"
        type="button"
        disabled={busy}
        onClick={async () => {
          setError('');
          if (!session?.token) {
            setScreen('login');
            return;
          }
          if (!claimText.trim()) {
            setError('Please add a short description first.');
            return;
          }
          setBusy(true);
          try {
            await createClaim(session.token, { description: claimText.trim() });
            setClaimSent(true);
          } catch (e) {
            setError(e?.message || 'Failed to submit claim');
          } finally {
            setBusy(false);
          }
        }}
      >
        <Send size={18} />
        <span>{busy ? 'Submitting…' : 'Submit claim'}</span>
      </button>

      {error ? <p className="payment-error">{error}</p> : null}

      <p className="care-note">
        <ShieldCheck size={18} />
        Claims are reviewed with care to get you support.
      </p>
    </main>
  );
}

function ProfileScreen({ openHistory, setScreen }) {
  return (
    <main className="screen padded profile-screen">
      <header className="profile-head">
        <span className="profile-avatar"><CircleUserRound size={58} /></span>
        <div>
          <p className="eyebrow">SAFE member</p>
          <h1>Moses Banda</h1>
          <span>+260 97 000 0000</span>
        </div>
      </header>

      <section className="profile-stats">
        <div><strong>12</strong><span>Trips covered</span></div>
        <div><strong>1</strong><span>Claim</span></div>
        <div><strong>K5</strong><span>Current plan</span></div>
      </section>

      <section className="settings-list">
        <button type="button" onClick={() => openHistory('profile')}><FileText size={19} /><span>Cover history</span><ChevronRight size={18} /></button>
        <button type="button" onClick={() => setScreen('profilePayments')}><WalletCards size={19} /><span>Payment methods</span><ChevronRight size={18} /></button>
        <button type="button" onClick={() => setScreen('notifications')}><Bell size={19} /><span>Notifications</span><ChevronRight size={18} /></button>
        <button type="button" onClick={() => setScreen('helpSafety')}><ShieldCheck size={19} /><span>Help and safety</span><ChevronRight size={18} /></button>
      </section>
    </main>
  );
}

function ProfilePaymentMethodsScreen({ paymentMethod, setPaymentMethod, setScreen }) {
  return (
    <main className="screen padded detail-screen">
      <TopBar onBack={() => setScreen('profile')} title="Payment methods" action={<Plus size={21} />} />
      <section className="page-heading compact">
        <h1>How you pay</h1>
        <p>Choose a default payment method for future cover purchases.</p>
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
        <p>Pick the alerts SAFE should send you.</p>
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
        <p>Quick guidance for cover, claims, and emergencies.</p>
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
