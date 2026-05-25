import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Lock, Plus, RefreshCcw, X } from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import PaymentBrandIcon from '../components/PaymentBrandIcon.jsx';
import {
  addMobileMoneyMethod,
  findExistingMobileMoneyMethod,
  getPaymentMethods,
  providerSubtitle,
  setDefaultPaymentMethod,
  toCheckoutPaymentId,
  validateProviderPhone,
} from '../services/paymentMethods.js';

const ADD_OPTIONS = [
  {
    provider: 'airtel',
    title: 'Airtel Money',
    subtitle: 'Pay with Airtel Money',
  },
  {
    provider: 'mtn',
    title: 'MTN Mobile Money',
    subtitle: 'Pay with MTN MoMo',
  },
  {
    provider: 'visa_mastercard',
    title: 'Visa / Mastercard',
    subtitle: 'Card payment',
    comingSoon: true,
  },
];

function LoadingSkeleton() {
  return (
    <section className="payment-methods-skeleton" aria-live="polite" aria-busy="true">
      {[0, 1].map((item) => (
        <div className="payment-methods-skeleton__row" key={item}>
          <span className="payment-methods-skeleton__icon" />
          <span className="payment-methods-skeleton__lines">
            <span className="payment-methods-skeleton__line payment-methods-skeleton__line--title" />
            <span className="payment-methods-skeleton__line payment-methods-skeleton__line--subtitle" />
          </span>
        </div>
      ))}
    </section>
  );
}

