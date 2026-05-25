import { request } from '../api/safeApi.js';

const STORAGE_KEY_PREFIX = 'safe_payment_methods_v1_';
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

export class PaymentMethodsApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = 'PaymentMethodsApiError';
    this.status = status;
    this.code = code;
  }
}

export class PaymentMethodsNotImplementedError extends Error {
  constructor(message = 'Payment method API is not available yet.') {
    super(message);
    this.name = 'PaymentMethodsNotImplementedError';
  }
}

function storageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId || 'anonymous'}`;
}

function readLocalMethods(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalMethods(userId, methods) {
  localStorage.setItem(storageKey(userId), JSON.stringify(methods));
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
  if (digits.length < 4) return phone;
  const tail = digits.slice(-3);
  if (digits.startsWith('260') && digits.length >= 12) {
    return `+260 ** *** ${tail}`;
  }
  return `*** *** ${tail}`;
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

export function fromCheckoutPaymentId(id) {
  if (id === 'card') return 'visa_mastercard';
  return id;
}

function createMethodId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function mapApiMethod(method) {
  return {
    id: method.id,
    type: method.type,
    provider: method.provider,
    displayName: method.displayName || providerDisplayName(method.provider),
    maskedValue: method.maskedValue,
    isDefault: Boolean(method.isDefault),
    status: method.status || 'active',
  };
}

async function tryApiRequest(path, options) {
  try {
    return await request(path, options);
  } catch (error) {
    const message = error?.message || '';
    const notFound = /404|not found/i.test(message);
    if (notFound) {
      throw new PaymentMethodsNotImplementedError();
    }
    throw error;
  }
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function getPaymentMethods(token, userId) {
  if (token) {
    try {
      const data = await tryApiRequest(API_PATH, { token });
      const methods = (data?.methods || []).map(mapApiMethod);
      writeLocalMethods(userId, methods);
      return methods;
    } catch (error) {
      if (!(error instanceof PaymentMethodsNotImplementedError)) {
        throw error;
      }
    }
  }

  return readLocalMethods(userId);
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function setDefaultPaymentMethod(token, userId, methodId) {
  const methods = readLocalMethods(userId);
  const exists = methods.some((method) => method.id === methodId);
  if (!exists) {
    throw new Error('Payment method not found.');
  }

  if (token) {
    try {
      await tryApiRequest(`${API_PATH}/${methodId}/default`, { method: 'PUT', token });
    } catch (error) {
      if (!(error instanceof PaymentMethodsNotImplementedError)) {
        throw error;
      }
    }
  }

  const updated = methods.map((method) => ({
    ...method,
    isDefault: method.id === methodId,
  }));
  writeLocalMethods(userId, updated);
  return updated;
}

/**
 * @returns {Promise<{ method: PaymentMethod, persistedLocally: boolean }>}
 */
export async function addMobileMoneyMethod(token, userId, provider, phoneNumber) {
  const validation = validateZambianPhone(phoneNumber);
  if (!validation.valid) {
    throw new Error(validation.message);
  }

  if (provider !== 'airtel' && provider !== 'mtn') {
    throw new Error('Unsupported mobile money provider.');
  }

  const normalizedPhone = validation.normalized;
  const payload = { provider, phoneNumber: normalizedPhone };

  if (token) {
    try {
      const data = await tryApiRequest(API_PATH, { method: 'POST', token, body: payload });
      const method = mapApiMethod(data.method);
      const methods = readLocalMethods(userId);
      const withoutDuplicate = methods.filter(
        (item) => !(item.provider === provider && item.maskedValue === maskPhoneNumber(normalizedPhone))
      );
      const next = withoutDuplicate.map((item) => ({ ...item, isDefault: false }));
      next.unshift({ ...method, isDefault: next.length === 0 });
      writeLocalMethods(userId, next);
      return { method, persistedLocally: false };
    } catch (error) {
      if (!(error instanceof PaymentMethodsNotImplementedError)) {
        throw error;
      }
    }
  }

  const methods = readLocalMethods(userId);
  const duplicate = methods.find(
    (item) => item.provider === provider && item.maskedValue === maskPhoneNumber(normalizedPhone)
  );
  if (duplicate) {
    throw new Error('This mobile money number is already saved.');
  }

  const method = {
    id: createMethodId(),
    type: 'mobile_money',
    provider,
    displayName: providerDisplayName(provider),
    maskedValue: maskPhoneNumber(normalizedPhone),
    isDefault: methods.length === 0,
    status: 'active',
  };

  const next = methods.map((item) => ({
    ...item,
    isDefault: method.isDefault ? false : item.isDefault,
  }));
  next.push(method);
  writeLocalMethods(userId, next);

  return { method, persistedLocally: true };
}

/**
 * @returns {Promise<PaymentMethod[]>}
 */
export async function removePaymentMethod(token, userId, methodId) {
  const methods = readLocalMethods(userId);
  const target = methods.find((method) => method.id === methodId);
  if (!target) {
    throw new Error('Payment method not found.');
  }

  if (token) {
    try {
      await tryApiRequest(`${API_PATH}/${methodId}`, { method: 'DELETE', token });
    } catch (error) {
      if (!(error instanceof PaymentMethodsNotImplementedError)) {
        throw error;
      }
    }
  }

  let next = methods.filter((method) => method.id !== methodId);
  if (target.isDefault && next.length > 0) {
    next = next.map((method, index) => ({ ...method, isDefault: index === 0 }));
  }
  writeLocalMethods(userId, next);
  return next;
}

export function resolveDefaultCheckoutId(methods) {
  const defaultMethod = methods.find((method) => method.isDefault);
  if (!defaultMethod) return null;
  return toCheckoutPaymentId(defaultMethod.provider);
}
