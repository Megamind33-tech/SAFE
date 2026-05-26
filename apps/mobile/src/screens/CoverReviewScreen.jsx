import { Check } from 'lucide-react';
import {
  estimateEndsAt,
  formatDurationLabel,
  formatPrice,
} from '../services/cover.js';
import { providerDisplayName } from '../services/paymentMethods.js';

export default function CoverReviewScreen({
  setScreen,
  selectedPlan,
  paymentMethod,
  onContinue,
  onChangePlan,
}) {
  if (!selectedPlan) {
    return (
      <main className="screen cover-flow">
        <p className="cover-flow__loading">No plan selected.</p>
      </main>
    );
  }

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
          <h2 className="cover-flow-review-card__plan">{selectedPlan.name}</h2>
          <p className="cover-flow-review-card__price">{formatPrice(selectedPlan)}</p>
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
                {paymentMethod
                  ? providerDisplayName(paymentMethod.provider)
                  : 'Not selected'}
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

        <button
          type="button"
          className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
          disabled={!paymentMethod}
          onClick={onContinue}
        >
          Continue to payment
        </button>
        <button type="button" className="cover-flow-btn cover-flow-btn--text" onClick={onChangePlan}>
          Change plan
        </button>
      </div>
    </main>
  );
}
