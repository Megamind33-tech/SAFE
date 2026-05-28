/**
 * SAFE payment brand asset map — single source of truth for payment UI.
 *
 * Uses the provided Drive payment brand pack (SVG marks + PNG tiles/icons).
 */
import airtelSvg from './payment-methods/svg/airtel_money.svg';
import mtnSvg from './payment-methods/svg/mtn_momo.svg';
import visaMastercardSvg from './payment-methods/svg/visa_mastercard.svg';

import airtelIcon112 from './payment-methods/png/airtel_money_icon_112px.png';
import mtnIcon112 from './payment-methods/png/mtn_momo_icon_112px.png';
import visaMastercardIcon112 from './payment-methods/png/visa_mastercard_icon_112px.png';

import airtelTile from './payment-methods/png/airtel_money_tile_640x480.png';
import mtnTile from './payment-methods/png/mtn_momo_tile_640x480.png';
import visaMastercardTile from './payment-methods/png/visa_mastercard_tile_640x480.png';

export type PaymentProviderKey = 'airtel' | 'mtn' | 'visa_mastercard';
export type PaymentBrandAssetVariant = 'svg' | 'icon' | 'tile';

export const paymentBrandAssets = {
  airtel: {
    svg: airtelSvg,
    icon: airtelIcon112,
    tile: airtelTile,
    label: 'Airtel Money',
  },
  mtn: {
    svg: mtnSvg,
    icon: mtnIcon112,
    tile: mtnTile,
    label: 'MTN Mobile Money',
  },
  visa_mastercard: {
    svg: visaMastercardSvg,
    icon: visaMastercardIcon112,
    tile: visaMastercardTile,
    label: 'Visa / Mastercard',
  },
} as const;

export function resolvePaymentProviderKey(value: string): PaymentProviderKey | null {
  const v = String(value || '').toLowerCase();
  if (v === 'airtel' || v === 'airtel_money' || v === 'airtelmoney') return 'airtel';
  if (v === 'mtn' || v === 'mtn_mobile_money' || v === 'mtn_momo' || v === 'mtnmomo') return 'mtn';
  if (v === 'visa_mastercard' || v === 'card') return 'visa_mastercard';
  if (v === 'visa' || v === 'mastercard') return 'visa_mastercard';
  return null;
}

export function getPaymentBrandAsset(provider: string, variant: PaymentBrandAssetVariant): string | null {
  const key = resolvePaymentProviderKey(provider);
  if (!key) return null;
  return paymentBrandAssets[key][variant] ?? null;
}

export function getPaymentBrandLabel(provider: string): string {
  const key = resolvePaymentProviderKey(provider);
  return key ? paymentBrandAssets[key].label : 'Payment method';
}

export function getMissingPaymentBrandAssets(): string[] {
  const missing: string[] = [];
  if (!paymentBrandAssets.airtel.svg || !paymentBrandAssets.airtel.icon || !paymentBrandAssets.airtel.tile) {
    missing.push('Airtel Money');
  }
  if (!paymentBrandAssets.mtn.svg || !paymentBrandAssets.mtn.icon || !paymentBrandAssets.mtn.tile) {
    missing.push('MTN Mobile Money');
  }
  if (
    !paymentBrandAssets.visa_mastercard.svg ||
    !paymentBrandAssets.visa_mastercard.icon ||
    !paymentBrandAssets.visa_mastercard.tile
  ) {
    missing.push('Visa / Mastercard');
  }
  return missing;
}
