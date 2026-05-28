import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import HomeCoverHero from '../components/HomeCoverHero.jsx';
import HomeMapPreview from '../components/HomeMapPreview.jsx';
import safeLogo from '../assets/real/safe_logo_clean.png';
import safeAppIcon from '../assets/SAFE_app_icon_master_3D_1024.png';
import networkErrorArt from '../assets/pack/empty-states/network-error.png';
import noClaimsArt from '../assets/pack/empty-states/no-claims.png';
import iconBuyCover from '../assets/pack/icons/cover-plus.svg';
import iconVerify from '../assets/pack/icons/qr-scan.svg';
import iconClaim from '../assets/pack/icons/claim-accident.svg';
import iconHelp from '../assets/pack/icons/claim-support.svg';
import iconContacts from '../assets/pack/icons/nav-account.svg';
import iconClaimDoc from '../assets/pack/icons/claim-document.svg';
import iconActivity from '../assets/pack/icons/receipt.svg';
import {
  fetchHomeSummary,
  formatActivityWhen,
  formatClaimStatus,
  getDisplayCover,
  greetingForUser,
  readCachedHomeSummary,
  writeCachedHomeSummary,
} from '../services/home.js';
import { resolveUserName } from '../utils/activeCover.js';

function QuickActionCard({ title, subtitle, iconSrc, onClick }) {
  return (
    <button type="button" className="home-quick-card" onClick={onClick}>
      <span className="home-quick-card__icon" aria-hidden="true">
        <img src={iconSrc} alt="" />
      </span>
      <span className="home-quick-card__title">{title}</span>
      <span className="home-quick-card__subtitle">{subtitle}</span>
    </button>
  );
}

function liveTripStatusLabel(activeTrip) {
  if (!activeTrip?.id) return 'No active trip';
  if (activeTrip?.status === 'active') return 'Trip in progress';
  return 'Trip update';
}

