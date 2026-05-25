/**
 * SAFE payment brand asset map — single source of truth for Payment Methods UI.
 *
 * Source: safe_payment_assets (Google Drive pack).
 * Uses *_icon_288px.png only — never tile PNGs (baked "Card payment" subtitle).
 */
import airtelMoney from './payment/airtel-money.png';
import mtnMoMo from './payment/mtn-mobile-money.png';
import visa from './payment/visa.png';
import mastercard from './payment/mastercard.png';

export const paymentAssets = {
  airtelMoney,
  mtnMoMo,
  visa,
  mastercard,
} as const;

export type PaymentAssetKey = keyof typeof paymentAssets;

export function resolvePaymentAssetKey(value: string): 'airtel' | 'mtn' | 'visa' | 'mastercard' | 'dual_cards' {
  if (value === 'airtel' || value === 'airtel_money' || value === 'airtelMoney') return 'airtel';
  if (
    value === 'mtn' ||
    value === 'mtn_mobile_money' ||
    value === 'mtn_momo' ||
    value === 'mtnMoMo' ||
    value === 'mtnMobileMoney'
  ) {
    return 'mtn';
  }
  if (value === 'visa') return 'visa';
  if (value === 'mastercard') return 'mastercard';
  if (value === 'visa_mastercard' || value === 'card') return 'dual_cards';
  return 'airtel';
}

export function getPaymentAsset(key: string): string | null {
  const resolved = resolvePaymentAssetKey(key);
  if (resolved === 'dual_cards') return null;
  if (resolved === 'airtel') return paymentAssets.airtelMoney;
  if (resolved === 'mtn') return paymentAssets.mtnMoMo;
  return paymentAssets[resolved] ?? null;
}

export function getMissingPaymentBrandAssets(): string[] {
  const missing: string[] = [];
  if (!paymentAssets.airtelMoney) missing.push('Airtel Money');
  if (!paymentAssets.mtnMoMo) missing.push('MTN Mobile Money');
  if (!paymentAssets.visa) missing.push('Visa');
  if (!paymentAssets.mastercard) missing.push('Mastercard');
  return missing;
}
