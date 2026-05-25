/**
 * Renders official payment brand artwork from assets/payment/.
 */
import {
  getMissingPaymentBrandAssets,
  getPaymentBrandAsset,
  toPaymentBrandType,
} from '../utils/paymentBrandAssets.js';

/** @typedef {'airtel_money' | 'mtn_mobile_money' | 'card'} PaymentBrandType */

/**
 * @param {{
 *   type: PaymentBrandType | string;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export default function PaymentBrandIcon({ type, className = '', disabled = false }) {
  const brandType = toPaymentBrandType(type);
  const src = getPaymentBrandAsset(brandType);

  const label =
    brandType === 'airtel_money'
      ? 'Airtel Money'
      : brandType === 'mtn_mobile_money'
        ? 'MTN Mobile Money'
        : 'Visa Mastercard';

  if (!src && import.meta.env.DEV) {
    console.warn(`Missing payment brand asset: ${label}`);
  }

  return (
    <span
      className={`payment-brand-icon payment-brand-icon--${brandType}${disabled ? ' payment-brand-icon--disabled' : ''} ${className}`.trim()}
    >
      {src ? (
        <img src={src} alt={label} className="payment-brand-icon__image" draggable={false} />
      ) : import.meta.env.DEV ? (
        <span className="payment-brand-icon__missing">Missing asset</span>
      ) : null}
    </span>
  );
}

export { getMissingPaymentBrandAssets, toPaymentBrandType };
