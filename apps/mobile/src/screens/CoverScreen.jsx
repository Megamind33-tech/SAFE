import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bus,
  Calendar,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Headphones,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react';
import PaymentBrandIcon from '../components/PaymentBrandIcon.jsx';
import {
  formatCoverEnds,
  formatCoverPeriod,
  formatTimeRemaining,
  isCoverActive,
  isCoverExpired,
  loadCoverScreenBundle,
  readCachedCoverScreen,
  writeCachedCoverScreen,
} from '../services/cover.js';
import { deriveHomeLiveTripState, isPaymentPending } from '../services/home.js';
import { providerDisplayName } from '../services/paymentMethods.js';
import busHeroCityArt from '../assets/real/bus_hero_city_clean.png';
import noCoverArt from '../assets/real/no_active_cover_clean.png';
import iconCoverPlan from '../assets/pack/icons/cover-daily.svg';
import iconClaimMedical from '../assets/pack/icons/claim-medical.svg';
import iconClaimSupport from '../assets/pack/icons/claim-support.svg';
import iconEmergency from '../assets/pack/icons/emergency-call.svg';
import iconCoverPlus from '../assets/pack/icons/cover-plus.svg';

function tripSummaryForLiveState(trip) {
  if (!trip) return null;
  return {
    mapTrip: {
      status: trip.status === 'active' ? 'active' : trip.status,
      routePolyline: trip.route?.polyline ?? [],
      currentLocation: trip.vehicleLocation,
      startLocation: trip.route?.start,
      endedAt: trip.expiresAt,
      coverExpired: false,
    },
  };
}

function formatPassengerLabel(fullName) {
  if (!fullName?.trim()) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const initial = parts[parts.length - 1].charAt(0);
  return `${parts[0]} ${initial}.`;
}

function policyNumberLabel(cover) {
  if (cover?.policyId) return String(cover.policyId);
  if (!cover?.id) return null;
  return null;
}

function vehiclePrimary(cover) {
  return cover?.vehicle?.plateNumber || null;
}

function formatTimeRemainingDisplay(endsAt) {
  if (!endsAt) return '—';
  const label = formatTimeRemaining(endsAt);
  if (!label) return 'Ending soon';
  return label.replace(/\s+left$/i, '');
}

/** Compact two-line “Ends” value for hero stats panel */
function formatCoverEndsCompact(endsAt) {
  if (!endsAt) return null;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const sameDay =
    end.getDate() === now.getDate() &&
    end.getMonth() === now.getMonth() &&
    end.getFullYear() === now.getFullYear();
  const time = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return { line1: 'Today', line2: time };
  return {
    line1: end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    line2: time,
  };
}

function vehicleSecondary(cover) {
  const route = cover?.route;
  if (route?.origin && route?.destination) {
    return `${route.origin} → ${route.destination}`;
  }
  if (cover?.vehicle?.busId) return `Bus ${cover.vehicle.busId}`;
  return null;
}

const DEFAULT_BENEFITS = [
  { title: 'Accident medical support', value: 'Included', icon: iconClaimMedical },
  { title: 'Personal accident benefit', value: 'Based on selected plan', icon: iconCoverPlus },
  { title: 'Emergency assistance', value: '24/7 support where available', icon: iconEmergency },
  { title: 'Claims support', value: 'In-app guidance', icon: iconClaimSupport },
];

