import { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, ShieldCheck } from 'lucide-react';
import {
  formatCoverEnds,
  formatTimeRemaining,
  isCoverActive,
  isCoverExpired,
  isPaymentPending,
} from '../services/home.js';
import safeBusHeroCity from '../assets/real/bus_hero_city_clean.png';
import safeBusProtected from '../assets/transport/green_bus_with_protective_emblem_transparent.png';
import lockShieldIcon from '../assets/pack/icons/lock-shield.svg';

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
  const [timeLeft, setTimeLeft] = useState(() =>
    cover?.endsAt ? formatTimeRemaining(cover.endsAt) : null,
  );

  useEffect(() => {
    if (!cover?.endsAt || !isCoverActive(cover)) {
      setTimeLeft(null);
      return undefined;
    }
    const tick = () => setTimeLeft(formatTimeRemaining(cover.endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cover?.endsAt, cover?.status, cover?.paymentStatus]);

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
      timeLeft={timeLeft}
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
  const showIcon = tone === 'warn' || tone === 'muted';
  return (
    <span className={`home-hero__pill home-hero__pill--${tone}`}>
      {showIcon ? <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

function CoverHeroBody({
  cover,
  timeLeft,
  onViewCover,
  onStartClaim,
  onBuyCover,
  onHowSafeWorks,
  onCompletePayment,
  syncWarning,
}) {
  const pending = isPaymentPending(cover);
  const active = isCoverActive(cover) && Boolean(timeLeft);
  const expired = isCoverExpired(cover) || (cover && !active && !pending);

  const heroArt = pending || !active ? safeBusHeroCity : safeBusProtected;
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
  let showFootnote = true;

  if (pending) {
    pill = { tone: 'warn', label: 'Payment pending' };
    title = 'Payment pending';
    subtitle = 'Complete payment to activate your SAFE cover.';
    primary = { label: 'Complete payment', onClick: onCompletePayment };
    secondary = null;
    showFootnote = false;
  } else if (active) {
    pill = { tone: 'active', label: 'Active' };
    title = 'You’re covered';
    subtitle = 'Your SAFE cover is active.';
    primary = { label: 'View cover', onClick: onViewCover };
    secondary = { label: 'Start claim', onClick: onStartClaim };
    showFootnote = false;
  } else if (expired && cover) {
    pill = { tone: 'expired', label: 'Expired' };
    title = 'Cover expired';
    subtitle = 'Your last SAFE cover has ended.';
    primary = { label: 'Buy cover again', onClick: onBuyCover };
    secondary = null;
    showFootnote = false;
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
          <dl className="home-hero__details">
            <div>
              <dt>Plan</dt>
              <dd>{cover.planName}</dd>
            </div>
            <div>
              <dt>Time remaining</dt>
              <dd aria-live="polite">{timeLeft || 'Ending soon'}</dd>
            </div>
            <div>
              <dt>Cover ends</dt>
              <dd>{formatCoverEnds(cover.endsAt)}</dd>
            </div>
            {cover.policyId ? (
              <div>
                <dt>Policy</dt>
                <dd>{cover.policyId}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="home-hero__actions">
          <button type="button" className="home-btn home-btn--primary" onClick={primary.onClick}>
            {primary.label}
            <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {secondary ? (
            <button type="button" className="home-btn home-btn--secondary" onClick={secondary.onClick}>
              {secondary.label}
            </button>
          ) : null}
        </div>

        {showFootnote ? (
          <p className="home-hero__note">
            <img src={lockShieldIcon} alt="" aria-hidden="true" className="home-hero__note-icon" />
            <span>Cover starts after successful payment.</span>
          </p>
        ) : active ? (
          <p className="home-hero__note">
            <ShieldCheck size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>Your trip is protected while cover is active.</span>
          </p>
        ) : null}
      </div>

      <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
    </section>
  );
}
