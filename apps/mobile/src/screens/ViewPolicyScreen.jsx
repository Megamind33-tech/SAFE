import { ArrowLeft, FileText, Share2, Siren } from 'lucide-react';
import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import coverVerificationArt from '../assets/real/cover_verification_clean.png';
import routeStripArt from '../assets/real/route_strip_bus_clean.png';
import iconLockShield from '../assets/pack/icons/lock-shield.svg';
import { coverDurationMins, formatPlanLabel } from '../hooks/useActiveTrip.js';
import HomeMapPreview from '../components/HomeMapPreview.jsx';
import { useLiveTrip } from '../hooks/useLiveTrip.js';

function policyId(cover) {
  if (cover?.policyId) return String(cover.policyId);
  if (!cover?.id) return 'Pending';
  const stamp = cover.createdAt || cover.startedAt;
  const date = stamp ? new Date(stamp) : new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-${ymd}-${cover.id.slice(-4).toUpperCase()}`;
}

function routeRecord(cover) {
  return cover?.route ?? cover?.vehicle?.route ?? null;
}

function planCoverTitle(plan) {
  const label = formatPlanLabel(plan);
  return label === 'Pending' ? 'Cover' : `${label} Cover`;
}

function routeDisplay(cover) {
  const route = routeRecord(cover);
  if (!route?.origin || !route?.destination) return 'Awaiting route';
  return `${route.origin} → ${route.destination}`;
}

function heroSubtext(cover) {
  if (!cover) return 'No active cover';
  return `${planCoverTitle(cover)} • ${routeDisplay(cover)}`;
}

function formatValidUntil(endsAt) {
  if (!endsAt) return 'Pending';
  return new Date(endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso) {
  if (!iso) return 'Pending';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Pending';
  return date.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function coverDurationLabel(cover) {
  const mins = coverDurationMins(cover?.startedAt, cover?.endsAt);
  if (!mins) return 'Pending';
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (rem === 0) return `${hrs} hours`;
    return `${hrs}h ${rem}m`;
  }
  return `${mins} mins`;
}

function isCoverExpired(cover) {
  if (!cover?.endsAt) return false;
  return new Date(cover.endsAt).getTime() <= Date.now();
}

function ViewPolicyLiveMap({ openLiveTrip, goCover }) {
  const {
    trip,
    activeCover,
    loading,
    loadError,
    syncWarning,
    locationState,
    mapTileError,
    setMapTileError,
    refresh,
    requestLocationPermission,
    startTrip,
  } = useLiveTrip({ trackLocation: false });

  const handleStart = async () => {
    await requestLocationPermission();
    await startTrip();
    await refresh();
  };

  return (
    <section className="view-policy-map-section" aria-label="Live trip preview">
      <HomeMapPreview
        trip={trip}
        activeCover={activeCover}
        loading={loading}
        loadError={loadError}
        syncWarning={syncWarning}
        locationState={locationState}
        mapTileError={mapTileError}
        onRetry={() => {
          setMapTileError(false);
          refresh();
        }}
        onEnableLocation={requestLocationPermission}
        onStartTracking={handleStart}
        onBuyCover={goCover}
        onMapTileError={() => setMapTileError(true)}
        compact
      />
      {openLiveTrip ? (
        <button type="button" className="view-policy-map-section-link" onClick={openLiveTrip}>
          View full live map
        </button>
      ) : null}
    </section>
  );
}

export default function ViewPolicyScreen({
  activeCoverState,
  countdown,
  setScreen,
  viewPolicyReturn = 'active',
  openLiveTrip,
  goCover,
}) {
  const expired = isCoverExpired(activeCoverState);
  const displayCountdown = expired ? '00:00:00' : countdown || '00:00:00';
  const statusChip = expired ? 'Expired' : 'Cover Active';
  const hasCover = Boolean(activeCoverState);

  const verificationCode =
    activeCoverState?.verificationCode ||
    activeCoverState?.manualCode ||
    activeCoverState?.code ||
    activeCoverState?.referenceCode ||
    null;

  const detailRows = hasCover
    ? [
        { label: 'Policy ID', value: policyId(activeCoverState) },
        { label: 'Vehicle', value: activeCoverState.vehicle?.plateNumber || 'Not assigned' },
        { label: 'Route', value: routeDisplay(activeCoverState) },
        { label: 'Plan', value: planCoverTitle(activeCoverState.plan) },
        { label: 'Start time', value: formatDateTime(activeCoverState.startedAt || activeCoverState.createdAt) },
        { label: 'Valid until', value: formatValidUntil(activeCoverState.endsAt) },
        { label: 'Cover duration', value: coverDurationLabel(activeCoverState) },
        ...(verificationCode ? [{ label: 'Manual code', value: String(verificationCode) }] : []),
      ]
    : [
        { label: 'Policy ID', value: 'Pending' },
        { label: 'Vehicle', value: 'Not assigned' },
        { label: 'Route', value: 'Awaiting route' },
        { label: 'Plan', value: 'Pending' },
        { label: 'Start time', value: 'Pending' },
        { label: 'Valid until', value: 'Pending' },
        { label: 'Cover duration', value: 'Pending' },
      ];

  return (
    <main className="screen view-policy-screen">
      <header className="view-policy-screen__header">
        <button
          className="view-policy-screen__back"
          type="button"
          aria-label="Go back"
          onClick={() => setScreen(viewPolicyReturn)}
        >
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="view-policy-screen__title">Active Cover</h1>
        <span className="view-policy-screen__header-icon" aria-hidden="true">
          <img src={iconLockShield} alt="" />
        </span>
      </header>

      <section
        className={`view-policy-screen__hero${expired ? ' view-policy-screen__hero--expired' : ''}`}
        aria-label="Active cover status"
      >
        <img
          className="view-policy-screen__hero-shield"
          src={safeShieldIcon}
          alt=""
          aria-hidden="true"
        />
        <span className="view-policy-screen__hero-chip">{statusChip}</span>
        <h2 className="view-policy-screen__hero-heading">
          {expired ? 'Cover expired' : "You're protected"}
        </h2>
        <p className="view-policy-screen__hero-sub">{heroSubtext(activeCoverState)}</p>
        <span className="view-policy-screen__timer-label">Time remaining</span>
        <p className="view-policy-screen__timer" aria-live="polite">
          {displayCountdown}
        </p>
      </section>

      <section className="view-policy-trip-card" aria-label="Trip summary">
        <img className="view-policy-trip-card__strip" src={routeStripArt} alt="" aria-hidden="true" />
        <div className="view-policy-trip-card__body">
          <strong className="view-policy-trip-card__title">{routeDisplay(activeCoverState)}</strong>
          <p className="view-policy-trip-card__sub">
            {activeCoverState?.vehicle?.plateNumber
              ? `Vehicle ${activeCoverState.vehicle.plateNumber}`
              : 'Vehicle not assigned yet'}
          </p>
        </div>
      </section>

      <section className="view-policy-screen__details" aria-label="Policy details">
        {detailRows.map((row, index) => (
          <div
            key={row.label}
            className={`view-policy-screen__detail-row${
              index === detailRows.length - 1 ? ' view-policy-screen__detail-row--last' : ''
            }`}
          >
            <span className="view-policy-screen__detail-label">{row.label}</span>
            <strong className="view-policy-screen__detail-value">{row.value}</strong>
          </div>
        ))}
      </section>

      <ViewPolicyLiveMap openLiveTrip={openLiveTrip} goCover={goCover} />

      <section className="view-policy-verify-card" aria-label="Verification">
        <img className="view-policy-verify-card__art" src={coverVerificationArt} alt="" aria-hidden="true" />
        <div className="view-policy-verify-card__body">
          <strong>Verification</strong>
          <p>Show this screen for proof, or scan a vehicle QR to link your trip context.</p>
        </div>
        <button type="button" className="view-policy-verify-card__cta" onClick={() => setScreen('qrScanner')}>
          Scan vehicle QR
        </button>
      </section>

      <div className="view-policy-screen__actions">
        <button className="view-policy-screen__btn view-policy-screen__btn--document" type="button">
          <FileText size={20} strokeWidth={2.2} />
          <span>View Policy Document</span>
        </button>
        <button
          className="view-policy-screen__btn view-policy-screen__btn--danger"
          type="button"
          onClick={() => setScreen('claim')}
        >
          <Siren size={20} strokeWidth={2.2} />
          <span>Report Accident</span>
        </button>
      </div>

      <div className="view-policy-screen__secondary">
        <button className="view-policy-screen__mini-card" type="button">
          <FileText size={18} strokeWidth={2.2} />
          <span>Receipt</span>
        </button>
        <button className="view-policy-screen__mini-card" type="button">
          <Share2 size={18} strokeWidth={2.2} />
          <span>Share cover</span>
        </button>
      </div>
    </main>
  );
}
