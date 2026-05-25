/**
 * Renders official SAFE payment brand artwork from assets/payment-methods/.
 */
import {
  getMissingPaymentBrandAssets,
  getPaymentBrandAsset,
  toPaymentBrandType,
} from '../utils/paymentBrandAssets.js';

/**
 * @param {{
 *   type: string;
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

  if (!src) {
    if (import.meta.env.DEV) {
      console.error(`Missing payment brand asset: ${label}. Expected paths in paymentBrandAssets.js`);
    }
    return null;
  }

  return (
    <span
      className={`payment-brand-icon payment-brand-icon--${brandType}${disabled ? ' payment-brand-icon--disabled' : ''} ${className}`.trim()}
    >
      <img src={src} alt={label} className="payment-brand-icon__image" draggable={false} />
    </span>
  );
}

export { getMissingPaymentBrandAssets, toPaymentBrandType };
