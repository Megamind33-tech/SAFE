import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPurchaseStatus } from '../services/cover.js';
import { formatCoverEnds, isCoverActive } from '../services/cover.js';

const POLL_MS = 4000;
const POLL_TIMEOUT_MS = 90000;

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
      if (data?.purchase?.status === 'succeeded' && data?.cover && isCoverActive(data.cover)) {
        onComplete(data);
      }
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
            <h2>Payment provider is not connected yet.</h2>
            <p>No cover was activated.</p>
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
            <h2>Payment failed</h2>
            <p>Your cover was not activated. Try another payment method or retry.</p>
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
            <h2>Cover activated</h2>
            <p>Your SAFE cover is now active.</p>
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
          <h2>Payment pending</h2>
          <p>{message || 'Complete the payment request on your phone to activate cover.'}</p>
          {timedOut ? (
            <p className="cover-flow-note">
              We couldn’t confirm payment yet. Check again in a moment.
            </p>
          ) : null}
          {checkError ? (
            <p className="cover-flow-inline-error" role="alert">
              {checkError}
            </p>
          ) : null}
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
        </section>
      </div>
    </main>
  );
}
