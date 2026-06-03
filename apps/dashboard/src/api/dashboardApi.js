const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

class ApiError extends Error {
  constructor(message, { status, code, payload } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', token, body } = {}) {
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
    throw new ApiError(data?.error || `Request failed (${res.status})`, {
      status: res.status,
      code: data?.code,
      payload: data,
    });
  }
  return data;
}

function qs(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export function saveDashboardToken(token) {
  if (token) localStorage.setItem('safe_dashboard_token', token);
}

export function loadDashboardToken() {
  return localStorage.getItem('safe_dashboard_token') || '';
}

export function clearDashboardToken() {
  localStorage.removeItem('safe_dashboard_token');
}

const DASHBOARD_BLOCKED_ROLES = new Set([
  'passenger',
  'driver',
  'transport_partner',
  'insurance_partner',
]);

export async function dashboardLogin({ identifier, password }) {
  const data = await request('/api/shared/auth/login', { method: 'POST', body: { identifier, password } });
  const role = data?.user?.role;
  if (DASHBOARD_BLOCKED_ROLES.has(role)) {
    if (role === 'transport_partner' || role === 'insurance_partner') {
      throw new Error(
        'Partner accounts cannot access the operations dashboard yet. Ask ops for a company staff login.',
      );
    }
    throw new Error('This account cannot access the operations dashboard.');
  }
  return data;
}

export async function dashboardSession(token) {
  return request('/api/dashboard/session', { token });
}

export async function dashboardStaff(token, params = {}) {
  return request(`/api/dashboard/staff${qs(params)}`, { token });
}

export async function createStaffUser(token, body) {
  return request('/api/dashboard/staff', { method: 'POST', token, body });
}

export async function updateStaffUser(token, userId, body) {
  return request(`/api/dashboard/staff/${userId}`, { method: 'PATCH', token, body });
}

export async function dashboardMe(token) {
  return request('/api/shared/auth/me', { token });
}

export async function dashboardMetrics(token) {
  return request('/api/dashboard/metrics', { token });
}

export async function dashboardOverview(token) {
  return request('/api/dashboard/overview', { token });
}

export async function dashboardReadiness(token) {
  return request('/api/dashboard/readiness', { token });
}

export async function dashboardVehicles(token, params = {}) {
  return request(`/api/dashboard/vehicles${qs(params)}`, { token });
}

export async function dashboardVehicle(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}`, { token });
}

export async function createVehicle(token, body) {
  return request('/api/dashboard/vehicles', { method: 'POST', token, body });
}

export async function updateVehicle(token, vehicleId, body) {
  return request(`/api/dashboard/vehicles/${vehicleId}`, { method: 'PATCH', token, body });
}

export async function dashboardVehicleCovers(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}/covers`, { token });
}

export async function dashboardVehicleQr(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}/qr`, { token });
}

export async function generateVehicleQr(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}/qr`, { method: 'POST', token });
}

export async function regenerateVehicleQr(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}/qr/regenerate`, { method: 'POST', token });
}

export async function updateVehicleQr(token, vehicleId, body) {
  return request(`/api/dashboard/vehicles/${vehicleId}/qr`, { method: 'PATCH', token, body });
}

export async function dashboardVehicleScans(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}/qr/scans`, { token });
}

export async function dashboardQrScans(token, params = {}) {
  return request(`/api/dashboard/qr/scans${qs(params)}`, { token });
}

export async function dashboardPartners(token) {
  return request('/api/dashboard/partners', { token });
}

export async function dashboardPartner(token, partnerId) {
  return request(`/api/dashboard/partners/${partnerId}`, { token });
}

export async function dashboardCovers(token, params = {}) {
  const status = typeof params === 'string' ? params : params.status;
  const rest = typeof params === 'string' ? {} : params;
  return request(`/api/dashboard/covers${qs({ status, ...rest })}`, { token });
}

export async function dashboardCover(token, coverId) {
  return request(`/api/dashboard/covers/${coverId}`, { token });
}

export async function dashboardPayments(token, params = {}) {
  const status = typeof params === 'string' ? params : params.status;
  const rest = typeof params === 'string' ? {} : params;
  return request(`/api/dashboard/payments${qs({ status, ...rest })}`, { token });
}

export async function dashboardPayment(token, paymentId) {
  return request(`/api/dashboard/payments/${paymentId}`, { token });
}

export async function dashboardPaymentsConfig(token) {
  return request('/api/dashboard/payments/config', { token });
}

export async function adminOverridePayment(token, paymentId, { reason, category }) {
  return request(`/api/dashboard/payments/${paymentId}/admin-override`, {
    method: 'POST',
    token,
    body: { reason, category },
  });
}

export async function dashboardClaims(token, status) {
  return request(`/api/dashboard/claims${qs({ status })}`, { token });
}

export async function dashboardClaimDetail(token, id) {
  return request(`/api/dashboard/claims/${id}`, { token });
}

export async function updateClaimStatus(token, id, body) {
  return request(`/api/dashboard/claims/${id}`, { method: 'PATCH', token, body });
}

export async function approveClaim(token, id) {
  return request(`/api/dashboard/claims/${id}/approve`, { method: 'POST', token });
}

export async function rejectClaim(token, id, reason) {
  return request(`/api/dashboard/claims/${id}/reject`, { method: 'POST', token, body: { reason } });
}

export async function dashboardSupportReports(token, status) {
  return request(`/api/dashboard/support-reports${qs({ status })}`, { token });
}

export async function updateSupportReport(token, id, body) {
  return request(`/api/dashboard/support-reports/${id}`, { method: 'PATCH', token, body });
}

export async function dashboardTrips(token, bucket) {
  return request(`/api/dashboard/trips${qs({ bucket })}`, { token });
}

export async function dashboardTrip(token, tripId) {
  return request(`/api/dashboard/trips/${tripId}`, { token });
}

export async function dashboardUsers(token, search) {
  return request(`/api/dashboard/users${qs({ search })}`, { token });
}

export async function dashboardUser(token, userId) {
  return request(`/api/dashboard/users/${userId}`, { token });
}

export async function dashboardDrivers(token) {
  return request('/api/dashboard/drivers', { token });
}

export async function onboardDriver(token, driverData) {
  return request('/api/dashboard/drivers', { method: 'POST', token, body: driverData });
}

export async function dashboardAnalytics(token) {
  return request('/api/dashboard/analytics', { token });
}

export async function dashboardFraudFlags(token) {
  return request('/api/dashboard/fraud/flags', { token });
}

export async function dashboardDocuments(token, params = {}) {
  return request(`/api/dashboard/documents${qs(params)}`, { token });
}
