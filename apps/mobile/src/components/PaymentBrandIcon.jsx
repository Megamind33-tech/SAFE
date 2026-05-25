/**
 * Payment brand logos for Payment Methods — uses paymentAssets map only.
 */
import {
  getPaymentAsset,
  paymentAssets,
  resolvePaymentAssetKey,
} from '../assets/paymentAssets.ts';

/**
 * @param {{
 *   type: string;
 *   className?: string;
 *   disabled?: boolean;
 *   dual?: boolean;
 * }} props
 */
export default function PaymentBrandIcon({
  type,
  className = '',
  disabled = false,
  dual = false,
}) {
  const resolved = resolvePaymentAssetKey(type);
  const showDual = dual || resolved === 'dual_cards';

  if (showDual) {
    return (
      <span
        className={`payment-brand-icon payment-brand-icon--dual${disabled ? ' payment-brand-icon--disabled' : ''} ${className}`.trim()}
        aria-label="Visa and Mastercard"
      >
        <img
          src={paymentAssets.visa}
          alt="Visa"
          className="payment-brand-icon__image payment-brand-icon__image--visa"
          draggable={false}
        />
        <img
          src={paymentAssets.mastercard}
          alt="Mastercard"
          className="payment-brand-icon__image payment-brand-icon__image--mastercard"
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
      console.error(`Missing payment brand asset: ${label}`);
    }
    return null;
  }

  return (
    <span
      className={`payment-brand-icon payment-brand-icon--${assetKey}${disabled ? ' payment-brand-icon--disabled' : ''} ${className}`.trim()}
    >
      <img src={src} alt={label} className="payment-brand-icon__image" draggable={false} />
    </span>
  );
}

export { resolvePaymentAssetKey as toPaymentBrandType } from '../assets/paymentAssets.ts';
