import heroContainer from '../assets/safe/hero/safe_hero_container_mobile_transparent.png';
import vehicleAsset from '../assets/safe/transport/green_bus_with_protective_emblem_transparent.png';
import {
  formatPlanLabel,
  formatStartedAt,
  formatVehicleLabel,
  remainingCoverLabel,
} from '../hooks/useActiveTrip.js';

function formatHeroDriverValue(driver) {
  if (!driver) return 'Vehicle pending';
  if (driver.verified) return 'Verified';
  return driver.name || 'Not assigned';
}

export default function HomeHeroCard({
  activeCoverState,
  countdown,
  isProtected,
  liveTrip,
}) {
  const statusChip = isProtected
    ? remainingCoverLabel(activeCoverState?.endsAt)
    : 'Unprotected';
  const title = isProtected ? 'Active Cover' : 'Secure Your Ride';
  const subtitle = isProtected
    ? 'Protected for this trip'
    : 'Protect your current commute';
  const showCountdown = isProtected && countdown && countdown !== '00:00:00';

  return (
    <section
      className={`home-hero-card home-hero-card--${isProtected ? 'active' : 'unprotected'}`}
      aria-label={isProtected ? 'Active cover' : 'Get covered'}
    >
      <div className="home-hero-shell">
        <img className="home-hero-container" src={heroContainer} alt="" aria-hidden="true" />

        <img
          className={`home-hero-vehicle${isProtected ? '' : ' home-hero-vehicle--muted'}`}
          src={vehicleAsset}
          alt=""
          aria-hidden="true"
        />

        <span className={`home-hero-chip${isProtected ? '' : ' home-hero-chip-muted'}`}>
          {statusChip}
        </span>
        <h1 className="home-hero-title">{title}</h1>
        <p className="home-hero-subtitle">{subtitle}</p>
        {showCountdown ? (
          <span className="home-hero-countdown" aria-live="polite">{countdown}</span>
        ) : null}
      </div>

      {isProtected ? (
        <div className="home-hero-meta">
          <div><span>Vehicle</span><strong>{formatVehicleLabel(activeCoverState?.vehicle)}</strong></div>
          <div><span>Driver</span><strong>{formatHeroDriverValue(liveTrip?.driver)}</strong></div>
          <div><span>Started</span><strong>{formatStartedAt(activeCoverState?.startedAt)}</strong></div>
          <div><span>Cover</span><strong>{formatPlanLabel(activeCoverState?.plan)}</strong></div>
        </div>
      ) : null}
    </section>
  );
}
