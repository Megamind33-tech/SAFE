import { request } from '../api/safeApi.js';

const API_PATH = '/api/mobile/trusted-contacts';

export const TRUSTED_CONTACTS_CACHE_KEY = 'safe_trusted_contacts_cache';

export const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Spouse',
  'Sibling',
  'Friend',
  'Workmate',
  'Other',
];

function mapApiContact(contact) {
  return {
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    maskedPhone: contact.maskedPhone,
    isPrimary: Boolean(contact.isPrimary),
    isVerified: Boolean(contact.isVerified),
  };
}

export function readCachedTrustedContacts() {
  try {
    const raw = sessionStorage.getItem(TRUSTED_CONTACTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => ({ ...item })) : [];
  } catch {
    return [];
  }
}

export function writeCachedTrustedContacts(contacts) {
  try {
    if (!contacts?.length) {
      sessionStorage.removeItem(TRUSTED_CONTACTS_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(TRUSTED_CONTACTS_CACHE_KEY, JSON.stringify(contacts));
  } catch {
    /* ignore */
  }
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/[\s-]/g, '').trim();
}

export function normalizeZambianPhone(phone) {
  const value = normalizePhoneDigits(phone);
  if (/^\+260[0-9]{9}$/.test(value)) return value;
  if (/^09[0-9]{8}$/.test(value)) return `+260${value.slice(1)}`;
  if (/^260[0-9]{9}$/.test(value)) return `+${value}`;
  if (/^[0-9]{9}$/.test(value) && /^[79]/.test(value)) return `+260${value}`;
  return null;
}

export function maskPhoneNumber(phone) {
  const digits = normalizePhoneDigits(phone).replace(/\D/g, '');
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

export function getContactInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatContactMeta(contact) {
  return `${contact.relationship} • ${contact.maskedPhone}`;
}

export function validateContactForm({ name, relationship, phone }) {
  const trimmedName = String(name || '').trim();
  if (trimmedName.length < 2) {
    return { valid: false, field: 'name', message: 'Enter the contact’s full name (at least 2 characters).' };
  }
  if (!RELATIONSHIP_OPTIONS.includes(relationship)) {
    return { valid: false, field: 'relationship', message: 'Choose a relationship.' };
  }
  const normalized = normalizeZambianPhone(phone);
  if (!normalized) {
    return {
      valid: false,
      field: 'phone',
      message: 'Use +260XXXXXXXXX, 09XXXXXXXX, or 9XXXXXXXX.',
    };
  }
  return { valid: true, normalized, name: trimmedName };
}

export function findDuplicateByPhone(contacts, normalizedPhone, excludeId = null) {
  const last4 = normalizedPhone.replace(/\D/g, '').slice(-4);
  return (
    contacts.find((contact) => {
      if (excludeId && contact.id === excludeId) return false;
      return contact.maskedPhone?.replace(/\D/g, '').endsWith(last4);
    }) || null
  );
}

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export async function getTrustedContacts(token) {
  if (!token) return [];
  try {
    const data = await request(API_PATH, { token });
    const list = data?.trustedContacts ?? [];
    return Array.isArray(list) ? list.map(mapApiContact) : [];
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error('Could not load trusted contacts.');
    }
    throw error;
  }
}

export async function createTrustedContact(token, payload) {
  const data = await request(API_PATH, {
    method: 'POST',
    token,
    body: payload,
  });
  return mapApiContact(data.trustedContact);
}

export async function updateTrustedContact(token, id, payload) {
  const data = await request(`${API_PATH}/${id}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
  return mapApiContact(data.trustedContact);
}

export async function deleteTrustedContact(token, id) {
  const data = await request(`${API_PATH}/${id}`, {
    method: 'DELETE',
    token,
  });
  const list = data?.trustedContacts ?? [];
  return Array.isArray(list) ? list.map(mapApiContact) : [];
}

export async function setPrimaryTrustedContact(token, id) {
  const data = await request(`${API_PATH}/${id}/primary`, {
    method: 'PUT',
    token,
  });
  const list = data?.trustedContacts ?? [];
  return Array.isArray(list) ? list.map(mapApiContact) : [];
}
