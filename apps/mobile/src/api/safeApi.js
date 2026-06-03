// On Android native, 127.0.0.1/localhost refers to the device itself, not the
// dev machine. The emulator reaches the host via 10.0.2.2. Physical devices
// can use a LAN IP / staging HTTPS URL (recommended), or ADB reverse for local dev.
// Capacitor injects the global `Capacitor` object synchronously before any JS runs.
const CONFIGURED_API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
const IS_ANDROID_NATIVE =
  typeof globalThis !== 'undefined' && globalThis.Capacitor?.getPlatform?.() === 'android';
const ANDROID_EMULATOR_FALLBACK_BASE =
  IS_ANDROID_NATIVE && /127\.0\.0\.1|localhost/.test(CONFIGURED_API_BASE)
    ? CONFIGURED_API_BASE.replace(/127\.0\.0\.1|localhost/, '10.0.2.2')
    : '';

function sanitizeErrorMessage(msg) {
  const raw = String(msg || '').trim();
  if (!raw) return 'An unexpected error occurred. Please try again.';
  if (/prisma|sqlite|constraint|foreign key|unique|database|query|sql|table/i.test(raw)) {
    return 'We encountered a temporary database issue. Please try again in a moment.';
  }
  if (/request failed \(500\)/i.test(raw)) {
    return 'Our server encountered an unexpected issue. We are looking into it.';
  }
  if (/failed to fetch|network|load failed|networkerror|offline/i.test(raw)) {
    return 'Connection failed. Please check your internet and try again.';
  }
  if (/^[A-Z_]+_ERROR|stack|at \/|line [0-9]/i.test(raw)) {
    return 'An unexpected system error occurred. Please try again.';
  }
  return raw;
}

export async function request(path, { method = 'GET', token, body } = {}) {
  async function run(apiBase) {
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const rawError = data?.error || `Request failed (${res.status})`;
      throw new Error(sanitizeErrorMessage(rawError));
    }
    return data;
  }

  function isNetworkFailure(error) {
    const message = String(error?.message || '').toLowerCase();
    return (
      message.includes('failed to fetch') ||
      message.includes('networkerror') ||
      message.includes('load failed') ||
      message.includes('network request failed')
    );
  }

  try {
    return await run(CONFIGURED_API_BASE);
  } catch (err) {
    if (ANDROID_EMULATOR_FALLBACK_BASE && isNetworkFailure(err)) {
      try {
        console.warn(
          '[SAFE] Android network fallback: retrying with 10.0.2.2. ' +
            'Set VITE_API_BASE_URL to a LAN/staging URL for physical device builds (or use ADB reverse).'
        );
        return await run(ANDROID_EMULATOR_FALLBACK_BASE);
      } catch (retryErr) {
        throw new Error(sanitizeErrorMessage(retryErr.message));
      }
    }
    throw new Error(sanitizeErrorMessage(err.message));
  }
}

export function saveToken(token) {
  if (token) localStorage.setItem('safe_token', token);
}

export function loadToken() {
  return localStorage.getItem('safe_token') || '';
}

export function clearToken() {
  localStorage.removeItem('safe_token');
}

export async function registerPassenger({ email, phone, password, fullName }) {
  return request('/api/shared/auth/register', {
    method: 'POST',
    body: { email, phone, password, fullName },
  });
}

export async function login({ identifier, password }) {
  return request('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
}

export async function me(token) {
  return request('/api/shared/auth/me', { token });
}

export async function verifyVehicle(token, payload) {
  return request('/api/mobile/vehicle/verify', { method: 'POST', token, body: payload });
}

export async function verifyQrScan(token, payload) {
  return request('/api/mobile/qr/scan', { method: 'POST', token, body: payload });
}

export async function verifyQrCode(token, code) {
  return request(`/api/mobile/qr/verify/${encodeURIComponent(code)}`, { token });
}

export async function buyCover(token, payload) {
  return request('/api/mobile/cover/buy', { method: 'POST', token, body: payload });
}

export async function activeCover(token) {
  return request('/api/mobile/cover/active', { token });
}

export async function coverPlans(token) {
  return request('/api/mobile/cover/plans', { token });
}

export async function purchaseCover(token, payload) {
  return request('/api/mobile/cover/purchase', { method: 'POST', token, body: payload });
}

export async function purchaseCoverStatus(token, purchaseId) {
  return request(`/api/mobile/cover/purchase/${purchaseId}/status`, { token });
}

export async function activeTrip(token) {
  return request('/api/mobile/active-trip', { token });
}

export async function startTripTracking(token, body = {}) {
  return request('/api/mobile/trips/start', { method: 'POST', token, body });
}

export async function updateTripLocation(token, tripId, body) {
  return request(`/api/mobile/trips/${tripId}/location`, { method: 'PATCH', token, body });
}

export async function endTripTracking(token, tripId) {
  return request(`/api/mobile/trips/${tripId}/end`, { method: 'POST', token });
}

export async function getTrip(token, tripId) {
  return request(`/api/mobile/trips/${tripId}`, { token });
}

export async function tripLocation(token, tripId) {
  return request(`/api/mobile/trips/${tripId}/location`, { token });
}

export async function tripRoute(token, tripId) {
  return request(`/api/mobile/trips/${tripId}/route`, { token });
}

export async function coverHistory(token) {
  return request('/api/mobile/cover/history', { token });
}

export async function createClaim(token, payload) {
  return request('/api/mobile/claims/create', { method: 'POST', token, body: payload });
}

export async function listClaims(token) {
  return request('/api/mobile/claims', { token });
}

