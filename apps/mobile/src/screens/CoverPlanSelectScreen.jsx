import { useEffect, useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import {
  fetchCoverPlans,
  formatDurationLabel,
  formatPrice,
  readCachedCoverScreen,
} from '../services/cover.js';

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
  const [loading, setLoading] = useState(() => !cached?.plans?.length);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = session?.token;
    if (!token) return;
    if (cached?.plans?.length) {
      setPlans(cached.plans);
      setLoading(false);
      return;
    }
    fetchCoverPlans(token)
      .then((res) => {
        setPlans(res.plans ?? []);
        setError('');
      })
      .catch(() => setError('Couldn’t load cover plans'))
      .finally(() => setLoading(false));
  }, [session?.token, cached?.plans?.length]);

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

        {loading ? <p className="cover-flow__loading">Loading plans…</p> : null}
        {error ? (
          <section className="cover-flow-error-card" aria-live="assertive">
            <h2>{error}</h2>
            <p>Check your connection and try again.</p>
          </section>
        ) : null}

        {!loading && !error && availablePlans.length === 0 ? (
          <section className="cover-flow-empty-card">
            <h2>No cover plans available</h2>
            <p>Please try again later.</p>
          </section>
        ) : null}

        {!loading && !error && availablePlans.length > 0 ? (
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

        {availablePlans.length > 0 ? (
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