export default function PaymentMethodsScreen({
  session,
  setScreen,
  setPaymentMethod,
}) {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState('choose');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [duplicateMethodId, setDuplicateMethodId] = useState(null);
  const [saving, setSaving] = useState(false);

  const token = session?.token || '';

  const loadMethods = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const next = await getPaymentMethods(token);
      setMethods(next);
      const defaultMethod = next.find((method) => method.isDefault);
      if (defaultMethod) {
        setPaymentMethod?.(toCheckoutPaymentId(defaultMethod.provider));
      }
    } catch {
      setError('Could not load payment methods.');
    } finally {
      setLoading(false);
    }
  }, [token, setPaymentMethod]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const handleBack = () => {
    setScreen?.('profile');
  };

  const openAddSheet = () => {
    setSheetStep('choose');
    setSelectedProvider(null);
    setPhoneInput('');
    setPhoneError('');
    setSaveError('');
    setSaveNotice('');
    setDuplicateMethodId(null);
    setSheetOpen(true);
  };

  const closeAddSheet = () => {
    if (saving) return;
    setSheetOpen(false);
  };

  const handleSelectProvider = (provider) => {
    if (provider === 'visa_mastercard') return;
    setSelectedProvider(provider);
    setPhoneError('');
    setSaveError('');
    setSaveNotice('');
    setDuplicateMethodId(null);
    setSheetStep('mobile-money');
  };

  const handleSaveMobileMoney = async () => {
    const validation = validateProviderPhone(selectedProvider, phoneInput);
    if (!validation.valid) {
      setPhoneError(validation.message);
      setSaveError('');
      setSaveNotice('');
      setDuplicateMethodId(null);
      return;
    }

    setPhoneError('');
    setSaveError('');

    const existingMethod =
      duplicateMethodId != null
        ? methods.find((method) => method.id === duplicateMethodId)
        : findExistingMobileMoneyMethod(methods, selectedProvider, validation.normalized);

    if (existingMethod) {
      if (!duplicateMethodId) {
        setDuplicateMethodId(existingMethod.id);
        setSaveNotice(
          'This number is already saved. You can set it as your default payment method.'
        );
        return;
      }

      setSaving(true);
      try {
        const updated = await setDefaultPaymentMethod(token, existingMethod.id);
        setMethods(updated);
        const defaultMethod = updated.find((method) => method.isDefault);
        if (defaultMethod) {
          setPaymentMethod?.(toCheckoutPaymentId(defaultMethod.provider));
        }
        setSheetOpen(false);
      } catch {
        setSaveError('Could not update default payment method.');
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaveNotice('');
    setDuplicateMethodId(null);
    setSaving(true);
    try {
      await addMobileMoneyMethod(token, selectedProvider, phoneInput);
      await loadMethods();
      setSheetOpen(false);
    } catch (err) {
      const message = err?.message || 'Could not save payment method.';
      if (/already saved|mobile money number is already/i.test(message)) {
        const refreshed = await getPaymentMethods(token);
        setMethods(refreshed);
        const duplicate = findExistingMobileMoneyMethod(
          refreshed,
          selectedProvider,
          validation.normalized
        );
        if (duplicate) {
          setDuplicateMethodId(duplicate.id);
          setSaveNotice(
            'This number is already saved. You can set it as your default payment method.'
          );
          return;
        }
      }
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (methodId) => {
    if (busyId) return;
    setBusyId(methodId);
    try {
      const updated = await setDefaultPaymentMethod(token, methodId);
      setMethods(updated);
      const defaultMethod = updated.find((method) => method.isDefault);
      if (defaultMethod) {
        setPaymentMethod?.(toCheckoutPaymentId(defaultMethod.provider));
      }
    } catch {
      setError('Could not update default payment method.');
    } finally {
      setBusyId('');
    }
  };

  const showHeaderActions = !loading && !error;

  return (
    <main className="screen payment-methods-screen payment-methods-screen-board">
      <div className="payment-methods-scroll">
        <header className="payment-methods-header">
          <button
            type="button"
            className="payment-methods-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="payment-methods-header__title">Payment methods</h1>
          {showHeaderActions ? (
            <button
              type="button"
              className="payment-methods-header__action"
              aria-label="Add payment method"
              onClick={openAddSheet}
            >
              <Plus size={22} strokeWidth={2.25} color="#101820" />
            </button>
          ) : (
            <span className="payment-methods-header__spacer" aria-hidden="true" />
          )}
        </header>

        <section className="payment-methods-title-area">
          <h2 className="payment-methods-title-area__heading">How you pay</h2>
          <p className="payment-methods-title-area__subtitle">
            Choose your default method for SAFE cover payments.
          </p>
        </section>

        {loading ? <LoadingSkeleton /> : null}

        {!loading && error ? (
          <section className="payment-methods-error" aria-live="polite">
            <h3 className="payment-methods-error__title">Couldn&apos;t load payment methods</h3>
            <p className="payment-methods-error__subtitle">Check your connection and try again.</p>
            <button type="button" className="payment-methods-error__retry" onClick={loadMethods}>
              <RefreshCcw size={18} strokeWidth={2.25} />
              Retry
            </button>
          </section>
        ) : null}

        {!loading && !error && methods.length === 0 ? (
          <section className="payment-methods-empty" aria-label="No payment methods">
            <h3 className="payment-methods-empty__title">No payment method added</h3>
            <p className="payment-methods-empty__subtitle">
              Add Airtel Money, MTN Mobile Money, or a card to pay for cover faster.
            </p>
            <button type="button" className="payment-methods-empty__cta" onClick={openAddSheet}>
              Add payment method
            </button>
          </section>
        ) : null}

        {!loading && !error && methods.length > 0 ? (
          <section className="payment-methods-list" aria-label="Saved payment methods">
            {methods.map((method) => {
              const isDefault = method.isDefault;
              const isBusy = busyId === method.id;
              const iconType = method.provider === 'visa' ? 'visa' : method.provider === 'mastercard' ? 'mastercard' : method.provider;

              const subtitle = method.maskedValue || providerSubtitle(method.provider);

              return (
                <article
                  key={method.id}
                  className={`payment-method-card${isDefault ? ' payment-method-card--default' : ''}${method.provider === 'visa_mastercard' ? ' payment-method-card--coming-soon' : ''}`}
                >
                  <div className="payment-method-card__main">
                    {method.provider === 'visa_mastercard' ? (
                      <PaymentBrandIcon type="visa_mastercard" dual disabled className="payment-brand-icon--in-list" />
                    ) : (
                      <PaymentBrandIcon
                        type={iconType}
                        disabled={method.provider === 'visa_mastercard'}
                        className={isDefault ? 'payment-brand-icon--in-saved' : 'payment-brand-icon--in-list'}
                      />
                    )}
                    <div className="payment-method-card__body">
                      <strong className="payment-method-card__title">{method.displayName}</strong>
                      <span className="payment-method-card__subtitle">{subtitle}</span>
                    </div>
                  </div>
                  {method.provider === 'visa_mastercard' ? (
                    <span className="payment-method-card__pill payment-method-card__pill--coming-soon">
                      Coming soon
                    </span>
                  ) : isDefault ? (
                    <div className="payment-method-card__default-row">
                      <span className="payment-method-card__pill payment-method-card__pill--default">Default</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="payment-method-card__pill"
                      disabled={isBusy}
                      onClick={() => handleSetDefault(method.id)}
                    >
                      {isBusy ? 'Saving…' : 'Use'}
                    </button>
                  )}
                </article>
              );
            })}
          </section>
        ) : null}

        {!loading && !error ? (
          <section className="payment-methods-security" aria-label="Security note">
            <Lock size={16} strokeWidth={2.25} color="#008748" className="payment-methods-security__icon" />
            <p>
              <strong>SAFE never stores your full card details or mobile money PIN.</strong>
            </p>
          </section>
        ) : null}

        <BottomScrollSpacer height={180} />
      </div>

      {sheetOpen ? (
        <div className="payment-methods-sheet-overlay" role="presentation" onClick={closeAddSheet}>
          <div
            className="payment-methods-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-methods-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="payment-methods-sheet__handle" aria-hidden="true" />
            <div className="payment-methods-sheet__header">
              <h2 id="payment-methods-sheet-title" className="payment-methods-sheet__title">
                Add payment method
              </h2>
              <button
                type="button"
                className="payment-methods-sheet__close"
                aria-label="Close"
                onClick={closeAddSheet}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            {sheetStep === 'choose' ? (
              <div className="payment-methods-sheet__options">
                {ADD_OPTIONS.map((option) =>
                  option.comingSoon ? (
                    <div
                      key={option.provider}
                      className="payment-methods-sheet__option payment-methods-sheet__option--cards payment-methods-sheet__option--disabled"
                      aria-disabled="true"
                    >
                      <div className="payment-methods-sheet__option-row">
                        <PaymentBrandIcon
                          type={option.provider}
                          dual
                          disabled
                          className="payment-brand-icon--in-sheet-dual"
                        />
                        <span className="payment-methods-sheet__option-text">
                          <strong className="payment-methods-sheet__option-title payment-methods-sheet__option-title--cards">
                            <span>Visa /</span>
                            <span>Mastercard</span>
                          </strong>
                          <small>{option.subtitle}</small>
                        </span>
                      </div>
                      <div className="payment-methods-sheet__option-footer">
                        <span className="payment-methods-sheet__coming-soon">Coming soon</span>
                      </div>
                    </div>
                  ) : (
                    <button
                      key={option.provider}
                      type="button"
                      className="payment-methods-sheet__option"
                      onClick={() => handleSelectProvider(option.provider)}
                    >
                      <PaymentBrandIcon type={option.provider} className="payment-brand-icon--in-sheet" />
                      <span className="payment-methods-sheet__option-text">
                        <strong>{option.title}</strong>
                        <small>{option.subtitle}</small>
                      </span>
                    </button>
                  )
                )}
              </div>
            ) : null}

            {sheetStep === 'mobile-money' ? (
              <div className="payment-methods-sheet__form">
                <label className="payment-methods-sheet__label" htmlFor="mobile-money-phone">
                  Mobile money phone number
                </label>
                <input
                  id="mobile-money-phone"
                  className="payment-methods-sheet__input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+260XXXXXXXXX or 09XXXXXXXX"
                  value={phoneInput}
                  onChange={(event) => {
                    setPhoneInput(event.target.value);
                    setPhoneError('');
                    setSaveError('');
                    setSaveNotice('');
                    setDuplicateMethodId(null);
                  }}
                />
                {phoneError ? <p className="payment-methods-sheet__field-error">{phoneError}</p> : null}
                {saveNotice ? <p className="payment-methods-sheet__field-notice">{saveNotice}</p> : null}
                {saveError ? <p className="payment-methods-sheet__field-error">{saveError}</p> : null}
                <button
                  type="button"
                  className="payment-methods-sheet__save"
                  disabled={saving}
                  onClick={handleSaveMobileMoney}
                >
                  {saving ? 'Saving…' : duplicateMethodId ? 'Use saved method' : 'Save method'}
                </button>
                <button
                  type="button"
                  className="payment-methods-sheet__back-link"
                  onClick={() => setSheetStep('choose')}
                >
                  Choose another method
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
