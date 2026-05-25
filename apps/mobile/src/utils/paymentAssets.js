/**
 * SAFE payment brand asset map — single source of truth for Payment Methods UI.
 *
 * Source pack: safe_payment_assets (Google Drive). PNG icons at 288px, trimmed to
 * content bounds; Visa/Mastercard split from visa_mastercard_icon_288px.png.
 *
 * REJECTED (not used):
 * - svg/airtel_money.svg, svg/mtn_momo.svg, svg/visa_mastercard.svg (handmade text logos)
 * - png/*_tile_*.png (baked-in "Card payment" subtitle text)
 * - Combined visa_mastercard graphic for single-brand slots
 */
import airtelMoney from '../assets/payment/airtel-money.png';
import mtnMobileMoney from '../assets/payment/mtn-mobile-money.png';
import visa from '../assets/payment/visa.png';
import mastercard from '../assets/payment/mastercard.png';

/** @typedef {'airtel' | 'mtn' | 'visa' | 'mastercard' | 'airtel_money' | 'mtn_mobile_money' | 'card' | 'visa_mastercard'} PaymentAssetKey */

export const paymentAssets = {
  airtelMoney,
  mtnMobileMoney,
  visa,
  mastercard,
  /** @deprecated use airtelMoney */
  airtel: airtelMoney,
  /** @deprecated use mtnMobileMoney */
  mtn: mtnMobileMoney,
  airtel_money: airtelMoney,
  mtn_mobile_money: mtnMobileMoney,
  mtn_momo: mtnMobileMoney,
  card: null,
  visa_mastercard: null,
};

export const PAYMENT_ASSET_PATHS = {
  airtelMoney: 'apps/mobile/src/assets/payment/airtel-money.png',
  mtnMobileMoney: 'apps/mobile/src/assets/payment/mtn-mobile-money.png',
  visa: 'apps/mobile/src/assets/payment/visa.png',
  mastercard: 'apps/mobile/src/assets/payment/mastercard.png',
};

/** @param {string} value */
export function resolvePaymentAssetKey(value) {
  if (value === 'airtel' || value === 'airtel_money' || value === 'airtelMoney') return 'airtel';
  if (value === 'mtn' || value === 'mtn_mobile_money' || value === 'mtn_momo' || value === 'mtnMobileMoney') {
    return 'mtn';
  }
  if (value === 'visa') return 'visa';
  if (value === 'mastercard') return 'mastercard';
  if (value === 'visa_mastercard' || value === 'card') return 'dual_cards';
  return 'airtel';
}

/** @param {string} key */
export function getPaymentAsset(key) {
  const resolved = resolvePaymentAssetKey(key);
  if (resolved === 'dual_cards') return null;
  if (resolved === 'airtel') return paymentAssets.airtelMoney;
  if (resolved === 'mtn') return paymentAssets.mtnMobileMoney;
  return paymentAssets[resolved] ?? null;
}

export function getMissingPaymentBrandAssets() {
  const missing = [];
  if (!paymentAssets.airtelMoney) missing.push('Airtel Money');
  if (!paymentAssets.mtnMobileMoney) missing.push('MTN Mobile Money');
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
