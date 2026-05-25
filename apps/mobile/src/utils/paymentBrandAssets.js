/**
 * Official SAFE payment brand assets.
 * Replace files in assets/payment/ with uploaded production artwork when available.
 */
import airtelMoneyAsset from '../assets/payment/airtel-money.svg';
import mtnMobileMoneyAsset from '../assets/payment/mtn-mobile-money.svg';
import visaMastercardAsset from '../assets/payment/visa-mastercard.svg';

/** @typedef {'airtel_money' | 'mtn_mobile_money' | 'card'} PaymentBrandType */

/** @type {Record<PaymentBrandType, string>} */
export const PAYMENT_BRAND_ASSETS = {
  airtel_money: airtelMoneyAsset,
  mtn_mobile_money: mtnMobileMoneyAsset,
  card: visaMastercardAsset,
};

/** @typedef {'airtel' | 'mtn' | 'visa_mastercard'} PaymentProvider */

/** @param {PaymentProvider | PaymentBrandType | string} value */
export function toPaymentBrandType(value) {
  if (value === 'airtel' || value === 'airtel_money') return 'airtel_money';
  if (value === 'mtn' || value === 'mtn_mobile_money') return 'mtn_mobile_money';
  return 'card';
}

/** @param {PaymentBrandType} type */
export function getPaymentBrandAsset(type) {
  return PAYMENT_BRAND_ASSETS[type] ?? null;
}

export function getMissingPaymentBrandAssets() {
  const missing = [];
  if (!PAYMENT_BRAND_ASSETS.airtel_money) missing.push('Airtel Money');
  if (!PAYMENT_BRAND_ASSETS.mtn_mobile_money) missing.push('MTN Mobile Money');
  if (!PAYMENT_BRAND_ASSETS.card) missing.push('Visa/Mastercard');
  return missing;
}

export const PAYMENT_BRAND_PATHS = {
  airtel_money: 'apps/mobile/src/assets/payment/airtel-money.svg',
  mtn_mobile_money: 'apps/mobile/src/assets/payment/mtn-mobile-money.svg',
  card: 'apps/mobile/src/assets/payment/visa-mastercard.svg',
};
