import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleUserRound,
  FileText,
  HelpCircle,
  Shield,
  ShieldCheck,
  QrCode,
  Siren,
  Users,
} from 'lucide-react';
import HomeCoverHero from '../components/HomeCoverHero.jsx';
import HomeMapPreview from '../components/HomeMapPreview.jsx';
import safeLogo from '../assets/real/safe_logo_clean.png';
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

const SAFE_GREEN = '#007A3D';
const ICON_SIZE = 20;
const ICON_STROKE = 2;

function QuickActionCard({ title, subtitle, Icon, onClick }) {
  return (
    <button type="button" className="home-quick-card" onClick={onClick}>
      <span className="home-quick-card__icon" aria-hidden="true">
        <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} color={SAFE_GREEN} />
      </span>
      <span className="home-quick-card__title">{title}</span>
      <span className="home-quick-card__subtitle">{subtitle}</span>
    </button>
  );
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

        <header className="home-header">
          <div className="home-header__brand">
            <img className="home-header__logo" src={safeLogo} alt="SAFE" draggable={false} />
            <div className="home-header__text">
              <h1 className="home-header__greeting">{greeting}</h1>
              <p className="home-header__sub">Your SAFE cover status is below.</p>
            </div>
          </div>
          <button
            type="button"
            className="home-header__avatar"
            aria-label="Open profile"
            onClick={() => setScreen('profile')}
          >
            <CircleUserRound size={22} strokeWidth={2} color="#101820" aria-hidden="true" />
          </button>
        </header>

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
          <div className="home-quick-grid">
            <QuickActionCard
              title="Buy cover"
              subtitle="Protect your next trip."
              Icon={Shield}
              onClick={() => setScreen('choose')}
            />
            <QuickActionCard
              title="Verify"
              subtitle="Scan QR or enter code."
              Icon={QrCode}
              onClick={() => (session?.token ? setScreen('qrScanner') : setScreen('login'))}
            />
            <QuickActionCard
              title="Start claim"
              subtitle="Report an accident or request help."
              Icon={Siren}
              onClick={() => openClaimFlow(1)}
            />
            <QuickActionCard
              title="Help & Safety"
              subtitle="Accident steps and support."
              Icon={HelpCircle}
              onClick={() => setScreen('helpSafety')}
            />
            <QuickActionCard
              title="Contacts"
              subtitle="Trusted contacts."
              Icon={Users}
              onClick={() => setScreen('trustedContacts')}
            />
          </div>
        </section>

        <section className="home-section" aria-labelledby="home-live-trip-title">
          <h2 id="home-live-trip-title" className="home-section__title">
            Live trip
          </h2>
          <HomeMapPreview summaryTrip={activeTrip} onEnableLocation={requestLocation} />
        </section>

        <section className="home-section" aria-labelledby="home-claims-title">
          <h2 id="home-claims-title" className="home-section__title">
            Claims
          </h2>
          {latestClaim ? (
            <article className="home-claim-card">
              <div className="home-claim-card__top">
                <span className="home-claim-card__status">{formatClaimStatus(latestClaim.status)}</span>
                <time className="home-claim-card__time" dateTime={latestClaim.updatedAt}>
                  {formatActivityWhen(latestClaim.updatedAt)}
                </time>
              </div>
              {latestClaim.reference ? (
                <p className="home-claim-card__ref">Ref {latestClaim.reference}</p>
              ) : null}
              <button
                type="button"
                className="home-btn home-btn--text"
                onClick={() => setScreen('claim')}
              >
                View claim
              </button>
            </article>
          ) : (
            <div className="home-empty-card">
              <p className="home-empty-card__title">No active claim</p>
              <p className="home-empty-card__text">
                If something happened, start a claim and upload your documents.
              </p>
              <button
                type="button"
                className="home-btn home-btn--primary home-btn--compact"
                onClick={() => openClaimFlow(1)}
              >
                Start claim
              </button>
            </div>
          )}
        </section>

        <section className="home-section" aria-labelledby="home-activity-title">
          <h2 id="home-activity-title" className="home-section__title">
            Recent activity
          </h2>
          {recentActivity.length > 0 ? (
            <ul className="home-activity-list">
              {recentActivity.map((item) => (
                <li key={item.id} className="home-activity-item">
                  <div>
                    <strong>{item.title}</strong>
                    {item.subtitle ? <span>{item.subtitle}</span> : null}
                  </div>
                  <time dateTime={item.createdAt}>{formatActivityWhen(item.createdAt)}</time>
                </li>
              ))}
            </ul>
          ) : (
            <div className="home-empty-card home-empty-card--muted">
              <p className="home-empty-card__title">No recent activity yet.</p>
            </div>
          )}
          <button
            type="button"
            className="home-btn home-btn--text home-activity-history"
            onClick={() => openHistory('home')}
          >
            View cover history
          </button>
        </section>

        <section className="home-safety-note" aria-label="Safety note">
          <ShieldCheck size={22} color={SAFE_GREEN} aria-hidden="true" />
          <p>
            SAFE helps you prepare documents, contact support, and submit claims when something
            happens.
          </p>
          <button
            type="button"
            className="home-btn home-btn--secondary home-btn--compact"
            onClick={() => setScreen('helpSafety')}
          >
            Open Help & Safety
          </button>
        </section>
      </div>
    </main>
  );
}
