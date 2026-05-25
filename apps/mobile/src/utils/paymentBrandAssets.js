/**
 * SAFE payment brand assets — from Google Drive pack (safe_payment_assets).
 * @see src/assets/payment-methods/PaymentBrandIcon.mapping.txt
 */
import airtelMoneyAsset from '../assets/payment-methods/svg/airtel_money.svg';
import mtnMobileMoneyAsset from '../assets/payment-methods/svg/mtn_momo.svg';
import visaMastercardAsset from '../assets/payment-methods/svg/visa_mastercard.svg';

/** @typedef {'airtel_money' | 'mtn_mobile_money' | 'card' | 'visa' | 'mastercard'} PaymentBrandType */

/** @type {Record<string, string>} */
export const PAYMENT_BRAND_ASSETS = {
  airtel_money: airtelMoneyAsset,
  mtn_mobile_money: mtnMobileMoneyAsset,
  card: visaMastercardAsset,
  visa: visaMastercardAsset,
  mastercard: visaMastercardAsset,
  visa_mastercard: visaMastercardAsset,
};

/** @typedef {'airtel' | 'mtn' | 'visa_mastercard' | 'visa' | 'mastercard'} PaymentProvider */

/** @param {PaymentProvider | PaymentBrandType | string} value */
export function toPaymentBrandType(value) {
  if (value === 'airtel' || value === 'airtel_money') return 'airtel_money';
  if (value === 'mtn' || value === 'mtn_mobile_money' || value === 'mtn_momo') return 'mtn_mobile_money';
  if (value === 'visa') return 'visa';
  if (value === 'mastercard') return 'mastercard';
  return 'card';
}

/** @param {PaymentBrandType | string} type */
export function getPaymentBrandAsset(type) {
  const brandType = toPaymentBrandType(type);
  return PAYMENT_BRAND_ASSETS[brandType] ?? null;
}

export function getMissingPaymentBrandAssets() {
  const required = [
    ['airtel_money', 'Airtel Money'],
    ['mtn_mobile_money', 'MTN Mobile Money'],
    ['card', 'Visa/Mastercard (combined)'],
  ];
  return required.filter(([key]) => !PAYMENT_BRAND_ASSETS[key]).map(([, label]) => label);
}

export const PAYMENT_BRAND_PATHS = {
  airtel_money: 'apps/mobile/src/assets/payment-methods/svg/airtel_money.svg',
  mtn_mobile_money: 'apps/mobile/src/assets/payment-methods/svg/mtn_momo.svg',
  card: 'apps/mobile/src/assets/payment-methods/svg/visa_mastercard.svg',
};
