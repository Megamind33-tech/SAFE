import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import PaymentBrandIcon from '../components/PaymentBrandIcon.jsx';
import {
  getPaymentMethods,
  providerDisplayName,
  readCachedPaymentMethods,
} from '../services/paymentMethods.js';
import { formatPrice, purchaseCover } from '../services/cover.js';
import { loadToken } from '../api/safeApi.js';


export default function CoverPaymentScreen({
  session,
  setScreen,
  selectedPlan,
  selectedPaymentMethodId,
  onSelectPaymentMethod,
  onPurchaseStarted,
  scannedVehicle,
  capabilities,
}) {
  const [methods, setMethods] = useState(() => readCachedPaymentMethods());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onSelectRef = useRef(onSelectPaymentMethod);
  onSelectRef.current = onSelectPaymentMethod;

  useEffect(() => {
    const token = session?.token?.trim() ? session.token : loadToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getPaymentMethods(token)
      .then((list) => {
        const active = list.filter((m) => m.status === 'active' || !m.status);
        const withoutCard = capabilities?.cardPaymentsEnabled
          ? active
          : active.filter((m) => m.type !== 'card');
        setMethods(withoutCard);
        if (!selectedPaymentMethodId && withoutCard.length) {
          const def = withoutCard.find((m) => m.isDefault) ?? withoutCard[0];
          onSelectRef.current?.(def);
        }
      })
      .catch((e) => setError(e?.message || 'Could not load payment methods.'))
      .finally(() => setLoading(false));
  }, [session?.token, capabilities?.cardPaymentsEnabled, selectedPaymentMethodId]);

  const selected = methods.find((m) => m.id === selectedPaymentMethodId);

  const startPurchase = async () => {
    const purchaseToken = session?.token?.trim() ? session.token : loadToken();
    if (!purchaseToken || !selectedPlan || !selectedPaymentMethodId) return;
    setBusy(true);
    setError('');
    try {
      const result = await purchaseCover(purchaseToken, {
        planId: selectedPlan.id,
        paymentMethodId: selectedPaymentMethodId,
        vehicleId: scannedVehicle?.vehicle?.id,
        routeId: scannedVehicle?.route?.id,
        qrCodeId: scannedVehicle?.qrCodeId,
        startMode: 'after_payment_confirmation',
      });
      onPurchaseStarted(result);
    } catch (e) {
      setError(e?.message || 'Couldn’t start purchase');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen cover-flow">
      <div className="cover-flow__scroll">
        <header className="cover-flow-header">
          <button type="button" className="cover-flow-header__back" onClick={() => setScreen('coverReview')}>
            Back
          </button>
          <h1 className="cover-flow-header__title">Payment</h1>
          <span className="cover-flow-header__spacer" />
        </header>

        <section className="cover-flow-review-card cover-flow-review-card--compact">
          <p className="cover-flow-review-card__plan">{selectedPlan?.name}</p>
          <p className="cover-flow-review-card__price">{formatPrice(selectedPlan)}</p>
        </section>

        <h2 className="cover-flow-section-title">Payment method</h2>

        {loading ? <p className="cover-flow__loading">Loading payment methods…</p> : null}

        {!loading && methods.length === 0 ? (
          <section className="cover-flow-empty-card">
            <p>Add a payment method to continue.</p>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--primary"
              onClick={() => setScreen('profilePayments')}
            >
              Add payment method
            </button>
          </section>
        ) : null}

        {methods.length > 0 ? (
          <div className="cover-flow-method-list">
            {methods.map((method) => {
              const isSelected = method.id === selectedPaymentMethodId;
              return (
                <button
                  key={method.id}
                  type="button"
                  className={`cover-flow-method-card${isSelected ? ' cover-flow-method-card--selected' : ''}`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectPaymentMethod(method)}
                >
                  <PaymentBrandIcon
                    type={method.provider === 'visa' || method.provider === 'mastercard' ? method.provider : method.provider}
                    className="cover-flow-method-card__icon"
                  />
                  <span className="cover-flow-method-card__body">
                    <strong>{providerDisplayName(method.provider)}</strong>
                    <small>{method.maskedPhone || method.maskedValue || method.subtitle}</small>
                  </span>
                  <span className="cover-flow-method-card__radio" aria-hidden="true">
                    {isSelected ? <Check size={16} /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p className="cover-flow-inline-error" role="alert" aria-live="assertive">
            {error}
          </p>
        ) : null}

        {methods.length > 0 ? (
          <button
            type="button"
            className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
            disabled={busy || !selectedPaymentMethodId}
            onClick={startPurchase}
          >
            {busy ? 'Starting purchase…' : 'Confirm purchase'}
          </button>
        ) : null}

        <p className="cover-flow-note">
          Approve the payment request on your phone. SAFE never asks for your PIN in the app.
        </p>
      </div>
    </main>
  );
}
