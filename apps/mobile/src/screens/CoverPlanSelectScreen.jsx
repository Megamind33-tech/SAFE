import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import {
  fetchCoverPlans,
  formatDurationLabel,
  formatPrice,
  readCachedCoverScreen,
} from '../services/cover.js';

const DEV_FALLBACK_PLANS = [
  {
    id: 'dev-basic',
    name: 'Basic Trip Cover (Dev Fallback)',
    price: 3,
    currency: 'ZMW',
    durationMinutes: 240,
    benefits: ['Up to K3,000 emergency payout', 'Valid for one trip window', 'Dev testing fallback'],
    isPopular: false,
    isAvailable: true,
  },
  {
    id: 'dev-plus',
    name: 'Plus Trip Cover (Dev Fallback)',
    price: 5,
    currency: 'ZMW',
    durationMinutes: 240,
    benefits: ['Up to K5,000 emergency payout', 'Accident and disability support', 'Dev testing fallback'],
    isPopular: true,
    isAvailable: true,
  },
  {
    id: 'dev-daily',
    name: 'Daily Cover (Dev Fallback)',
    price: 12,
    currency: 'ZMW',
    durationMinutes: 1440,
    benefits: ['Covers trips through the day', 'Up to K5,000 payout tier', 'Dev testing fallback'],
    isPopular: false,
    isAvailable: true,
  }
];

export default function CoverPlanSelectScreen({
  session,
  setScreen,
  selectedPlanId,
  onSelectPlan,
  onContinue,
  scannedVehicle,
}) {
  const cached = readCachedCoverScreen();
  const [plans, setPlans] = useState(cached?.plans ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUsingDevFallback, setIsUsingDevFallback] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    const token = session?.token;
    
    if (!session?.ready) {
      setLoading(true);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    if (!plans || plans.length === 0) {
      setLoading(true);
    }
    setError('');
    setIsUsingDevFallback(false);

    let active = true;
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('timeout'));
      }, 7000);
    });

    Promise.race([
      fetchCoverPlans(token),
      timeoutPromise
    ])
      .then((res) => {
        if (!active) return;
        setPlans(res.plans ?? []);
        setError('');
      })
      .catch((err) => {
        if (!active) return;
        
        let friendlyError = 'We couldn’t load the cover plans. Please check your connection and try again.';
        if (err?.message === 'timeout') {
          friendlyError = 'Connection timed out. The server took too long to respond. Please try again.';
        }

        if (import.meta.env.DEV) {
          setPlans(DEV_FALLBACK_PLANS);
          setIsUsingDevFallback(true);
          setError('');
        } else {
          setError(friendlyError);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [session?.token, session?.ready, retryTrigger]);

  const waitingForSession = !session?.ready;
  const notAuthenticated = session?.ready && !session?.token;

  const availablePlans = plans.filter((p) => p.isAvailable);

  return (
    <main className="screen cover-flow">
      <div className="cover-flow__scroll">
        <header className="cover-flow-header">
          <button type="button" className="cover-flow-header__back" onClick={() => setScreen('active')}>
            Back
          </button>
          <h1 className="cover-flow-header__title">Cover</h1>
          <span className="cover-flow-header__spacer" />
        </header>

        <section className="cover-flow-intro">
          <h2 className="cover-flow-intro__title">Choose your SAFE cover</h2>
          <p className="cover-flow-intro__sub">
            Buy cover before your trip and keep your policy details ready.
          </p>
          {scannedVehicle?.vehicle?.plateNumber ? (
            <p className="cover-flow-vehicle-chip">
              Vehicle: {scannedVehicle.vehicle.plateNumber}
              {scannedVehicle.route
                ? ` · ${scannedVehicle.route.origin} → ${scannedVehicle.route.destination}`
                : ''}
            </p>
          ) : null}
        </section>

        {waitingForSession ? (
          <div className="cover-flow__loading-container" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p className="cover-flow__loading">Connecting to SAFE...</p>
          </div>
        ) : null}

        {notAuthenticated ? (
          <section className="cover-flow-empty-card">
            <h2>Log in to buy cover</h2>
            <p>You need to be logged in to view and purchase SAFE cover plans.</p>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
              onClick={() => setScreen('login')}
            >
              Log In
            </button>
          </section>
        ) : null}

        {!waitingForSession && !notAuthenticated && loading ? (
          <p className="cover-flow__loading">Loading plans…</p>
        ) : null}

        {!waitingForSession && !notAuthenticated && error ? (
          <section className="cover-flow-error-card" aria-live="assertive">
            <h2>{error}</h2>
            <p>Check your connection and try again.</p>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--secondary cover-flow-btn--wide"
              style={{ marginTop: '16px' }}
              onClick={() => setRetryTrigger((prev) => prev + 1)}
            >
              Try Again
            </button>
          </section>
        ) : null}

        {!waitingForSession && !notAuthenticated && import.meta.env.DEV && isUsingDevFallback ? (
          <div className="cover-flow-sync-warning" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#b91c1c' }}>
            ⚠️ Dev Fallback: Server offline or unreachable. Displaying local test plans.
          </div>
        ) : null}

        {!waitingForSession && !notAuthenticated && !loading && !error && availablePlans.length === 0 ? (
          <section className="cover-flow-empty-card">
            <h2>No cover plans available</h2>
            <p>Please try again later.</p>
          </section>
        ) : null}

        {!waitingForSession && !notAuthenticated && !loading && !error && availablePlans.length > 0 ? (
          <div className="cover-flow-plan-list" role="list">
            {availablePlans.map((plan) => {
              const selected = selectedPlanId === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="listitem"
                  className={`cover-flow-plan-card${selected ? ' cover-flow-plan-card--selected' : ''}${
                    !plan.isAvailable ? ' cover-flow-plan-card--disabled' : ''
                  }`}
                  aria-pressed={selected}
                  disabled={!plan.isAvailable}
                  onClick={() => onSelectPlan(plan)}
                >
                  <span className="cover-flow-plan-card__head">
                    <strong className="cover-flow-plan-card__name">{plan.name}</strong>
                    {plan.isPopular ? (
                      <span className="cover-flow-plan-card__badge">Popular</span>
                    ) : null}
                  </span>
                  <span className="cover-flow-plan-card__price">{formatPrice(plan)}</span>
                  <span className="cover-flow-plan-card__duration">
                    {formatDurationLabel(plan.durationMinutes)}
                  </span>
                  <ul className="cover-flow-plan-card__benefits">
                    {(plan.benefits ?? []).slice(0, 3).map((b) => (
                      <li key={b}>
                        <Check size={14} aria-hidden="true" />
                        {b}
                      </li>
                    ))}
                  </ul>
                  <span className="cover-flow-plan-card__chevron" aria-hidden="true">
                    {selected ? <Check size={18} /> : <ChevronRight size={18} />}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {!waitingForSession && !notAuthenticated && availablePlans.length > 0 ? (
          <button
            type="button"
            className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
            disabled={!selectedPlanId}
            onClick={onContinue}
          >
            Continue
          </button>
        ) : null}
      </div>
    </main>
  );
}
