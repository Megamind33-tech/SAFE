/**
 * Payment provider logo tile — uses paymentAssets.ts only.
 */
import {
  getPaymentAsset,
  paymentAssets,
  resolvePaymentAssetKey,
} from '../assets/paymentAssets.ts';

/**
 * @param {{
 *   provider: string;
 *   dual?: boolean;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export default function PaymentLogo({ provider, dual = false, className = '', disabled = false }) {
  const resolved = dual || provider === 'visa_mastercard' ? 'dual_cards' : resolvePaymentAssetKey(provider);

  if (resolved === 'dual_cards') {
    return (
      <span
        className={`payment-logo payment-logo--cards${disabled ? ' payment-logo--disabled' : ''} ${className}`.trim()}
        aria-label="Visa and Mastercard"
      >
        <img
          src={paymentAssets.visa}
          alt="Visa"
          className="payment-logo__image payment-logo__image--visa"
          draggable={false}
        />
        <img
          src={paymentAssets.mastercard}
          alt="Mastercard"
          className="payment-logo__image payment-logo__image--mastercard"
          draggable={false}
        />
      </span>
    );
  }

  const assetKey = resolved;
  const src = getPaymentAsset(assetKey);

  const label =
    assetKey === 'airtel'
      ? 'Airtel Money'
      : assetKey === 'mtn'
        ? 'MTN Mobile Money'
        : assetKey === 'visa'
          ? 'Visa'
          : assetKey === 'mastercard'
            ? 'Mastercard'
            : 'Payment method';

  if (!src) {
    if (import.meta.env.DEV) {
      console.error(`Missing payment logo asset: ${label}`);
    }
    return null;
  }

  return (
    <span
      className={`payment-logo payment-logo--${assetKey}${disabled ? ' payment-logo--disabled' : ''} ${className}`.trim()}
    >
      <img src={src} alt={label} className="payment-logo__image" draggable={false} />
    </span>
  );
}
