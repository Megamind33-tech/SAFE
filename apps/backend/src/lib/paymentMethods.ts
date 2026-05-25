import type { SavedPaymentMethod } from '@prisma/client';

export type PaymentMethodApiType = 'airtel_money' | 'mtn_mobile_money' | 'card';

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('260')) {
    const local = digits.slice(3);
    return `+260 ${local.slice(0, 2)} *** ${local.slice(-4)}`;
  }
  if (digits.length >= 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
  }
  return phone;
}

export function providerToType(provider: string): PaymentMethodApiType {
  if (provider === 'airtel') return 'airtel_money';
  if (provider === 'mtn') return 'mtn_mobile_money';
  return 'card';
}

export function typeToLabel(type: PaymentMethodApiType): { label: string; subtitle: string } {
  if (type === 'airtel_money') {
    return { label: 'Airtel Money', subtitle: 'Pay with Airtel Money' };
  }
  if (type === 'mtn_mobile_money') {
    return { label: 'MTN Mobile Money', subtitle: 'Pay with MTN MoMo' };
  }
  return { label: 'Visa / Mastercard', subtitle: 'Card payment' };
}

export function serializePaymentMethod(method: SavedPaymentMethod) {
  return {
    id: method.id,
    type: method.type,
    label: method.label,
    subtitle: method.subtitle,
    maskedValue: method.maskedValue,
    isDefault: method.isDefault,
    status: method.status,
  };
}

export function normalizeZambianPhone(phone: string): string | null {
  const value = phone.replace(/[\s-]/g, '').trim();
  if (/^\+260[0-9]{9}$/.test(value)) return value;
  if (/^09[0-9]{8}$/.test(value)) return `+260${value.slice(1)}`;
  return null;
}
