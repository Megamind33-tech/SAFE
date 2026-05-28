const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

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
  try {
    const res = await fetch(`${API_BASE}${path}`, {
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
  } catch (err) {
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

