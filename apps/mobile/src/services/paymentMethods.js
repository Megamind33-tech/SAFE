import { request } from '../api/safeApi.js';

const API_PATH = '/api/mobile/payment-methods';

/** @typedef {'mobile_money' | 'card'} PaymentMethodType */
/** @typedef {'airtel' | 'mtn' | 'visa_mastercard'} PaymentProvider */

/**
 * @typedef {Object} PaymentMethod
 * @property {string} id
 * @property {PaymentMethodType} type
 * @property {PaymentProvider} provider
 * @property {string} displayName
 * @property {string} [maskedValue]
 * @property {boolean} isDefault
 * @property {'active' | 'pending' | 'failed'} [status]
 */

function apiTypeToProvider(type) {
  if (type === 'airtel_money') return 'airtel';
  if (type === 'mtn_mobile_money') return 'mtn';
  return 'visa_mastercard';
}

function apiTypeToMethodType(type) {
  if (type === 'card') return 'card';
  return 'mobile_money';
}

function mapApiMethod(method) {
  const provider = apiTypeToProvider(method.type);
  return {
    id: method.id,
    type: apiTypeToMethodType(method.type),
    provider,
    displayName: method.label || method.displayName || providerDisplayName(provider),
    maskedValue: method.maskedValue,
    isDefault: Boolean(method.isDefault),
    status: method.status || 'active',
  };
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/[\s-]/g, '').trim();
}

export function validateZambianPhone(phone) {
  const value = normalizePhoneDigits(phone);
  if (!value) {
    return { valid: false, message: 'Enter a mobile money phone number.' };
  }
  if (/^\+260[0-9]{9}$/.test(value)) {
    return { valid: true, normalized: value };
  }
  if (/^09[0-9]{8}$/.test(value)) {
    return { valid: true, normalized: `+260${value.slice(1)}` };
  }
  return {
    valid: false,
    message: 'Use +260XXXXXXXXX or 09XXXXXXXX.',
  };
}

export function maskPhoneNumber(phone) {
  const digits = normalizePhoneDigits(phone).replace(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('260')) {
    const local = digits.slice(3);
    return `+260 ${local.slice(0, 2)} *** ${local.slice(-4)}`;
  }
  if (digits.length >= 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} *** ${digits.slice(-4)}`;
  }
  return phone;
}

export function providerDisplayName(provider) {
  if (provider === 'airtel') return 'Airtel Money';
  if (provider === 'mtn') return 'MTN Mobile Money';
  return 'Visa / Mastercard';
}

export function providerSubtitle(provider) {
  if (provider === 'airtel') return 'Pay with Airtel Money';
  if (provider === 'mtn') return 'Pay with MTN MoMo';
  return 'Card payment';
}

export function toCheckoutPaymentId(provider) {
  if (provider === 'visa_mastercard') return 'card';
  return provider;
}

export function resolveDefaultCheckoutId(methods) {
  const defaultMethod = methods.find((method) => method.isDefault);
  if (!defaultMethod) return null;
  return toCheckoutPaymentId(defaultMethod.provider);
}

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function getPaymentMethods(token) {
  if (!token) {
    return [];
  }

  try {
    const data = await request(API_PATH, { token });
    const list = data?.paymentMethods ?? data?.methods ?? [];
    return Array.isArray(list) ? list.map(mapApiMethod) : [];
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error('Could not load payment methods.');
    }
    throw error;
  }
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function setDefaultPaymentMethod(token, methodId) {
  const data = await request(`${API_PATH}/${methodId}/default`, { method: 'PUT', token });
  const list = data?.paymentMethods ?? [];
  return list.map(mapApiMethod);
}

/**
 * @returns {Promise<PaymentMethod>}
 */
export async function addMobileMoneyMethod(token, provider, phoneNumber) {
  const validation = validateZambianPhone(phoneNumber);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  if (provider !== 'airtel' && provider !== 'mtn') {
    throw new Error('Unsupported mobile money provider.');
  }

  const data = await request(API_PATH, {
    method: 'POST',
    token,
    body: { provider, phoneNumber: validation.normalized },
  });

  return mapApiMethod(data.paymentMethod);
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function removePaymentMethod(token, methodId) {
  const data = await request(`${API_PATH}/${methodId}`, { method: 'DELETE', token });
  const list = data?.paymentMethods ?? [];
  return list.map(mapApiMethod);
}