export default function CoverScreen({
  session,
  setScreen,
  openHistory,
  openClaimFlow,
  openLiveTrip,
  onBuyCover,
  onCheckPendingPurchase,
  capabilities: capabilitiesProp,
}) {
  const cached = readCachedCoverScreen();
  const [bundle, setBundle] = useState(cached);
  const [loading, setLoading] = useState(() => !cached);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [copiedPolicy, setCopiedPolicy] = useState(false);

  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const token = session?.token || '';

  const activeCover = bundle?.activeCover ?? null;
  const lastEndedCover = bundle?.lastEndedCover ?? null;
  const pendingCover = bundle?.pendingCover ?? null;
  const trip = bundle?.trip ?? null;
  const defaultPaymentMethod = bundle?.defaultPaymentMethod ?? null;
  const capabilities = bundle?.capabilities ?? capabilitiesProp ?? {};

  const active = isCoverActive(activeCover);
  const pending = !active && Boolean(pendingCover) && isPaymentPending(pendingCover);
  const expired = !active && !pending && isCoverExpired(lastEndedCover);
  const liveTripState = useMemo(
    () => deriveHomeLiveTripState(activeCover, tripSummaryForLiveState(trip)),
    [activeCover, trip],
  );

  const planBenefits = useMemo(() => {
    if (!activeCover?.planId || !bundle?.plans?.length) return DEFAULT_BENEFITS;
    const plan = bundle.plans.find((p) => p.id === activeCover.planId);
    if (!plan?.benefits?.length) return DEFAULT_BENEFITS;
    const icons = [iconClaimMedical, iconCoverPlus, iconEmergency, iconClaimSupport];
    return plan.benefits.slice(0, 4).map((text, i) => ({
      title: text.length > 42 ? text.slice(0, 40) + '…' : text,
      value: 'Included',
      icon: icons[i] ?? iconCoverPlus,
    }));
  }, [activeCover?.planId, bundle?.plans]);

  const passengerName =
    session?.user?.passengerProfile?.fullName?.trim() ||
    session?.user?.name?.trim() ||
    null;

  const loadBundle = useCallback(async () => {
    if (!token) {
      setBundle(null);
      setLoading(false);
      writeCachedCoverScreen(null);
      return;
    }

    const had = Boolean(bundleRef.current);
    if (!had) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await loadCoverScreenBundle(token);
      setBundle(next);
      writeCachedCoverScreen(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedCoverScreen()) {
        setSyncWarning('Could not refresh cover. Showing your last saved cover.');
        setLoadError('');
      } else {
        setLoadError("Couldn't load cover plans");
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stored = readCachedCoverScreen();
    if (stored) {
      setBundle(stored);
      setLoading(false);
    }
    loadBundle();
  }, [loadBundle]);

  useEffect(() => {
    if (!activeCover?.endsAt || !active) {
      setCountdown(null);
      return undefined;
    }
    const tick = () => setCountdown(formatTimeRemainingDisplay(activeCover.endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCover?.endsAt, active]);

  const copyPolicy = async () => {
    const value = policyNumberLabel(activeCover);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPolicy(true);
      setTimeout(() => setCopiedPolicy(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const importantNote = useMemo(() => {
    if (active) {
      if (liveTripState === 'active_trip_live') {
        return {
          title: 'Live trip tracking is active.',
          sub: 'Your journey is being tracked with real-time protection updates.',
          static: true,
        };
      }
      if (liveTripState === 'trip_completed_cover_active') {
        return {
          title: 'Trip completed',
          sub: 'Your cover remains active until the policy end time shown above.',
          static: true,
        };
      }
      return {
        title: 'Important',
        sub: 'Start your live trip when you begin your journey to enable real-time protection updates.',
        action: () => openLiveTrip?.(),
        static: false,
      };
    }
    if (expired) {
      return {
        title: 'Cover ended',
        sub: 'Your SAFE cover has ended.',
        action: onBuyCover,
        static: false,
      };
    }
    return null;
  }, [active, expired, liveTripState, onBuyCover, openLiveTrip]);

  if (loading && !bundle) {
    return (
      <main className="screen cover-flow cover-screen-board cover-flow--loading" aria-busy="true">
        <p className="cover-flow__loading">Loading cover…</p>
      </main>
    );
  }

  if (loadError && !bundle) {
    return (
      <main className="screen cover-flow cover-screen-board cover-flow--error" aria-live="assertive">
        <header className="cover-hub-topbar">
          <span className="cover-hub-topbar__spacer" />
          <h1 className="cover-hub-topbar__title">My Cover</h1>
          <span className="cover-hub-topbar__spacer" />
        </header>
        <section className="cover-flow-error-card">
          <h2>Couldn't load cover plans</h2>
          <p>Check your connection and try again.</p>
          <button type="button" className="cover-hub-btn cover-hub-btn--primary cover-hub-btn--wide" onClick={loadBundle}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  const showDetails = active && activeCover;
  const policyId = policyNumberLabel(activeCover);
  const period = formatCoverPeriod(activeCover?.startsAt, activeCover?.endsAt);
  const endsCompact = activeCover?.endsAt ? formatCoverEndsCompact(activeCover.endsAt) : null;

  return (
    <main className="screen cover-flow cover-screen cover-screen-board">
      <div className="cover-flow__scroll cover-scroll">
        {syncWarning ? (
          <p className="cover-flow-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        <header className="cover-hub-topbar">
          <span className="cover-hub-topbar__spacer" />
          <h1 className="cover-hub-topbar__title">My Cover</h1>
          <button
            type="button"
            className="cover-hub-topbar__icon-btn"
            aria-label="Help and safety"
            onClick={() => setScreen('helpSafety')}
          >
            <Headphones size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {active ? (
          <section
            className="cover-hero cover-hero--active cover-flow-hero cover-flow-hero--active"
            aria-label="Active cover"
          >
            <div className="cover-hero__wash" aria-hidden="true" />
            <img
              className="cover-hero__bus cover-flow-hero__art"
              src={busHeroCityArt}
              alt=""
              aria-hidden="true"
            />
            <div className="cover-hero__copy">
              <div className="cover-hero__pill cover-flow-pill cover-flow-pill--active">
                <ShieldCheck size={15} strokeWidth={2.5} aria-hidden="true" />
                Active cover
              </div>
              <h1 className="cover-hero__title">You're covered</h1>
              <p className="cover-hero__subtitle">Your SAFE cover is active for this trip.</p>
            </div>
            <dl className="cover-hero__stats cover-flow-hero__details">
              <div className="cover-hero__stat">
                <dt>
                  <span className="cover-hero__stat-icon" aria-hidden="true">
                    <img src={iconCoverPlan} alt="" />
                  </span>
                  <span className="cover-hero__stat-label">Plan</span>
                </dt>
                <dd>{activeCover.planName}</dd>
              </div>
              <div className="cover-hero__stat">
                <dt>
                  <span className="cover-hero__stat-icon" aria-hidden="true">
                    <Clock3 size={16} strokeWidth={2.25} />
                  </span>
                  <span className="cover-hero__stat-label">Remaining</span>
                  <span className="cover-hero__stat-qa">Time remaining</span>
                </dt>
                <dd aria-live="polite">{countdown || '—'}</dd>
              </div>
              <div className="cover-hero__stat">
                <dt>
                  <span className="cover-hero__stat-icon" aria-hidden="true">
                    <Calendar size={16} strokeWidth={2.25} />
                  </span>
                  <span className="cover-hero__stat-label">Ends</span>
                </dt>
                <dd className="cover-hero__stat-value--ends">
                  {endsCompact ? (
                    <>
                      <span>{endsCompact.line1}</span>
                      <span>{endsCompact.line2}</span>
                    </>
                  ) : (
                    formatCoverEnds(activeCover.endsAt) || '—'
                  )}
                </dd>
              </div>
            </dl>
            <div className="cover-hero__actions cover-flow-hero__actions">
              <button
                type="button"
                className="cover-hero__btn cover-hero__btn--primary"
                onClick={() => setScreen('viewPolicy')}
              >
                View policy
                <ChevronRight size={17} strokeWidth={2.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cover-hero__btn cover-hero__btn--secondary"
                onClick={() => openClaimFlow(1)}
              >
                <Shield size={15} strokeWidth={2.25} aria-hidden="true" />
                Start claim
              </button>
            </div>
            <div className="cover-hero__note">
              <ShieldCheck size={15} strokeWidth={2.5} aria-hidden="true" />
              <span>Protected for the current journey</span>
            </div>
          </section>
        ) : null}

        {pending ? (
          <section className="cover-flow-hero cover-flow-hero--pending" aria-label="Payment pending">
            <div className="cover-hub-hero__content">
              <span className="cover-flow-pill cover-flow-pill--warn">
                <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" />
                Payment pending
              </span>
              <h2 className="cover-hub-hero__title">Payment pending</h2>
              <p className="cover-hub-hero__sub">Complete payment to activate your SAFE cover.</p>
              <div className="cover-hub-hero__actions">
                <button
                  type="button"
                  className="cover-hub-btn cover-hub-btn--primary cover-hub-btn--wide"
                  onClick={() => onCheckPendingPurchase?.(pendingCover)}
                >
                  Complete payment
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <img className="cover-hero__bus cover-flow-hero__art" src={busHeroCityArt} alt="" aria-hidden="true" />
          </section>
        ) : null}

        {expired && lastEndedCover ? (
          <section className="cover-flow-hero cover-flow-hero--expired" aria-label="Cover expired">
            <div className="cover-hub-hero__content">
              <span className="cover-flow-pill cover-flow-pill--muted">Cover expired</span>
              <h2 className="cover-hub-hero__title">Cover expired</h2>
              <p className="cover-hub-hero__sub">Your last SAFE cover has ended.</p>
              <div className="cover-hub-hero__actions">
                <button type="button" className="cover-hub-btn cover-hub-btn--primary cover-hub-btn--wide" onClick={onBuyCover}>
                  Buy cover again
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <img className="cover-hero__bus cover-flow-hero__art" src={busHeroCityArt} alt="" aria-hidden="true" />
          </section>
        ) : null}

        {!active && !pending && !expired ? (
          <section className="cover-flow-start" aria-label="Get covered">
            <img className="cover-flow-start__art" src={noCoverArt} alt="" aria-hidden="true" />
            <h2 className="cover-hub-start__title">No active cover</h2>
            <p className="cover-hub-start__sub">Buy SAFE cover before your next trip.</p>
            <div className="cover-hub-start__actions">
              <button
                type="button"
                className="cover-hub-btn cover-hub-btn--primary cover-hub-btn--wide"
                onClick={onBuyCover}
              >
                Choose cover
              </button>
              <button
                type="button"
                className="cover-hub-btn cover-hub-btn--secondary cover-hub-btn--wide"
                onClick={() => setScreen('helpSafety')}
              >
                How SAFE works
              </button>
            </div>
            <p className="cover-flow-note">Cover starts only after payment is confirmed.</p>
          </section>
        ) : null}

        {showDetails ? (
          <div className="cover-details-section">
            <h2 className="cover-details__title">Cover details</h2>
            <section className="cover-details-card" aria-label="Cover details">
              {policyId ? (
                <div className="cover-detail-row cover-detail-row--policy">
                  <div className="cover-detail-row__icon">
                    <Shield size={18} aria-hidden="true" />
                  </div>
                  <span className="cover-detail-row__label">Policy number</span>
                  <div className="cover-detail-row__value-wrap">
                    <span className="cover-detail-row__value">{policyId}</span>
                    <button
                      type="button"
                      className="cover-detail-row__copy"
                      aria-label={copiedPolicy ? 'Copied' : 'Copy policy number'}
                      onClick={copyPolicy}
                    >
                      <Copy size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="cover-detail-row">
                <div className="cover-detail-row__icon">
                  <Bus size={18} aria-hidden="true" />
                </div>
                <span className="cover-detail-row__label">Vehicle</span>
                <div className="cover-detail-row__value-wrap cover-detail-row__value-wrap--stack">
                  <span className="cover-detail-row__value">
                    {vehiclePrimary(activeCover) || 'Not linked yet'}
                  </span>
                  {vehicleSecondary(activeCover) ? (
                    <span className="cover-detail-row__meta">{vehicleSecondary(activeCover)}</span>
                  ) : null}
                </div>
              </div>

              <div className="cover-detail-row cover-detail-row--passenger">
                <div className="cover-detail-row__icon">
                  <User size={18} aria-hidden="true" />
                </div>
                <span className="cover-detail-row__label">Covered</span>
                <div className="cover-detail-row__value-wrap cover-detail-row__value-wrap--stack">
                  <span className="cover-detail-row__value" title={passengerName || undefined}>
                    {formatPassengerLabel(passengerName) || 'Policyholder'}
                  </span>
                  <span className="cover-detail-row__meta">Policyholder</span>
                </div>
              </div>

              {period ? (
                <div className="cover-detail-row">
                  <div className="cover-detail-row__icon">
                    <Calendar size={18} aria-hidden="true" />
                  </div>
                  <span className="cover-detail-row__label">Cover period</span>
                  <div className="cover-detail-row__value-wrap cover-detail-row__value-wrap--stack">
                    <span className="cover-detail-row__value">{period}</span>
                  </div>
                </div>
              ) : null}

              <div className="cover-detail-row">
                <div className="cover-detail-row__icon">
                  {defaultPaymentMethod ? (
                    <PaymentBrandIcon type={defaultPaymentMethod.provider} className="cover-detail-row__brand" />
                  ) : (
                    <CreditCard size={18} aria-hidden="true" />
                  )}
                </div>
                <span className="cover-detail-row__label">Payment method</span>
                <div className="cover-detail-row__value-wrap">
                  <span className="cover-detail-row__value">
                    {defaultPaymentMethod
                      ? `${providerDisplayName(defaultPaymentMethod.provider)}${defaultPaymentMethod.maskedValue || defaultPaymentMethod.maskedPhone ? ` ${defaultPaymentMethod.maskedValue || defaultPaymentMethod.maskedPhone}` : ''}`
                      : 'Not selected'}
                  </span>
                </div>
              </div>
            </section>

            <div className="cover-benefits__head">
              <h2 className="cover-benefits__title">What's covered</h2>
              <button type="button" className="cover-benefits__link" onClick={() => setScreen('viewPolicy')}>
                View all
              </button>
            </div>
            <section className="cover-benefit-grid" aria-label="What's covered">
              {planBenefits.map((item) => (
                <article key={item.title} className="cover-benefit-card">
                  <span className="cover-benefit-card__icon">
                    <img src={item.icon} alt="" aria-hidden="true" />
                  </span>
                  <h3 className="cover-benefit-card__title">{item.title}</h3>
                  <p className="cover-benefit-card__value">{item.value}</p>
                </article>
              ))}
            </section>

            {importantNote ? (
              importantNote.static ? (
                <div className="cover-important-note cover-important-note--static" role="note">
                  <span className="cover-important-note__icon" aria-hidden="true">
                    !
                  </span>
                  <div>
                    <p className="cover-important-note__title">{importantNote.title}</p>
                    <p className="cover-important-note__sub">{importantNote.sub}</p>
                  </div>
                </div>
              ) : (
                <button type="button" className="cover-important-note" onClick={importantNote.action}>
                  <span className="cover-important-note__icon" aria-hidden="true">
                    !
                  </span>
                  <div>
                    <p className="cover-important-note__title">{importantNote.title}</p>
                    <p className="cover-important-note__sub">{importantNote.sub}</p>
                  </div>
                  <ChevronRight size={18} className="cover-important-note__chevron" aria-hidden="true" />
                </button>
              )
            ) : null}
          </div>
        ) : null}

        {pending && !active ? (
          <section className="cover-flow-banner cover-flow-banner--warn" role="status">
            <strong>Payment pending</strong>
            <p>Complete the payment request on your phone to activate cover.</p>
          </section>
        ) : null}

        {!capabilities.allowCoverStacking && active ? (
          <p className="cover-flow-note cover-flow-note--muted">
            You already have active cover. Wait until it ends, or view policy details.
          </p>
        ) : null}

        {active ? (
          <button
            type="button"
            className="cover-history-link"
            onClick={() => openHistory('active')}
          >
            Cover history
          </button>
        ) : null}
      </div>
    </main>
  );
}
