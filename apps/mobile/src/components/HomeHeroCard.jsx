import heroContainer from '../assets/safe/hero/safe_hero_container_mobile_transparent.png';
import vehicleAsset from '../assets/safe/transport/green_bus_with_protective_emblem_transparent.png';
import {
  formatDriverLabel,
  formatPlanLabel,
  formatStartedAt,
  formatVehicleLabel,
  remainingCoverLabel,
} from '../hooks/useActiveTrip.js';

/**
 * Two-zone hero: text left (60%), single vehicle visual right (40%).
 * No shield overlays or route decorations — one composed panel.
 */
export default function HomeHeroCard({
  activeCoverState,
  countdown,
  isProtected,
  liveTrip,
}) {
  const status = isProtected ? 'active' : 'unprotected';
  const statusChip = isProtected
    ? remainingCoverLabel(activeCoverState?.endsAt)
    : 'Unprotected';
  const title = isProtected ? 'Active Cover' : 'Secure Your Ride';
  const subtitle = isProtected
    ? 'Protected for this trip'
    : 'Protect your current commute with instant accident medical coverage.';
  const showCountdown = isProtected && countdown && countdown !== '00:00:00';

  return (
    <section
      className={`home-hero-card home-hero-card--${status}`}
      aria-label={isProtected ? 'Active cover' : 'Get covered'}
    >
      <div className="home-hero-shell">
        <img className="home-hero-container" src={heroContainer} alt="" aria-hidden="true" />

        <div className="home-hero-text">
          <span className={`home-hero-chip${isProtected ? '' : ' home-hero-chip-muted'}`}>
            {statusChip}
          </span>
          <h1 className="home-hero-title">{title}</h1>
          <p className="home-hero-subtitle">{subtitle}</p>
          {showCountdown ? (
            <span className="home-hero-countdown" aria-live="polite">{countdown}</span>
          ) : null}
        </div>

        <div className={`home-hero-visual${isProtected ? '' : ' home-hero-visual--muted'}`}>
          <img
            className="home-hero-vehicle"
            src={vehicleAsset}
            alt=""
            aria-hidden="true"
          />
        </div>
      </div>

      {isProtected ? (
        <div className="home-hero-meta">
          <div><span>Vehicle</span><strong>{formatVehicleLabel(activeCoverState?.vehicle)}</strong></div>
          <div className="home-hero-meta-driver"><span>Driver</span><strong>{formatDriverLabel(liveTrip?.driver)}</strong></div>
          <div><span>Started</span><strong>{formatStartedAt(activeCoverState?.startedAt)}</strong></div>
          <div><span>Cover</span><strong>{formatPlanLabel(activeCoverState?.plan)}</strong></div>
        </div>
      ) : null}
    </section>
  );
}
