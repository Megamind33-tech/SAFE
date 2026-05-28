/**
 * Payment provider logo/mark — uses paymentAssets.ts only.
 */
import {
  getPaymentBrandAsset,
  getPaymentBrandLabel,
  resolvePaymentProviderKey,
} from '../assets/paymentAssets.ts';

/**
 * @param {{
 *   provider: string;
 *   dual?: boolean;
 *   variant?: 'svg' | 'icon';
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export default function PaymentLogo({ provider, dual = false, variant = 'svg', className = '', disabled = false }) {
  const resolved =
    dual || provider === 'visa_mastercard'
      ? 'visa_mastercard'
      : resolvePaymentProviderKey(provider) ?? 'airtel';

  const src = getPaymentBrandAsset(resolved, variant) ?? getPaymentBrandAsset(resolved, 'icon');
  const label = getPaymentBrandLabel(resolved);

  if (!src) {
    if (import.meta.env.DEV) {
      console.error(`Missing payment logo asset: ${label}`);
    }
    return null;
  }

  return (
    <span className={`payment-logo payment-logo--${resolved}${disabled ? ' payment-logo--disabled' : ''} ${className}`.trim()}>
      <img src={src} alt={label} className="payment-logo__image" draggable={false} />
    </span>
  );
}
