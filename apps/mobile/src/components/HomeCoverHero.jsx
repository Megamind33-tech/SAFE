import { useEffect, useState } from 'react';
import { AlertCircle, Calendar, ChevronRight, Clock3, ShieldCheck } from 'lucide-react';
import {
  formatCountdownClock,
  formatCoverEnds,
  isCoverActive,
  isCoverExpired,
  isPaymentPending,
} from '../services/home.js';
import safeBusHeroCity from '../assets/real/bus_hero_city_clean.png';
import lockShieldIcon from '../assets/pack/icons/lock-shield.svg';
import iconCoverPlan from '../assets/pack/icons/cover-daily.svg';

export default function HomeCoverHero({
  cover,
  syncWarning,
  onViewCover,
  onStartClaim,
  onBuyCover,
  onHowSafeWorks,
  onCompletePayment,
  onRetry,
  loadError,
}) {
  const active = isCoverActive(cover);
  const [countdown, setCountdown] = useState(() =>
    cover?.endsAt && active ? formatCountdownClock(cover.endsAt) : null,
  );

  useEffect(() => {
    if (!cover?.endsAt || !active) {
      setCountdown(null);
      return undefined;
    }
    const tick = () => setCountdown(formatCountdownClock(cover.endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cover?.endsAt, cover?.status, cover?.paymentStatus, active]);

  if (loadError) {
    return (
      <section className="home-hero home-hero--error" aria-live="assertive">
        <div className="home-hero__content">
          <h2 className="home-hero__title">Couldn’t load cover status</h2>
          <p className="home-hero__subtitle">Check your connection and try again.</p>
          <div className="home-hero__actions">
            <button type="button" className="home-btn home-btn--primary" onClick={onRetry}>
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <CoverHeroBody
      cover={cover}
      countdown={countdown}
      active={active}
      onViewCover={onViewCover}
      onStartClaim={onStartClaim}
      onBuyCover={onBuyCover}
      onHowSafeWorks={onHowSafeWorks}
      onCompletePayment={onCompletePayment}
      syncWarning={syncWarning}
    />
  );
}

function HeroPill({ tone, children }) {
  const showWarnIcon = tone === 'warn' || tone === 'muted';
  return (
    <span className={`home-hero__pill home-hero__pill--${tone}`}>
      {tone === 'active' ? <ShieldCheck size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
      {showWarnIcon ? <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function CoverHeroBody({
  cover,
  countdown,
  active,
  onViewCover,
  onStartClaim,
  onBuyCover,
  onHowSafeWorks,
  onCompletePayment,
  syncWarning,
}) {
  const pending = isPaymentPending(cover);
  const expired = isCoverExpired(cover) || (cover && !active && !pending);

  const heroArt = safeBusHeroCity;
  const heroModifier = pending
    ? 'pending'
    : active
      ? 'active'
      : expired && cover
        ? 'expired'
        : 'none';

  let pill = { tone: 'muted', label: 'Not covered' };
  let title = 'You’re not covered yet';
  let subtitle = 'Buy SAFE cover before your next trip.';
  let primary = { label: 'Buy cover', onClick: onBuyCover };
  let secondary = { label: 'How SAFE works', onClick: onHowSafeWorks };
  let showPaymentFootnote = true;
  let showProtectedFootnote = false;

  if (pending) {
    pill = { tone: 'warn', label: 'Payment pending' };
    title = 'Payment pending';
    subtitle = 'Complete payment to activate your SAFE cover.';
    primary = { label: 'Complete payment', onClick: onCompletePayment };
    secondary = null;
    showPaymentFootnote = false;
  } else if (active) {
    pill = { tone: 'active', label: 'Active cover' };
    title = 'You’re covered';
    subtitle = 'Your SAFE cover is active for this trip.';
    primary = { label: 'View cover', onClick: onViewCover };
    secondary = { label: 'Start claim', onClick: onStartClaim };
    showPaymentFootnote = false;
    showProtectedFootnote = true;
  } else if (expired && cover) {
    pill = { tone: 'expired', label: 'Expired' };
    title = 'Cover expired';
    subtitle = 'Your last SAFE cover has ended.';
    primary = { label: 'Buy cover again', onClick: onBuyCover };
    secondary = null;
    showPaymentFootnote = false;
  }

  return (
    <section
      className={`home-hero home-hero--${heroModifier}`}
      aria-label={active ? 'Active cover' : pending ? 'Payment pending' : 'Cover status'}
    >
      {syncWarning ? <p className="home-sync-warning home-sync-warning--hero">{syncWarning}</p> : null}

      <div className="home-hero__content">
        <HeroPill tone={pill.tone}>{pill.label}</HeroPill>
        <h2 className="home-hero__title">{title}</h2>
        <p className="home-hero__subtitle">{subtitle}</p>

        {active ? (
          <dl className="home-hero__details home-hero__details--active">
            <div className="home-hero__detail">
              <dt>
                <img src={iconCoverPlan} alt="" aria-hidden="true" className="home-hero__detail-icon" />
                Plan
              </dt>
              <dd>{cover.planName}</dd>
            </div>
            <div className="home-hero__detail">
              <dt>
                <Clock3 size={16} strokeWidth={2.25} aria-hidden="true" className="home-hero__detail-icon" />
                Time remaining
              </dt>
              <dd aria-live="polite">{countdown || '00:00:00'}</dd>
            </div>
            <div className="home-hero__detail">
              <dt>
                <Calendar size={16} strokeWidth={2.25} aria-hidden="true" className="home-hero__detail-icon" />
                Cover ends
              </dt>
              <dd>{formatCoverEnds(cover.endsAt)}</dd>
            </div>
          </dl>
        ) : null}

        <div className={`home-hero__actions ${active ? 'home-hero__actions--pair' : ''}`}>
          <button type="button" className="home-btn home-btn--primary" onClick={primary.onClick}>
            {primary.label}
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {secondary ? (
            <button type="button" className="home-btn home-btn--secondary" onClick={secondary.onClick}>
              {secondary.label}
              {active ? <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" /> : null}
            </button>
          ) : null}
        </div>

        {showPaymentFootnote ? (
          <p className="home-hero__note">
            <img src={lockShieldIcon} alt="" aria-hidden="true" className="home-hero__note-icon" />
            <span>Cover starts after successful payment.</span>
          </p>
        ) : null}
        {showProtectedFootnote ? (
          <p className="home-hero__note home-hero__note--protected">
            <ShieldCheck size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>Protected for the current journey</span>
          </p>
        ) : null}
      </div>

      <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
    </section>
  );
}
