/**
 * Payment brand asset registry.
 *
 * DEV WARNING — real payment brand files are not in the repo yet.
 * Upload official assets to `apps/mobile/src/assets/payment/` using names such as:
 *   - airtel-money.png (Airtel Money)
 *   - mtn-mobile-money.png (MTN Mobile Money)
 *   - visa-mastercard.png (Visa / Mastercard combined, or separate visa.png + mastercard.png)
 *
 * When all three providers resolve to a file, DEV_FALLBACK_PAYMENT_ICON becomes false
 * and PaymentBrandIcon renders only the official artwork (no generic icons).
 */
const paymentAssetModules = import.meta.glob('../assets/payment/*.{png,svg,webp,jpg,jpeg}', {
  eager: true,
  import: 'default',
});

function resolveAsset(...namePatterns) {
  const entries = Object.entries(paymentAssetModules);
  for (const pattern of namePatterns) {
    const normalized = pattern.toLowerCase();
    const match = entries.find(([path]) => path.toLowerCase().includes(normalized));
    if (match) return match[1];
  }
  return null;
}

/** @typedef {'airtel' | 'mtn' | 'visa_mastercard'} PaymentBrandProvider */

export const airtelMoneyAsset = resolveAsset('airtel-money', 'airtel_money', 'airtel');
export const mtnMobileMoneyAsset = resolveAsset(
  'mtn-mobile-money',
  'mtn_mobile_money',
  'mtn-momo',
  'mtn_momo',
  'mtn-money',
  'mtn_money',
  'mtn'
);
export const visaMastercardAsset = resolveAsset(
  'visa-mastercard',
  'visa_mastercard',
  'card-payment',
  'card_payment',
  'mastercard',
  'visa'
);

/** @type {Record<PaymentBrandProvider, string | null>} */
export const PAYMENT_BRAND_ASSETS = {
  airtel: airtelMoneyAsset,
  mtn: mtnMobileMoneyAsset,
  visa_mastercard: visaMastercardAsset,
};

export function getPaymentBrandAsset(provider) {
  return PAYMENT_BRAND_ASSETS[provider] ?? null;
}

export function getMissingPaymentBrandAssets() {
  const missing = [];
  if (!airtelMoneyAsset) missing.push('Missing Airtel Money asset');
  if (!mtnMobileMoneyAsset) missing.push('Missing MTN Mobile Money asset');
  if (!visaMastercardAsset) missing.push('Missing Visa/Mastercard asset');
  return missing;
}

/** True while any official payment brand file is absent — enables temporary neutral placeholder only. */
export const DEV_FALLBACK_PAYMENT_ICON = getMissingPaymentBrandAssets().length > 0;

export const PAYMENT_BRAND_EXPECTED_PATHS = [
  'apps/mobile/src/assets/payment/airtel-money.png',
  'apps/mobile/src/assets/payment/mtn-mobile-money.png',
  'apps/mobile/src/assets/payment/visa-mastercard.png',
];
