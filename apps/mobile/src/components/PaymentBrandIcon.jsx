/**
 * Official payment brand artwork for Payment Methods.
 *
 * Uses real assets from `assets/payment/` when present. When assets are missing,
 * DEV_FALLBACK_PAYMENT_ICON enables a neutral placeholder — never a fake brand mark.
 */
import {
  DEV_FALLBACK_PAYMENT_ICON,
  getMissingPaymentBrandAssets,
  getPaymentBrandAsset,
} from '../utils/paymentBrandAssets.js';

/** @typedef {'airtel' | 'mtn' | 'visa_mastercard'} PaymentBrandProvider */

/**
 * @param {{ provider: PaymentBrandProvider, className?: string, label?: string }} props
 */
export default function PaymentBrandIcon({ provider, className = '', label = '' }) {
  const src = getPaymentBrandAsset(provider);
  const showDevFallback = DEV_FALLBACK_PAYMENT_ICON && !src;

  const ariaLabel =
    label ||
    (provider === 'airtel'
      ? 'Airtel Money'
      : provider === 'mtn'
        ? 'MTN Mobile Money'
        : 'Visa Mastercard');

  return (
    <span
      className={`payment-brand-icon payment-brand-icon--${provider}${showDevFallback ? ' payment-brand-icon--dev-fallback' : ''} ${className}`.trim()}
      aria-hidden={!showDevFallback}
      aria-label={showDevFallback ? undefined : ariaLabel}
      title={showDevFallback ? `Dev fallback — ${getMissingPaymentBrandAssets().join(', ')}` : undefined}
    >
      {src ? (
        <img
          src={src}
          alt={ariaLabel}
          className="payment-brand-icon__image"
          draggable={false}
        />
      ) : showDevFallback ? (
        <span className="payment-brand-icon__fallback" aria-hidden="true">
          <span className="payment-brand-icon__fallback-mark" />
        </span>
      ) : null}
    </span>
  );
}

export { DEV_FALLBACK_PAYMENT_ICON, getMissingPaymentBrandAssets };
