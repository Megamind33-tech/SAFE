/**
 * SAFE payment brand asset map — single source of truth for Payment Methods UI.
 *
 * Source pack: safe_payment_assets (Google Drive). PNG icons at 192px extracted;
 * Visa and Mastercard split from visa_mastercard_icon_192px.png via content bounds.
 *
 * REJECTED (not used):
 * - svg/airtel_money.svg, svg/mtn_momo.svg, svg/visa_mastercard.svg (handmade text logos)
 * - png/*_112px.png (superseded by 192px extracts)
 * - Combined visa_mastercard graphic for single-brand slots (use visa + mastercard PNGs)
 */
import airtel from '../assets/payment-methods/png/airtel.png';
import mtn from '../assets/payment-methods/png/mtn.png';
import visa from '../assets/payment-methods/png/visa.png';
import mastercard from '../assets/payment-methods/png/mastercard.png';

/** @typedef {'airtel' | 'mtn' | 'visa' | 'mastercard' | 'airtel_money' | 'mtn_mobile_money' | 'card' | 'visa_mastercard'} PaymentAssetKey */

export const paymentAssets = {
  airtel,
  airtel_money: airtel,
  mtn,
  mtn_mobile_money: mtn,
  mtn_momo: mtn,
  visa,
  mastercard,
  card: null,
  visa_mastercard: null,
};

export const PAYMENT_ASSET_PATHS = {
  airtel: 'apps/mobile/src/assets/payment-methods/png/airtel.png',
  mtn: 'apps/mobile/src/assets/payment-methods/png/mtn.png',
  visa: 'apps/mobile/src/assets/payment-methods/png/visa.png',
  mastercard: 'apps/mobile/src/assets/payment-methods/png/mastercard.png',
};

/** @param {string} value */
export function resolvePaymentAssetKey(value) {
  if (value === 'airtel' || value === 'airtel_money') return 'airtel';
  if (value === 'mtn' || value === 'mtn_mobile_money' || value === 'mtn_momo') return 'mtn';
  if (value === 'visa') return 'visa';
  if (value === 'mastercard') return 'mastercard';
  if (value === 'visa_mastercard' || value === 'card') return 'dual_cards';
  return 'airtel';
}

/** @param {string} key */
export function getPaymentAsset(key) {
  const resolved = resolvePaymentAssetKey(key);
  if (resolved === 'dual_cards') return null;
  return paymentAssets[resolved] ?? null;
}

export function getMissingPaymentBrandAssets() {
  const missing = [];
  if (!paymentAssets.airtel) missing.push('Airtel Money');
  if (!paymentAssets.mtn) missing.push('MTN Mobile Money');
  if (!paymentAssets.visa) missing.push('Visa');
  if (!paymentAssets.mastercard) missing.push('Mastercard');
  return missing;
}

/** @deprecated use resolvePaymentAssetKey */
export function toPaymentBrandType(value) {
  return resolvePaymentAssetKey(value);
}

/** @deprecated use getPaymentAsset */
export function getPaymentBrandAsset(type) {
  return getPaymentAsset(type);
}

export { paymentAssets as PAYMENT_BRAND_ASSETS };
