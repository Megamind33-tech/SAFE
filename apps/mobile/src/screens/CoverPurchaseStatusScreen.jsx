import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPurchaseStatus } from '../services/cover.js';
import { formatCoverEnds, isCoverActive } from '../services/cover.js';
import paymentPendingIcon from '../assets/pack/icons/payment-pending.svg';
import paymentSuccessIcon from '../assets/pack/icons/payment-success.svg';
import paymentFailedIcon from '../assets/pack/icons/payment-failed.svg';
import paymentProcessingArt from '../assets/real/cover_verification_clean.png';

const POLL_MS = 4000;
const POLL_TIMEOUT_MS = 90000;

function StatusHeader({ icon, title, subtitle, art }) {
  return (
    <div className="cover-flow-status-card__header">
      {art ? (
        <img className="cover-flow-status-card__art" src={art} alt="" aria-hidden="true" />
      ) : null}
      <div className="cover-flow-status-card__header-row">
        <img className="cover-flow-status-card__icon" src={icon} alt="" aria-hidden="true" />
        <div className="cover-flow-status-card__header-text">
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function CoverPurchaseStatusScreen({
  session,
  setScreen,
  purchaseId,
  initialPurchase,
  onComplete,
  onRetryPayment,
}) {
  const [purchase, setPurchase] = useState(initialPurchase?.purchase ?? null);
  const [cover, setCover] = useState(initialPurchase?.cover ?? null);
  const [message, setMessage] = useState(initialPurchase?.purchase?.message ?? '');
  const [timedOut, setTimedOut] = useState(false);
  const [checkError, setCheckError] = useState('');
  const startedAt = useRef(Date.now());

  const poll = useCallback(async () => {
    const token = session?.token;
    if (!token || !purchaseId) return;
    try {
      setCheckError('');
      const data = await fetchPurchaseStatus(token, purchaseId);
      setPurchase(data?.purchase ?? null);
      setCover(data?.cover ?? null);
      setMessage(data?.purchase?.message ?? '');
      // Stay on success screen until the user taps View cover (do not auto-navigate).
    } catch {
      setCheckError('Couldn’t confirm payment. Try checking again.');
    }
  }, [session?.token, purchaseId, onComplete]);

  useEffect(() => {
    if (!purchaseId || purchase?.status === 'not_configured') return undefined;

    if (purchase?.status === 'succeeded' || purchase?.status === 'failed') {
      return undefined;
    }

    const id = setInterval(() => {
      if (Date.now() - startedAt.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        clearInterval(id);
        return;
      }
      poll();
    }, POLL_MS);

    poll();
    return () => clearInterval(id);
  }, [purchaseId, purchase?.status, poll]);

  const status = purchase?.status ?? 'pending';

  if (status === 'not_configured') {
    return (
      <main className="screen cover-flow">
        <div className="cover-flow__scroll">
          <header className="cover-flow-header">
            <span className="cover-flow-header__spacer" />
            <h1 className="cover-flow-header__title">Payment</h1>
            <span className="cover-flow-header__spacer" />
          </header>
          <section className="cover-flow-status-card" aria-live="polite">
            <StatusHeader
              icon={paymentFailedIcon}
              title="Payment provider not connected"
              subtitle="No cover was activated. Please try again later."
            />
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--primary"
              onClick={() => setScreen('active')}
            >
              Back to cover
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (status === 'failed') {
    return (
      <main className="screen cover-flow">
        <div className="cover-flow__scroll">
          <header className="cover-flow-header">
            <span className="cover-flow-header__spacer" />
            <h1 className="cover-flow-header__title">Payment failed</h1>
            <span className="cover-flow-header__spacer" />
          </header>
          <section className="cover-flow-status-card cover-flow-status-card--error" aria-live="polite">
            <StatusHeader
              icon={paymentFailedIcon}
              title="Payment failed"
              subtitle="Your cover was not activated. Try again or choose another method."
            />
            <div className="cover-flow-status-actions">
              <button type="button" className="cover-flow-btn cover-flow-btn--primary" onClick={onRetryPayment}>
                Retry payment
              </button>
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--secondary"
                onClick={() => setScreen('coverPay')}
              >
                Change payment method
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (status === 'succeeded' && cover && isCoverActive(cover)) {
    return (
      <main className="screen cover-flow">
        <div className="cover-flow__scroll">
          <header className="cover-flow-header">
            <span className="cover-flow-header__spacer" />
            <h1 className="cover-flow-header__title">Cover activated</h1>
            <span className="cover-flow-header__spacer" />
          </header>
          <section className="cover-flow-status-card cover-flow-status-card--success" aria-live="polite">
            <StatusHeader
              icon={paymentSuccessIcon}
              title="Cover activated"
              subtitle="Your SAFE cover is now active."
            />
            <dl className="cover-flow-hero__details">
              {cover.policyId ? (
                <div>
                  <dt>Policy</dt>
                  <dd>{cover.policyId}</dd>
                </div>
              ) : null}
              <div>
                <dt>Plan</dt>
                <dd>{cover.planName}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{formatCoverEnds(cover.endsAt)}</dd>
              </div>
              {cover.paymentReference ? (
                <div>
                  <dt>Reference</dt>
                  <dd>{cover.paymentReference}</dd>
                </div>
              ) : null}
            </dl>
            <div className="cover-flow-status-actions">
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--primary"
                onClick={() => onComplete({ purchase, cover })}
              >
                View cover
              </button>
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--secondary"
                onClick={() => setScreen('active')}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="screen cover-flow">
      <div className="cover-flow__scroll">
        <header className="cover-flow-header">
          <span className="cover-flow-header__spacer" />
          <h1 className="cover-flow-header__title">Payment pending</h1>
          <span className="cover-flow-header__spacer" />
        </header>
        <section className="cover-flow-status-card" aria-live="polite">
          <StatusHeader
            icon={paymentPendingIcon}
            title="Payment pending"
            subtitle={message || 'Complete the payment request on your phone to activate cover.'}
            art={paymentProcessingArt}
          />
          {timedOut ? (
            <p className="cover-flow-note">
              We couldn’t confirm your payment yet. If money was deducted from your account, don’t worry — your cover will activate automatically once we receive confirmation. Tap "Check status" to try again or contact support if the issue persists.
            </p>
          ) : null}
          {checkError ? (
            <p className="cover-flow-inline-error" role="alert">
              {checkError}
            </p>
          ) : null}
          <div className="cover-flow-status-actions">
            <button type="button" className="cover-flow-btn cover-flow-btn--primary" onClick={poll}>
              Check status
            </button>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--secondary"
              onClick={() => setScreen('coverPay')}
            >
              Change payment method
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
