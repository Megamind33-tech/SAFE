import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import vehicleAsset from '../assets/safe/transport/green_bus_with_protective_emblem_transparent.png';
import iconArrowRight from '../assets/pack/icons/arrow-right.svg';
import { coverDurationMins, formatPlanLabel } from '../hooks/useActiveTrip.js';

function policyId(cover) {
  if (!cover?.id) return 'Pending';
  const stamp = cover.createdAt || cover.startedAt;
  const date = stamp ? new Date(stamp) : new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-${ymd}-${cover.id.slice(-4).toUpperCase()}`;
}

function formatExpiry(endsAt) {
  if (!endsAt) return 'Pending';
  return new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function routeRecord(cover) {
  return cover?.route ?? cover?.vehicle?.route ?? null;
}

function driverValue(cover) {
  const driver = cover?.vehicle?.driver;
  if (driver?.verified === true) return 'Verified';
  if (driver?.licenseNumber) return 'Verified';
  if (driver) return 'Pending';
  if (cover?.vehicle) return 'Verified';
  return 'Not assigned';
}

function routeValue(cover) {
  const route = routeRecord(cover);
  if (!route?.origin || !route?.destination) return 'Awaiting route';
  return `${route.origin} → ${route.destination}`;
}

function routeSubtitle(cover) {
  const route = routeRecord(cover);
  if (!route?.origin || !route?.destination) {
    return 'Start a cover to protect your next commute.';
  }
  return `Protected for this ${route.origin} to ${route.destination} trip`;
}

function planCoverTitle(plan) {
  const label = formatPlanLabel(plan);
  return label === 'Pending' ? 'Cover' : `${label} Cover`;
}

function glanceCoverChip(cover, isActive) {
  if (!isActive || !cover) return 'No cover';
  const mins = coverDurationMins(cover.startedAt, cover.endsAt);
  if (!mins) return 'Pending';
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (rem === 0) return `${hrs}h cover`;
    return `${hrs}h ${rem}m cover`;
  }
  return `${mins}m cover`;
}

function glanceRouteChip(cover, isActive) {
  if (!isActive || !cover) return 'Route pending';
  const route = routeRecord(cover);
  if (!route?.origin || !route?.destination) return 'Route set';
  return `${route.origin} → ${route.destination}`;
}

function glanceVehicleChip(cover, isActive) {
  if (!isActive || !cover?.vehicle?.plateNumber) return 'No vehicle';
  return cover.vehicle.plateNumber;
}

export default function CoverScreen({
  activeCoverState,
  openHistory,
  setScreen,
}) {
  const isActive = Boolean(activeCoverState);
  const route = routeRecord(activeCoverState);
  const origin = route?.origin;
  const destination = route?.destination;

  return (
    <main className="screen cover-screen cover-screen-board">
      <header className="cover-screen-board__header">
        <div className="cover-screen-board__brand">
          <img
            className="cover-screen-board__brand-icon"
            src={safeShieldIcon}
            alt=""
            aria-hidden="true"
          />
          <div className="cover-screen-board__brand-text">
            <span className="cover-screen-board__brand-name">SAFE</span>
            <span className="cover-screen-board__brand-sub">commuter cover</span>
          </div>
        </div>
        <span className="cover-screen-board__location">Lusaka</span>
      </header>

      <section className="cover-screen-board__title-area">
        <h1 className="cover-screen-board__title">My Cover</h1>
        <p className="cover-screen-board__title-sub">
          Your active protection and trip cover details.
        </p>
      </section>

      <section
        className={`cover-screen-board__hero${isActive ? '' : ' cover-screen-board__hero--inactive'}`}
        aria-label={isActive ? 'Active cover' : 'No active cover'}
      >
        <div className="cover-screen-board__hero-text">
          <span
            className={`cover-screen-board__hero-chip${
              isActive ? '' : ' cover-screen-board__hero-chip--muted'
            }`}
          >
            {isActive ? 'Active' : 'Unprotected'}
          </span>
          <h2 className="cover-screen-board__hero-title">
            {isActive ? planCoverTitle(activeCoverState.plan) : 'No active cover'}
          </h2>
          <p className="cover-screen-board__hero-sub">
            {isActive ? routeSubtitle(activeCoverState) : 'Start a cover to protect your next commute.'}
          </p>
          {isActive ? (
            <span className="cover-screen-board__hero-expiry">
              Valid until {formatExpiry(activeCoverState.endsAt)}
            </span>
          ) : (
            <button
              className="cover-screen-board__hero-cta"
              type="button"
              onClick={() => setScreen('choose')}
            >
              Choose cover
            </button>
          )}
        </div>
        {isActive ? (
          <div className="cover-screen-board__hero-asset">
            <img src={vehicleAsset} alt="" aria-hidden="true" />
          </div>
        ) : null}
      </section>

      <div className="cover-screen-board__info-grid">
        <article className="cover-screen-board__info-card">
          <span className="cover-screen-board__info-label">Vehicle</span>
          <strong className="cover-screen-board__info-value">
            {activeCoverState?.vehicle?.plateNumber || 'Not assigned'}
          </strong>
        </article>
        <article className="cover-screen-board__info-card">
          <span className="cover-screen-board__info-label">Driver</span>
          <strong className="cover-screen-board__info-value">
            {isActive ? driverValue(activeCoverState) : 'Not assigned'}
          </strong>
        </article>
        <article className="cover-screen-board__info-card">
          <span className="cover-screen-board__info-label">Route</span>
          <strong className="cover-screen-board__info-value">
            {isActive ? routeValue(activeCoverState) : 'Awaiting route'}
          </strong>
        </article>
        <article className="cover-screen-board__info-card">
          <span className="cover-screen-board__info-label">Cover</span>
          <strong className="cover-screen-board__info-value">
            {isActive ? formatPlanLabel(activeCoverState.plan) : 'Pending'}
          </strong>
        </article>
      </div>

      <section className="cover-screen-board__glance" aria-label="Cover at a glance">
        <div className="cover-screen-board__glance-head">
          <h3 className="cover-screen-board__glance-title">Cover at a Glance</h3>
          {isActive ? (
            <span className="cover-screen-board__glance-status">Protected</span>
          ) : (
            <span className="cover-screen-board__glance-status cover-screen-board__glance-status--muted">
              Unprotected
            </span>
          )}
        </div>

        <div className="cover-screen-board__route-summary">
          <div className="cover-screen-board__route-loc">
            <span className="cover-screen-board__route-loc-label">FROM</span>
            <span className="cover-screen-board__route-loc-value">{origin || '—'}</span>
          </div>

          <div className="cover-screen-board__route-connector" aria-hidden="true">
            <svg viewBox="0 0 72 28" width="72" height="28">
              <path
                d="M6 14 H58 M58 14 L52 10 M58 14 L52 18"
                fill="none"
                stroke="#007A3D"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="cover-screen-board__route-loc cover-screen-board__route-loc--to">
            <span className="cover-screen-board__route-loc-label">TO</span>
            <span className="cover-screen-board__route-loc-value">{destination || '—'}</span>
          </div>
        </div>

        <div className="cover-screen-board__glance-chips">
          <span className="cover-screen-board__glance-chip">
            {glanceCoverChip(activeCoverState, isActive)}
          </span>
          <span className="cover-screen-board__glance-chip">
            {glanceRouteChip(activeCoverState, isActive)}
          </span>
          <span className="cover-screen-board__glance-chip">
            {glanceVehicleChip(activeCoverState, isActive)}
          </span>
        </div>
      </section>

      <div className="cover-screen-board__actions">
        <button
          className="cover-screen-board__action cover-screen-board__action--history"
          type="button"
          onClick={() => openHistory('active')}
        >
          History
        </button>
        <button
          className="cover-screen-board__action cover-screen-board__action--incident"
          type="button"
          onClick={() => setScreen('claim')}
        >
          Report Incident
        </button>
      </div>

      {isActive ? (
        <button
          className="cover-screen-board__policy"
          type="button"
          onClick={() => openHistory('active')}
        >
          <span className="cover-screen-board__policy-copy">
            <span className="cover-screen-board__policy-label">Policy ID</span>
            <span className="cover-screen-board__policy-id">{policyId(activeCoverState)}</span>
          </span>
          <img src={iconArrowRight} alt="" aria-hidden="true" />
        </button>
      ) : null}
    </main>
  );
}
