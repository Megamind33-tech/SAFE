import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Bus, Check, CheckCircle2,
  ChevronRight, CircleUserRound, Clock, CreditCard, FileText, HeartPulse,
  Home, Lock, LogOut, MapPin, QrCode, Search, Send, Shield, ShieldCheck,
  Siren, Smartphone, Star, Upload, User, WalletCards,
} from 'lucide-react';
import SafeMap from './components/SafeMap.jsx';
import safeLogo from './assets/brand/safe-logo-full.png';
import BusIllustration from './components/BusIllustration.jsx';
import { AirtelLogo, MtnLogo, VisaMcLogo, SecurePaymentIllustration } from './components/PaymentLogos.jsx';
import {
  buyCover, confirmPayment, clearToken, createClaim, loadToken, login, me,
  registerPassenger, saveToken, activeCover, coverHistory, listClaims,
  verifyVehicle, getCoverProducts, getServerTime,
} from './api/safeApi.js';

const PAYMENT_METHODS = [
  { id: 'airtel', name: 'Airtel Money', detail: 'Pay with Airtel Money', icon: Smartphone, accent: 'red' },
  { id: 'mtn', name: 'MTN Mobile Money', detail: 'Pay with MTN MoMo', icon: WalletCards, accent: 'yellow' },
  { id: 'card', name: 'Visa / Mastercard', detail: 'Card payment', icon: CreditCard, accent: 'blue' },
];

