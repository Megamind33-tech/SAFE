import type { TrustedContact } from '@prisma/client';

export const TRUSTED_CONTACT_RELATIONSHIPS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Friend',
  'Workmate',
  'Other',
] as const;

export type TrustedContactRelationship = (typeof TRUSTED_CONTACT_RELATIONSHIPS)[number];

export function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('260')) {
    const local = digits.slice(3);
    return `+260 ${local.slice(0, 2)} *** ${local.slice(-4)}`;
  }
  if (digits.length >= 10 && digits.startsWith('0')) {
    const local = digits.slice(1);
    return `+260 ${local.slice(0, 2)} *** ${local.slice(-4)}`;
  }
  return phone;
}

export function normalizeZambianPhone(phone: string): string | null {
  const value = phone.replace(/[\s-]/g, '').trim();
  if (/^\+260[0-9]{9}$/.test(value)) return value;
  if (/^09[0-9]{8}$/.test(value)) return `+260${value.slice(1)}`;
  if (/^260[0-9]{9}$/.test(value)) return `+${value}`;
  if (/^[0-9]{9}$/.test(value) && /^[79]/.test(value)) return `+260${value}`;
  return null;
}

export function isValidRelationship(value: string): value is TrustedContactRelationship {
  return (TRUSTED_CONTACT_RELATIONSHIPS as readonly string[]).includes(value);
}

/** API shape — never exposes full phoneNumber. */
export function serializeTrustedContact(contact: TrustedContact) {
  return {
    id: contact.id,
    userId: contact.userId,
    name: contact.name,
    relationship: contact.relationship,
    maskedPhone: contact.maskedPhone,
    isPrimary: contact.isPrimary,
    isVerified: contact.isVerified,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}
