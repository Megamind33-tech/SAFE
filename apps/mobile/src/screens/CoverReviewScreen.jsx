import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import routeStripArt from '../assets/real/route_strip_bus_clean.png';
import coverVerificationArt from '../assets/real/cover_verification_clean.png';
import {
  estimateEndsAt,
  formatDurationLabel,
  formatPrice,
} from '../services/cover.js';
import {
  getPaymentMethods,
  providerDisplayName,
} from '../services/paymentMethods.js';
import { loadToken } from '../api/safeApi.js';


export default function CoverReviewScreen({
  session,
  setScreen,
  selectedPlan,
  paymentMethod,
  scannedVehicle,
  onPaymentMethodResolved,
  onContinue,
  onChangePlan,
}) {
  const [resolving, setResolving] = useState(true);
  const onResolvedRef = useRef(onPaymentMethodResolved);
  onResolvedRef.current = onPaymentMethodResolved;

  useEffect(() => {
    const token = session?.token?.trim() ? session.token : loadToken();
    if (!token) {
      setResolving(false);
      return;
    }
    if (paymentMethod) {
      setResolving(false);
      return;
    }
    getPaymentMethods(token)
      .then((methods) => {
        const active = methods.filter((m) => m.status === 'active' || !m.status);
        const def = active.find((m) => m.isDefault) ?? active[0] ?? null;
        if (def) onResolvedRef.current?.(def);
      })
      .catch(() => {
        /* review still usable; user can choose payment method */
      })
      .finally(() => setResolving(false));
  }, [session?.token, paymentMethod]);

  if (!selectedPlan) {
    return (
      <main className="screen cover-flow">
        <p className="cover-flow__loading">No plan selected.</p>
      </main>
    );
  }

  const hasPaymentMethod = Boolean(paymentMethod?.id);
  const routeLabel =
    scannedVehicle?.route?.origin && scannedVehicle?.route?.destination
      ? `${scannedVehicle.route.origin} → ${scannedVehicle.route.destination}`
      : null;

  return (
    <main className="screen cover-flow">
      <div className="cover-flow__scroll">
        <header className="cover-flow-header">
          <button type="button" className="cover-flow-header__back" onClick={onChangePlan}>
            Back
          </button>
          <h1 className="cover-flow-header__title">Review cover</h1>
          <span className="cover-flow-header__spacer" />
        </header>

        <section className="cover-flow-review-card" aria-label="Review purchase">
          <img className="cover-flow-review-card__shield" src={coverVerificationArt} alt="" aria-hidden="true" />
          <img className="cover-flow-review-strip" src={routeStripArt} alt="" aria-hidden="true" />
          <h2 className="cover-flow-review-card__plan">{selectedPlan.name}</h2>
          <p className="cover-flow-review-card__price">{formatPrice(selectedPlan)}</p>
          {scannedVehicle?.vehicle?.plateNumber || routeLabel ? (
            <p className="cover-flow-review-card__trip">
              {scannedVehicle?.vehicle?.plateNumber ? `Vehicle ${scannedVehicle.vehicle.plateNumber}` : 'Vehicle selected'}
              {routeLabel ? ` · ${routeLabel}` : ''}
            </p>
          ) : null}
          <dl className="cover-flow-review-card__rows">
            <div>
              <dt>Duration</dt>
              <dd>{formatDurationLabel(selectedPlan.durationMinutes)}</dd>
            </div>
            <div>
              <dt>Starts</dt>
              <dd>After successful payment</dd>
            </div>
            <div>
              <dt>Ends (estimate)</dt>
              <dd>{estimateEndsAt(selectedPlan.durationMinutes)}</dd>
            </div>
            <div>
              <dt>Payment method</dt>
              <dd>
                {resolving ? (
                  'Loading…'
                ) : hasPaymentMethod ? (
                  providerDisplayName(paymentMethod.provider)
                ) : (
                  <span className="cover-flow-review-card__payment-missing">Payment method required</span>
                )}
              </dd>
            </div>
          </dl>
          <ul className="cover-flow-review-card__benefits">
            {(selectedPlan.benefits ?? []).map((b) => (
              <li key={b}>
                <Check size={14} aria-hidden="true" />
                {b}
              </li>
            ))}
          </ul>
          <p className="cover-flow-note">Cover starts only after payment is confirmed.</p>
        </section>

        {hasPaymentMethod ? (
          <button
            type="button"
            className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
            disabled={resolving}
            onClick={onContinue}
          >
            Continue to payment
          </button>
        ) : (
          <button
            type="button"
            className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
            disabled={resolving}
            onClick={() => setScreen('coverPay')}
          >
            Choose payment method
          </button>
        )}
        <button type="button" className="cover-flow-btn cover-flow-btn--text" onClick={onChangePlan}>
          Change plan
        </button>
      </div>
    </main>
  );
}