function App() {
  const [screen, setScreen] = useState('splash');
  const [session, setSession] = useState(() => ({ token: loadToken(), user: null, ready: false }));

  const [coverState, setCoverState] = useState(null);
  const [history, setHistory] = useState([]);
  const [claims, setClaims] = useState([]);
  const [products, setProducts] = useState([]);
  const [serverOffset, setServerOffset] = useState(0);

  const [selectedProductId, setSelectedProductId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('airtel');
  const [scannedVehicle, setScannedVehicle] = useState(null);

  const [showScanner, setShowScanner] = useState(false);
  const [countdown, setCountdown] = useState('');

  const adjustedNow = () => Date.now() + serverOffset;

  const refreshData = useCallback(async (token) => {
    if (!token) return;
    try {
      const [ac, h, cl] = await Promise.all([
        activeCover(token), coverHistory(token), listClaims(token),
      ]);
      setCoverState(ac?.cover || null);
      if (ac?.serverTime) setServerOffset(new Date(ac.serverTime).getTime() - Date.now());
      setHistory(h?.covers || []);
      setClaims(cl?.claims || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    getCoverProducts().then(d => {
      setProducts(d?.products || []);
      if (d?.products?.[0]) setSelectedProductId(d.products[0].id);
    }).catch(() => {});
    getServerTime().then(d => {
      if (d?.serverTime) setServerOffset(new Date(d.serverTime).getTime() - Date.now());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const t = loadToken();
    if (!t) { setSession({ token: '', user: null, ready: true }); return; }
    me(t).then(d => {
      setSession({ token: t, user: d.user, ready: true });
      refreshData(t);
    }).catch(() => {
      clearToken();
      setSession({ token: '', user: null, ready: true });
    });
  }, []);

  useEffect(() => {
    if (session.token) refreshData(session.token);
  }, [session.token]);

  useEffect(() => {
    if (!coverState?.endsAt) { setCountdown(''); return; }
    const tick = () => {
      const diff = new Date(coverState.endsAt).getTime() - adjustedNow();
      if (diff <= 0) { setCountdown('Expired'); refreshData(session.token); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [coverState?.endsAt, serverOffset]);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId) || products[0] || null,
    [selectedProductId, products]
  );

  const userName = session.user?.passengerProfile?.fullName || '';
  const firstName = userName.split(' ')[0] || 'there';
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const navTab = (() => {
    if (screen === 'home') return 'home';
    if (['choose','payment','activeCover','coverDetail'].includes(screen)) return 'cover';
    if (['claim','claimSubmit'].includes(screen)) return 'claims';
    if (['history'].includes(screen)) return 'trips';
    return 'account';
  })();
  const showNav = !['splash','login','signup'].includes(screen);

  const goTo = (s) => setScreen(s);

  const props = {
    session, setSession, goTo, coverState, countdown, scannedVehicle, setScannedVehicle,
    history, claims, products, selectedProductId, setSelectedProductId, selectedProduct,
    paymentMethod, setPaymentMethod, refreshData, setShowScanner, firstName, greeting, userName,
  };

  return (
    <div className="app-shell">
      {screen === 'splash' && <SplashScreen {...props} />}
      {screen === 'login' && <LoginScreen {...props} />}
      {screen === 'signup' && <SignupScreen {...props} />}
      {screen === 'home' && <HomeScreen {...props} />}
      {screen === 'choose' && <ChooseScreen {...props} />}
      {screen === 'payment' && <PaymentScreen {...props} />}
      {screen === 'activeCover' && <ActiveCoverScreen {...props} />}
      {screen === 'history' && <HistoryScreen {...props} />}
      {screen === 'claim' && <ClaimListScreen {...props} />}
      {screen === 'claimSubmit' && <ClaimSubmitScreen {...props} />}
      {screen === 'profile' && <ProfileScreen {...props} />}
      {screen === 'help' && <HelpScreen {...props} />}

      {showNav && (
        <nav className="bottom-nav">
          <NavBtn icon={Home} label="Home" active={navTab==='home'} onClick={() => goTo('home')} />
          <NavBtn icon={Clock} label="Trips" active={navTab==='trips'} onClick={() => goTo('history')} />
          <button
            className={`nav-item cover-btn ${navTab==='cover' ? 'active' : ''}`}
            type="button"
            onClick={() => { if (coverState) goTo('activeCover'); else goTo('choose'); }}
          >
            <ShieldCheck size={22} />
            <span>Cover</span>
          </button>
          <NavBtn icon={FileText} label="Claims" active={navTab==='claims'} onClick={() => goTo('claim')} />
          <NavBtn icon={User} label="Account" active={navTab==='account'} onClick={() => goTo('profile')} />
        </nav>
      )}

      {showScanner && <ScannerModal {...props} onClose={() => setShowScanner(false)} />}
    </div>
  );
}

function NavBtn({ icon: Icon, label, active, onClick }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      <span>{label}</span>
    </button>
  );
}

/* ========== Splash ========== */
function SplashScreen({ goTo }) {
  return (
    <div className="splash-screen">
      <img src={safeLogo} alt="SAFE" className="splash-logo" />
      <h1 className="splash-title">SAFE</h1>
      <p className="splash-sub">You ride. We protect.</p>
      <div className="splash-actions">
        <button className="btn-gold" type="button" onClick={() => goTo('signup')}>Get Started</button>
        <button className="btn-ghost" type="button" onClick={() => goTo('login')}>Log In</button>
      </div>
    </div>
  );
}

/* ========== Auth ========== */
function LoginScreen({ goTo, setSession }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await login({ identifier: id, password: pw });
      saveToken(d.token);
      setSession({ token: d.token, user: d.user, ready: true });
      goTo('home');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <form className="auth-screen" onSubmit={submit}>
      <img src={safeLogo} alt="SAFE" className="auth-logo" />
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Log in to your SAFE account</p>
      <div className="form-group">
        <label className="form-label">Phone or email</label>
        <input className="form-input" value={id} onChange={e => setId(e.target.value)} placeholder="+260 or email" />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter password" />
      </div>
      {err && <p className="form-error">{err}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Logging in...' : 'Log In'}</button>
      <p className="auth-switch">New to SAFE? <button type="button" onClick={() => goTo('signup')}>Create account</button></p>
    </form>
  );
}

function SignupScreen({ goTo, setSession }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const d = await registerPassenger({ phone, password: pw, fullName: name });
      saveToken(d.token);
      setSession({ token: d.token, user: d.user, ready: true });
      goTo('home');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <form className="auth-screen" onSubmit={submit}>
      <img src={safeLogo} alt="SAFE" className="auth-logo" />
      <h1 className="auth-title">Join SAFE</h1>
      <p className="auth-subtitle">Create your account to get protected</p>
      <div className="form-group">
        <label className="form-label">Full name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
      </div>
      <div className="form-group">
        <label className="form-label">Phone number</label>
        <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+260 97 000 0000" />
      </div>
      <div className="form-group">
        <label className="form-label">Password</label>
        <input className="form-input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Create password (min 6 chars)" />
      </div>
      {err && <p className="form-error">{err}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Creating...' : 'Create Account'}</button>
      <p className="auth-switch">Already have an account? <button type="button" onClick={() => goTo('login')}>Log in</button></p>
    </form>
  );
}

/* ========== Home ========== */
function HomeScreen({ goTo, coverState, countdown, session, setShowScanner, firstName, greeting, history }) {
  return (
    <div className="screen no-pad">
      <div className="home-map-area">
        <SafeMap height="100%" />
        <div className="home-top-bar">
          <div className="home-greeting">
            <p>{greeting}, {firstName}</p>
            <strong>{coverState ? 'Protected' : 'Get covered'}</strong>
          </div>
          <div className="home-top-actions">
            <button className="home-icon-btn" type="button" onClick={() => goTo('help')} aria-label="Help">
              <Bell size={18} />
            </button>
            <button className="home-icon-btn" type="button" onClick={() => goTo('profile')} aria-label="Profile">
              <CircleUserRound size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="home-bottom-sheet">
        <div className="sheet-handle" />

        <button className="search-bar" type="button" onClick={() => setShowScanner(true)}>
          <Search size={18} />
          <span>Enter plate number or scan QR...</span>
        </button>

        {coverState && (
          <div className="active-cover-home">
            <div className="cover-top">
              <span className="cover-badge"><i /> Active</span>
              <span className="cover-timer">{countdown || '--:--:--'}</span>
            </div>
            <div className="cover-details">
              <span><MapPin size={12} /> {coverState.route ? `${coverState.route.origin} → ${coverState.route.destination}` : 'Lusaka'}</span>
              <span><Bus size={12} /> {coverState.vehicle?.plateNumber || 'N/A'}</span>
            </div>
            <div className="cover-actions">
              <button className="cover-action-btn" type="button" onClick={() => goTo('activeCover')}>
                <ShieldCheck size={14} /> View Cover
              </button>
              <button className="cover-action-btn danger" type="button" onClick={() => goTo('claimSubmit')}>
                <Siren size={14} /> Emergency
              </button>
            </div>
          </div>
        )}

        <div className="quick-actions">
          <button className="quick-action-btn primary" type="button" onClick={() => setShowScanner(true)}>
            <QrCode size={20} />
            Scan QR
          </button>
          <button className="quick-action-btn" type="button" onClick={() => {
            if (coverState) goTo('activeCover');
            else goTo('choose');
          }}>
            <Shield size={20} />
            {coverState ? 'My Cover' : 'Buy Cover'}
          </button>
          <button className="quick-action-btn" type="button" onClick={() => goTo('history')}>
            <Clock size={20} />
            History
          </button>
        </div>

        {!coverState && (
          <div>
            <div className="section-head">
              <h2>Protect your trip</h2>
              <p>Choose a cover plan to get started</p>
            </div>
            <button className="btn-primary" type="button" onClick={() => goTo('choose')} style={{ marginBottom: 16 }}>
              <ShieldCheck size={18} /> Buy Trip Cover
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <div className="section-head">
              <h2>Recent trips</h2>
            </div>
            {history.slice(0,3).map(c => (
              <div className="history-card" key={c.id}>
                <div className="history-date">
                  <strong>{new Date(c.startedAt || c.createdAt).getDate()}</strong>
                  <small>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(c.startedAt || c.createdAt).getMonth()]}</small>
                </div>
                <div className="history-info">
                  <span className="history-route">{c.route ? `${c.route.origin} → ${c.route.destination}` : c.plan}</span>
                  <span className="history-meta">{c.vehicle?.plateNumber || ''} · K{c.amount} · {c.status}</span>
                </div>
                <span className={`badge ${c.status === 'active' ? 'active' : c.status === 'expired' ? 'expired' : 'pending'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========== Scanner Modal ========== */
function ScannerModal({ session, setScannedVehicle, goTo, onClose }) {
  const [plate, setPlate] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const verify = async () => {
    if (!plate.trim()) { setErr('Enter a plate number'); return; }
    setErr(''); setBusy(true);
    try {
      const d = await verifyVehicle(session.token, { plateNumber: plate.trim() });
      setScannedVehicle(d);
      onClose();
      goTo('choose');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const scanQR = async () => {
    setErr(''); setBusy(true);
    try {
      const d = await verifyVehicle(session.token, { qrCode: 'SAFE-LSK-2481' });
      setScannedVehicle(d);
      onClose();
      goTo('choose');
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="scanner-modal" onClick={onClose}>
      <div className="scanner-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2>Verify Minibus</h2>
            <p className="scanner-sub">Enter plate number or scan QR code</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--border-light)', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <input
          className="plate-input"
          value={plate}
          onChange={e => setPlate(e.target.value.toUpperCase())}
          placeholder="e.g. LSK 2481"
        />

        {err && <div className="error-banner" style={{ marginTop: 12 }}>{err}</div>}

        <button className="btn-primary" type="button" onClick={verify} disabled={busy} style={{ marginTop: 16 }}>
          {busy ? 'Verifying...' : 'Verify & Continue'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={scanQR} disabled={busy} style={{ background: 'none', border: 'none', color: 'var(--safe-green)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <QrCode size={14} style={{ verticalAlign: -2 }} /> Scan QR Code Instead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========== Choose Cover ========== */
function ChooseScreen({ goTo, products, selectedProductId, setSelectedProductId, scannedVehicle }) {
  const iconForIndex = (i) => {
    if (i === 0) return <ShieldCheck size={22} />;
    if (i === 1) return <Shield size={22} />;
    return <Star size={22} />;
  };

  return (
    <div className="screen with-pad">
      <div className="screen-header" style={{ margin: '-16px -16px 16px', padding: '12px 16px' }}>
        <button className="back-btn" type="button" onClick={() => goTo('home')}><ArrowLeft size={18} /></button>
        <span className="header-title">Choose Cover</span>
      </div>

      {scannedVehicle && (
        <div className="verified-card">
          <div className="verified-card-left">
            <div className="verified-dot" />
            <div>
              <span className="verified-plate">{scannedVehicle.vehicle?.plateNumber || 'N/A'}</span>
              {scannedVehicle.route && (
                <span className="verified-route">{scannedVehicle.route.origin} → {scannedVehicle.route.destination}</span>
              )}
            </div>
          </div>
          <div className="verified-badge"><ShieldCheck size={16} /></div>
        </div>
      )}

      <div className="banner-card">
        <div className="banner-card-text">
          <h3>Travel worry-free.</h3>
          <p>You choose the cover, we've got you covered.</p>
        </div>
        <div className="banner-card-illust">
          <BusIllustration width={110} height={70} />
        </div>
      </div>

      {products.length === 0 ? (
        <div className="empty-state">
          <div className="safe-spinner" />
          <p>Loading cover products...</p>
        </div>
      ) : (
        products.map((p, i) => (
          <button className={`product-card ${selectedProductId === p.id ? 'selected' : ''}`} key={p.id} type="button" onClick={() => setSelectedProductId(p.id)}>
            <div className={`product-icon ${i === 0 ? 'basic' : i === 1 ? 'plus' : 'daily'}`}>
              {iconForIndex(i)}
            </div>
            <div className="product-info">
              <span className="product-name">{p.name}</span>
              <span className="product-desc">{p.description}</span>
              <div className="product-meta">
                <span><Clock size={10} /> {p.durationMinutes >= 60 ? `${Math.floor(p.durationMinutes/60)}h` : `${p.durationMinutes}m`}</span>
                <span><Shield size={10} /> Up to K{(p.coverageAmount||0).toLocaleString()}</span>
              </div>
            </div>
            <span className="product-price">K{p.price}</span>
            <div className="product-check">{selectedProductId === p.id && <Check size={14} />}</div>
          </button>
        ))
      )}

      <div className="benefit-row">
        <h4>Why choose SAFE?</h4>
        <div className="benefit-items">
          <div className="benefit-item"><div className="benefit-icon"><ShieldCheck size={16} /></div><span>Trusted protection</span></div>
          <div className="benefit-item"><div className="benefit-icon"><Clock size={16} /></div><span>Fast & easy claims</span></div>
          <div className="benefit-item"><div className="benefit-icon"><Smartphone size={16} /></div><span>24/7 support</span></div>
          <div className="benefit-item"><div className="benefit-icon"><HeartPulse size={16} /></div><span>Your safety first</span></div>
        </div>
      </div>

      <button className="btn-primary" type="button" onClick={() => goTo('payment')} disabled={!selectedProductId} style={{ marginTop: 8 }}>
        Continue to Payment <ArrowRight size={16} />
      </button>
    </div>
  );
}

/* ========== Payment ========== */
function PaymentScreen({ goTo, selectedProduct, paymentMethod, setPaymentMethod, session, scannedVehicle, refreshData }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('');

  if (!selectedProduct) return (
    <div className="screen with-pad">
      <div className="screen-header" style={{ margin: '-16px -16px 16px', padding: '12px 16px' }}>
        <button className="back-btn" type="button" onClick={() => goTo('choose')}><ArrowLeft size={18} /></button>
        <span className="header-title">Payment</span>
      </div>
      <div className="empty-state"><Shield size={32} /><p>No cover product selected</p></div>
    </div>
  );

  const dur = selectedProduct.durationMinutes >= 60 ? `${Math.floor(selectedProduct.durationMinutes/60)} hours` : `${selectedProduct.durationMinutes} min`;

  const pay = async () => {
    setErr(''); setBusy(true); setStage('processing');
    try {
      const buy = await buyCover(session.token, {
        coverProductId: selectedProduct.id,
        vehicleId: scannedVehicle?.vehicle?.id,
        paymentMethod,
      });
      setStage('confirming');
      await confirmPayment(session.token, buy.payment.id);
      await refreshData(session.token);
      goTo('activeCover');
    } catch (e) { setErr(e.message); setStage(''); } finally { setBusy(false); }
  };

  const LOGO_MAP = { airtel: <AirtelLogo size={40} />, mtn: <MtnLogo size={40} />, card: <VisaMcLogo size={40} /> };

  return (
    <div className="screen with-pad">
      <div className="screen-header" style={{ margin: '-16px -16px 16px', padding: '12px 16px' }}>
        <button className="back-btn" type="button" onClick={() => goTo('choose')}><ArrowLeft size={18} /></button>
        <span className="header-title">Confirm Payment</span>
        <span className="header-secure-tag"><ShieldCheck size={14} /> Secure Checkout</span>
      </div>

      <div className="secure-banner">
        <div className="secure-banner-text">
          <h4>Your payment is secure</h4>
          <p>All transactions are encrypted and protected.</p>
        </div>
        <div className="secure-banner-illust">
          <SecurePaymentIllustration width={90} height={60} />
        </div>
      </div>

      <div className="summary-card">
        <h3>Trip Summary</h3>
        <div className="summary-row"><Bus size={16} /><span>Route</span><strong>{scannedVehicle?.route ? `${scannedVehicle.route.origin} → ${scannedVehicle.route.destination}` : 'Lusaka commute'}</strong></div>
        <div className="summary-row"><MapPin size={16} /><span>Vehicle</span><strong>{scannedVehicle?.vehicle?.plateNumber || 'Not selected'}</strong></div>
        <div className="summary-row"><ShieldCheck size={16} /><span>Cover</span><strong>{selectedProduct.name}</strong></div>
        <div className="summary-row"><Clock size={16} /><span>Duration</span><strong>{dur}</strong></div>
        <div className="summary-row"><Shield size={16} /><span>Coverage</span><strong>Up to K{(selectedProduct.coverageAmount||0).toLocaleString()}</strong></div>
      </div>

      <div className="section-head"><h2>Payment Method</h2></div>
      {PAYMENT_METHODS.map(m => (
        <button className={`method-card ${paymentMethod===m.id ? 'selected' : ''}`} key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}>
          <div className="method-logo">{LOGO_MAP[m.id]}</div>
          <div className="method-info"><strong>{m.name}</strong><small>{m.detail}</small></div>
          <div className="method-radio">{paymentMethod===m.id && <Check size={12} />}</div>
        </button>
      ))}

      {err && <div className="error-banner">{err}</div>}

      <div className="payment-total-row">
        <span className="payment-total-label">Total</span>
        <strong className="payment-total-price">K{selectedProduct.price}</strong>
      </div>

      <button className="btn-primary" type="button" onClick={pay} disabled={busy}>
        <Lock size={16} />
        {busy ? (stage === 'confirming' ? 'Activating cover...' : 'Processing...') : `Pay K${selectedProduct.price}`}
      </button>

      <div className="receipt-strip" onClick={() => {}}>
        <FileText size={18} className="receipt-strip-icon" />
        <div className="receipt-strip-text">
          <strong>Need a receipt?</strong>
          <span>You'll get an instant receipt after payment.</span>
        </div>
        <ChevronRight size={16} className="receipt-strip-chevron" />
      </div>

      {stage && !err && (
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Sandbox payment — no real charge</p>
      )}
    </div>
  );
}

/* ========== Active Cover ========== */
function ActiveCoverScreen({ goTo, coverState, countdown }) {
  const hasActive = coverState && countdown !== 'Expired';
  const expiresAt = coverState?.endsAt ? new Date(coverState.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const coverageAmount = coverState?.coverageAmount || coverState?.amount || 0;
  const durationLabel = (() => {
    if (!coverState?.endsAt || !coverState?.startedAt) return 'Single Trip';
    const mins = Math.round((new Date(coverState.endsAt) - new Date(coverState.startedAt)) / 60000);
    if (mins >= 60) return `${Math.floor(mins / 60)}h`;
    return `${mins} min`;
  })();

  return (
    <div className="screen with-pad active-cover-screen">
      <div className="safe-app-header">
        <div className="safe-app-header-left">
          <div className="safe-logo-icon"><span>S</span></div>
          <span className="safe-app-header-title">SAFE Commuter Insurance</span>
        </div>
        <button className="safe-header-bell" type="button" onClick={() => goTo('help')}><Bell size={18} /></button>
      </div>

      <h2 className="my-cover-title">My Cover</h2>

      {!coverState ? (
        <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Shield size={40} />
          <p>No active cover</p>
          <small>Protect your next trip with SAFE</small>
          <button className="btn-primary" type="button" onClick={() => goTo('choose')} style={{ marginTop: 20, width: 'auto', padding: '12px 32px' }}>
            Buy Cover
          </button>
        </div>
      ) : (
        <>
          <div className="cover-hero-card">
            <div className="cover-hero-left">
              <div className="cover-hero-shield-wrap">
                <ShieldCheck size={28} />
              </div>
              <span className="protected-pill"><CheckCircle2 size={12} /> You're Protected</span>
              <div className="countdown-large">{countdown || '--:--:--'}</div>
              {coverState.endsAt && (
                <p className="cover-hero-expires">
                  {hasActive ? `Expires at ${expiresAt}` : 'This cover has expired'}
                </p>
              )}
            </div>
            <div className="cover-hero-right">
              <BusIllustration width={130} height={85} />
              <div className="cover-hero-check-badge"><Check size={14} /></div>
            </div>
          </div>

          <div className="detail-grid-2x2">
            <div className="detail-tile">
              <div className="tile-icon"><FileText size={20} /></div>
              <span className="tile-label">Policy</span>
              <strong className="tile-value">{coverState.policyNumber || 'N/A'}</strong>
            </div>
            <div className="detail-tile">
              <div className="tile-icon"><Shield size={20} /></div>
              <span className="tile-label">Plan</span>
              <strong className="tile-value">{coverState.plan}</strong>
            </div>
            <div className="detail-tile">
              <div className="tile-icon"><Bus size={20} /></div>
              <span className="tile-label">Vehicle</span>
              <strong className="tile-value">{coverState.vehicle?.plateNumber || 'N/A'}</strong>
            </div>
            <div className="detail-tile">
              <div className="tile-icon"><MapPin size={20} /></div>
              <span className="tile-label">Route</span>
              <strong className="tile-value">{coverState.route ? `${coverState.route.origin} → ${coverState.route.destination}` : 'N/A'}</strong>
            </div>
          </div>

          <div className="glance-card">
            <h3 className="glance-title">Your Cover at a Glance</h3>
            <div className="glance-grid">
              <div className="glance-item">
                <span className="glance-label">Accident Cover</span>
                <strong className="glance-value">Up to K{coverageAmount.toLocaleString()}</strong>
              </div>
              <div className="glance-item">
                <span className="glance-label">Trip Cover</span>
                <strong className="glance-value">{durationLabel}</strong>
              </div>
              <div className="glance-item">
                <span className="glance-label">Medical Cover</span>
                <strong className="glance-value">Up to K{coverageAmount.toLocaleString()}</strong>
              </div>
              <div className="glance-item">
                <span className="glance-label">Coverage Type</span>
                <strong className="glance-value">Single Trip</strong>
              </div>
            </div>
            <div className="glance-shield-illust"><ShieldCheck size={32} /></div>
          </div>

          <div className="route-strip">
            <div className="route-strip-stops">
              <div className="route-stop"><div className="route-dot green" /><span>{coverState.route?.origin || 'Matero'}</span></div>
              <div className="route-strip-line"><Bus size={14} /></div>
              <div className="route-stop"><div className="route-dot red" /><span>{coverState.route?.destination || 'Town'}</span></div>
            </div>
            <p className="route-strip-est">Est. duration: ~30 mins</p>
          </div>

          <div className="cover-action-row">
            <button className="btn-secondary" type="button" onClick={() => goTo('history')} style={{ flex: 1 }}>
              <FileText size={16} /> History
            </button>
            {hasActive && (
              <button className="btn-danger" type="button" onClick={() => goTo('claimSubmit')} style={{ flex: 1 }}>
                <Siren size={16} /> Report Incident
              </button>
            )}
          </div>

          <div className="reassurance-card" onClick={() => {}}>
            <CheckCircle2 size={20} className="reassurance-icon" />
            <div className="reassurance-text">
              <strong>You're all set!</strong>
              <span>Enjoy your trip with SAFE. We've got you covered.</span>
            </div>
            <ChevronRight size={16} className="reassurance-chevron" />
          </div>
        </>
      )}
    </div>
  );
}

/* ========== History ========== */
function HistoryScreen({ goTo, history, claims }) {
  const [filter, setFilter] = useState('All');

  const items = useMemo(() => {
    let list = history.map(c => {
      const claim = claims.find(cl => cl.tripCoverId === c.id);
      return { ...c, claimStatus: claim?.status || null };
    });
    if (filter === 'Active') list = list.filter(c => c.status === 'active');
    if (filter === 'Expired') list = list.filter(c => c.status === 'expired');
    if (filter === 'Claims') list = list.filter(c => c.claimStatus);
    return list;
  }, [history, claims, filter]);

  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" type="button" onClick={() => goTo('home')}><ArrowLeft size={18} /></button>
        <span className="header-title">Trip History</span>
      </div>

      <div className="filter-row">
        {['All','Active','Expired','Claims'].map(f => (
          <button className={`filter-chip ${filter===f ? 'active' : ''}`} key={f} type="button" onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {items.length === 0 ? (
          <div className="empty-state"><Clock size={32} /><p>No trips yet</p><small>Your covered trips will appear here</small></div>
        ) : items.map(c => {
          const d = new Date(c.startedAt || c.createdAt);
          const mos = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return (
            <div className="history-card" key={c.id}>
              <div className="history-date">
                <strong>{d.getDate()}</strong>
                <small>{mos[d.getMonth()]}</small>
              </div>
              <div className="history-info">
                <span className="history-route">{c.route ? `${c.route.origin} → ${c.route.destination}` : c.plan}</span>
                <span className="history-meta">
                  {c.vehicle?.plateNumber || ''} · K{c.amount} {c.policyNumber ? `· ${c.policyNumber}` : ''}
                </span>
              </div>
              <span className={`badge ${c.status === 'active' ? 'active' : c.status === 'expired' ? 'expired' : 'pending'}`}>
                {c.claimStatus || c.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== Claim List ========== */
function ClaimListScreen({ goTo, claims, coverState }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <button className="back-btn" type="button" onClick={() => goTo('home')}><ArrowLeft size={18} /></button>
        <span className="header-title">Claims</span>
        {coverState && (
          <button type="button" onClick={() => goTo('claimSubmit')} style={{ background: 'none', border: 'none', color: 'var(--safe-green)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + New
          </button>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        {claims.length === 0 ? (
          <div className="empty-state">
            <FileText size={32} />
            <p>No claims submitted</p>
            <small>You have not submitted any claims</small>
          </div>
        ) : claims.map(cl => (
          <div className="history-card" key={cl.id}>
            <div className="history-date">
              <strong>{new Date(cl.createdAt).getDate()}</strong>
              <small>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date(cl.createdAt).getMonth()]}</small>
            </div>
            <div className="history-info">
              <span className="history-route">{cl.tripCover?.plan || 'Claim'} · {cl.tripCover?.policyNumber || ''}</span>
              <span className="history-meta">{cl.description?.slice(0,60)}{cl.description?.length > 60 ? '...' : ''}</span>
            </div>
            <span className={`badge ${cl.status === 'approved' ? 'active' : cl.status === 'rejected' ? 'danger' : 'pending'}`}>{cl.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ========== Claim Submit ========== */
function ClaimSubmitScreen({ goTo, session, coverState, history, refreshData }) {
  const [step, setStep] = useState(1);
  const [desc, setDesc] = useState('');
  const [police, setPolice] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const coverId = coverState?.id || history[0]?.id;

  const submit = async () => {
    if (!coverId) { setErr('No cover to claim against'); return; }
    setErr(''); setBusy(true);
    try {
      await createClaim(session.token, {
        tripCoverId: coverId,
        description: desc.trim(),
        policeReference: police.trim() || undefined,
      });
      await refreshData(session.token);
      setDone(true);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  if (done) return (
    <div className="screen with-pad" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'grid', placeItems: 'center', marginBottom: 16 }}>
        <CheckCircle2 size={32} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Claim Submitted</h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24 }}>Your claim has been submitted and is under review. We'll notify you of updates.</p>
      <button className="btn-primary" type="button" onClick={() => goTo('claim')} style={{ width: 'auto', padding: '12px 32px' }}>View Claims</button>
    </div>
  );

  return (
    <div className="screen with-pad">
      <div className="screen-header" style={{ margin: '-16px -16px 16px', padding: '12px 16px' }}>
        <button className="back-btn" type="button" onClick={() => step > 1 ? setStep(step-1) : goTo('claim')}><ArrowLeft size={18} /></button>
        <span className="header-title">{step === 1 ? 'Describe Incident' : 'Police Reference'}</span>
      </div>

      <div className="claim-step-indicators">
        <div className={`claim-step ${step >= 1 ? 'active' : ''}`} />
        <div className={`claim-step ${step >= 2 ? 'active' : ''}`} />
      </div>

      {err && <div className="error-banner">{err}</div>}

      {step === 1 && (
        <>
          <div className="section-head"><h2>What happened?</h2><p>Describe the incident in detail (min 10 characters)</p></div>
          <textarea className="claim-textarea" value={desc} onChange={e => setDesc(e.target.value)} maxLength={500} placeholder="Describe the accident, injuries, and circumstances..." />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>{desc.length}/500</p>
          <button className="btn-primary" type="button" disabled={desc.length < 10} onClick={() => setStep(2)} style={{ marginTop: 16 }}>
            Next <ArrowRight size={16} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <div className="section-head"><h2>Police / RTSA Reference</h2><p>Optional but speeds up approval</p></div>
          <input className="form-input" value={police} onChange={e => setPolice(e.target.value)} placeholder="e.g. POL-18492-LSK" />
          <button className="btn-primary" type="button" onClick={submit} disabled={busy} style={{ marginTop: 24 }}>
            <Send size={16} /> {busy ? 'Submitting...' : 'Submit Claim'}
          </button>
        </>
      )}
    </div>
  );
}

/* ========== Profile ========== */
function ProfileScreen({ goTo, session, setSession, history, claims, coverState, userName }) {
  return (
    <div className="screen">
      <div className="screen-header">
        <span className="header-title" style={{ flex: 1 }}>Account</span>
      </div>

      <div className="profile-header">
        <div className="profile-avatar"><CircleUserRound size={32} /></div>
        <h2 className="profile-name">{userName || 'SAFE User'}</h2>
        <p className="profile-phone">{session.user?.phone || session.user?.email || ''}</p>
      </div>

      <div className="profile-stats">
        <div className="profile-stat"><strong>{history.length}</strong><span>Trips</span></div>
        <div className="profile-stat"><strong>{claims.length}</strong><span>Claims</span></div>
        <div className="profile-stat"><strong>{coverState ? `K${coverState.amount}` : '—'}</strong><span>Active</span></div>
      </div>

      <div className="menu-list">
        <button className="menu-item" type="button" onClick={() => goTo('history')}><FileText size={18} /><span>Cover History</span><ChevronRight size={16} /></button>
        <button className="menu-item" type="button" onClick={() => goTo('claim')}><Siren size={18} /><span>My Claims</span><ChevronRight size={16} /></button>
        <button className="menu-item" type="button" onClick={() => goTo('help')}><ShieldCheck size={18} /><span>Help & Safety</span><ChevronRight size={16} /></button>
        <button className="menu-item danger" type="button" onClick={() => {
          clearToken();
          setSession({ token: '', user: null, ready: true });
          goTo('splash');
        }}>
          <LogOut size={18} /><span>Log out</span><ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ========== Help ========== */
function HelpScreen({ goTo, coverState }) {
  return (
    <div className="screen with-pad">
      <div className="screen-header" style={{ margin: '-16px -16px 16px', padding: '12px 16px' }}>
        <button className="back-btn" type="button" onClick={() => goTo('home')}><ArrowLeft size={18} /></button>
        <span className="header-title">Help & Safety</span>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <ShieldCheck size={40} style={{ color: 'var(--safe-green)', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>SAFE Support</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>We're here to help</p>
      </div>

      <div className="menu-list">
        {coverState && (
          <button className="menu-item" type="button" onClick={() => goTo('claimSubmit')}>
            <Siren size={18} /><span>Report an Accident</span><ChevronRight size={16} />
          </button>
        )}
        <button className="menu-item" type="button" onClick={() => goTo('activeCover')}>
          <Shield size={18} /><span>My Active Cover</span><ChevronRight size={16} />
        </button>
        <button className="menu-item" type="button" onClick={() => goTo('history')}>
          <Clock size={18} /><span>Trip History</span><ChevronRight size={16} />
        </button>
        <button className="menu-item" type="button" onClick={() => goTo('claim')}>
          <FileText size={18} /><span>My Claims</span><ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

export default App;
