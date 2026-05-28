import { useEffect, useState } from 'react';
import {
  formatCoverEnds,
  formatTimeRemaining,
  isCoverActive,
  isCoverExpired,
  isPaymentPending,
} from '../services/home.js';
import safeBusProtected from '../assets/transport/green_bus_with_protective_emblem_transparent.png';
import safeNoCover from '../assets/real/no_active_cover_clean.png';
import safeBusHeroCity from '../assets/real/bus_hero_city_clean.png';

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
        <h2 className="home-hero__title">Couldn’t load cover status</h2>
        <p className="home-hero__subtitle">Check your connection and try again.</p>
        <button type="button" className="home-btn home-btn--primary" onClick={onRetry}>
          Retry
        </button>
      </section>
    );
  }

  if (syncWarning) {
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

  const heroArt = pending
    ? safeBusHeroCity
    : active
      ? safeBusProtected
      : expired
        ? safeBusHeroCity
        : safeNoCover;

  if (pending) {
    return (
      <section className="home-hero home-hero--pending" aria-label="Payment pending">
        {syncWarning ? <p className="home-sync-warning">{syncWarning}</p> : null}
        <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
        <span className="home-hero__pill home-hero__pill--warn">Payment pending</span>
        <h2 className="home-hero__title">Payment pending</h2>
        <p className="home-hero__subtitle">Complete payment to activate your SAFE cover.</p>
        <div className="home-hero__actions">
          <button type="button" className="home-btn home-btn--primary" onClick={onCompletePayment}>
            Complete payment
          </button>
        </div>
      </section>
    );
  }

  if (active) {
    return (
      <section className="home-hero home-hero--active" aria-label="Active cover">
        {syncWarning ? <p className="home-sync-warning">{syncWarning}</p> : null}
        <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
        <span className="home-hero__pill home-hero__pill--active">Active</span>
        <h2 className="home-hero__title">You’re covered</h2>
        <p className="home-hero__subtitle">Your SAFE cover is active.</p>
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
        <div className="home-hero__actions">
          <button type="button" className="home-btn home-btn--primary" onClick={onViewCover}>
            View cover
          </button>
          <button type="button" className="home-btn home-btn--secondary" onClick={onStartClaim}>
            Start claim
          </button>
        </div>
      </section>
    );
  }

  if (expired && cover) {
    return (
      <section className="home-hero home-hero--expired" aria-label="Cover expired">
        {syncWarning ? <p className="home-sync-warning">{syncWarning}</p> : null}
        <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
        <span className="home-hero__pill home-hero__pill--muted">Expired</span>
        <h2 className="home-hero__title">Cover expired</h2>
        <p className="home-hero__subtitle">Your last SAFE cover has ended.</p>
        <div className="home-hero__actions">
          <button type="button" className="home-btn home-btn--primary" onClick={onBuyCover}>
            Buy cover again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="home-hero home-hero--none" aria-label="No active cover">
      {syncWarning ? <p className="home-sync-warning">{syncWarning}</p> : null}
      <img className="home-hero__art" src={heroArt} alt="" aria-hidden="true" />
      <span className="home-hero__pill home-hero__pill--muted">Not covered</span>
      <h2 className="home-hero__title">You’re not covered yet</h2>
      <p className="home-hero__subtitle">Buy SAFE cover before your next trip.</p>
      <div className="home-hero__actions">
        <button type="button" className="home-btn home-btn--primary" onClick={onBuyCover}>
          Buy cover
        </button>
        <button type="button" className="home-btn home-btn--secondary" onClick={onHowSafeWorks}>
          How SAFE works
        </button>
      </div>
      <p className="home-hero__note">Cover starts after successful payment.</p>
    </section>
  );
}
