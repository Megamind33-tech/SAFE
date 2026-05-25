/**
 * @deprecated Use PaymentLogo — kept for existing imports.
 */
import PaymentLogo from './PaymentLogo.jsx';

export { resolvePaymentAssetKey as toPaymentBrandType } from '../assets/paymentAssets.ts';

/**
 * @param {Parameters<typeof PaymentLogo>[0]} props
 */
export default function PaymentBrandIcon({ type, className = '', disabled = false, dual = false }) {
  return <PaymentLogo provider={type} className={className} disabled={disabled} dual={dual} />;
}