export default function HomeScreen({
  session,
  setScreen,
  goCover,
  openClaimFlow,
  openHistory,
}) {
  const cached = readCachedHomeSummary();
  const [summary, setSummary] = useState(cached);
  const [loading, setLoading] = useState(() => !cached);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [coverSyncWarning, setCoverSyncWarning] = useState('');

  const summaryRef = useRef(summary);
  summaryRef.current = summary;
  const token = session?.token || '';

  const userName = summary?.user?.fullName || resolveUserName(session?.user);
  const greeting = greetingForUser(userName);
  const displayCover = getDisplayCover(summary);
  const latestClaim = summary?.latestClaim ?? null;
  const recentActivity = summary?.recentActivity ?? [];
  const activeTrip = summary?.activeTrip ?? null;
  const tripStatusLabel = liveTripStatusLabel(activeTrip);

  const loadSummary = useCallback(async () => {
    if (!token) {
      setSummary(null);
      setLoading(false);
      setLoadError('');
      setSyncWarning('');
      setCoverSyncWarning('');
      writeCachedHomeSummary(null);
      return;
    }

    const hadSummary = Boolean(summaryRef.current);
    if (!hadSummary) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');
    setCoverSyncWarning('');

    try {
      const next = await fetchHomeSummary(token);
      setSummary(next);
      writeCachedHomeSummary(next);
      setLoadError('');
      setSyncWarning('');
      setCoverSyncWarning('');
    } catch {
      if (readCachedHomeSummary()) {
        setSyncWarning('Could not refresh home. Showing your last saved status.');
        setCoverSyncWarning('Could not refresh cover status. Showing your last saved cover.');
        setLoadError('');
      } else {
        setLoadError('Couldn’t load home');
        setSyncWarning('');
        setCoverSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stored = readCachedHomeSummary();
    if (stored) {
      setSummary(stored);
      setLoading(false);
    }
    loadSummary();
  }, [loadSummary]);

  const requestLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(() => loadSummary(), () => {});
  };

  if (loading && !summary) {
    return (
      <main className="screen home-screen home-command-center home-screen-board" aria-busy="true">
        <div className="home-loading">Loading your SAFE status…</div>
      </main>
    );
  }

  if (loadError && !summary) {
    return (
      <main className="screen home-screen home-command-center home-screen-board" aria-live="assertive">
        <section className="home-full-error">
          <img className="home-full-error__art" src={networkErrorArt} alt="" aria-hidden="true" />
          <h1>Couldn’t load home</h1>
          <p>Check your connection and try again.</p>
          <button type="button" className="home-btn home-btn--primary" onClick={loadSummary}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen home-screen home-command-center home-screen-board">
      <div className="home-command-center__scroll">
        {syncWarning ? (
          <p className="home-sync-warning home-sync-warning--page" role="status">
            {syncWarning}
          </p>
        ) : null}

        <header className="home-topbar">
          <img className="home-topbar__logo" src={safeLogo} alt="SAFE" draggable={false} />
          <button
            type="button"
            className="home-topbar__avatar"
            aria-label="Open profile"
            onClick={() => setScreen('profile')}
          >
            <img src={safeAppIcon} alt="" aria-hidden="true" />
            <span className="home-topbar__avatar-dot" aria-hidden="true" />
          </button>
        </header>

        <div className="home-greeting-block">
          <h1 className="home-greeting-block__title">{greeting}</h1>
          <p className="home-greeting-block__sub">Your SAFE cover status is below.</p>
        </div>

        <HomeCoverHero
          cover={displayCover}
          syncWarning={coverSyncWarning || undefined}
          loadError={false}
          onViewCover={goCover}
          onStartClaim={() => openClaimFlow(1)}
          onBuyCover={() => setScreen('choose')}
          onHowSafeWorks={() => setScreen('helpSafety')}
          onCompletePayment={() => setScreen('payment')}
          onRetry={loadSummary}
        />

        <section className="home-section" aria-label="Quick actions">
          <div className="home-section__head">
            <h2 className="home-section__title">Quick actions</h2>
            <button type="button" className="home-section__link" onClick={() => setScreen('helpSafety')}>
              See all
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="home-quick-scroll">
            <QuickActionCard
              title="Buy cover"
              subtitle="Protect your next trip."
              iconSrc={iconBuyCover}
              onClick={() => setScreen('choose')}
            />
            <QuickActionCard
              title="Verify"
              subtitle="Scan QR or enter code."
              iconSrc={iconVerify}
              onClick={() => (session?.token ? setScreen('qrScanner') : setScreen('login'))}
            />
            <QuickActionCard
              title="Start claim"
              subtitle="Report an accident."
              iconSrc={iconClaim}
              onClick={() => openClaimFlow(1)}
            />
            <QuickActionCard
              title="Help & Safety"
              subtitle="Accident steps and support."
              iconSrc={iconHelp}
              onClick={() => setScreen('helpSafety')}
            />
            <QuickActionCard
              title="Contacts"
              subtitle="Trusted contacts."
              iconSrc={iconContacts}
              onClick={() => setScreen('trustedContacts')}
            />
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-live-trip-title">
          <div className="home-section__head">
            <h2 id="home-live-trip-title" className="home-section__title">
              Live trip
            </h2>
            <span
              className={`home-trip-pill ${activeTrip?.id ? 'home-trip-pill--live' : ''}`}
              role="status"
            >
              <i aria-hidden="true" />
              {tripStatusLabel}
            </span>
          </div>
          <HomeMapPreview
            summaryTrip={activeTrip}
            onEnableLocation={requestLocation}
            onStartCover={() => setScreen('choose')}
          />
        </section>

        <section className="home-dual-row" aria-label="Claims and activity">
          <article className="home-mini-card home-mini-card--claims">
            <div className="home-mini-card__icon-wrap home-mini-card__icon-wrap--alert">
              <img src={iconClaimDoc} alt="" aria-hidden="true" />
            </div>
            {latestClaim ? (
              <>
                <h3 className="home-mini-card__title">{formatClaimStatus(latestClaim.status)}</h3>
                {latestClaim.reference ? (
                  <p className="home-mini-card__meta">Ref {latestClaim.reference}</p>
                ) : null}
                <button
                  type="button"
                  className="home-mini-card__btn home-mini-card__btn--light"
                  onClick={() => setScreen('claim')}
                >
                  View claim
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </>
            ) : (
              <>
                <h3 className="home-mini-card__title">No active claim</h3>
                <p className="home-mini-card__meta">Start a claim if something happened on your trip.</p>
                <button
                  type="button"
                  className="home-mini-card__btn home-mini-card__btn--claim"
                  onClick={() => openClaimFlow(1)}
                >
                  Start claim
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                <img className="home-mini-card__bg-art" src={noClaimsArt} alt="" aria-hidden="true" />
              </>
            )}
          </article>

          <article className="home-mini-card home-mini-card--activity">
            <div className="home-mini-card__icon-wrap">
              <img src={iconActivity} alt="" aria-hidden="true" />
            </div>
            <h3 className="home-mini-card__title">Recent activity</h3>
            {recentActivity.length > 0 ? (
              <ul className="home-mini-activity">
                {recentActivity.slice(0, 2).map((item) => (
                  <li key={item.id}>
                    <strong>{item.title}</strong>
                    <time dateTime={item.createdAt}>{formatActivityWhen(item.createdAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-mini-card__meta">No recent activity yet.</p>
            )}
            <button
              type="button"
              className="home-mini-card__text-link"
              onClick={() => openHistory('home')}
            >
              View cover history
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </article>
        </section>
      </div>
    </main>
  );
}
