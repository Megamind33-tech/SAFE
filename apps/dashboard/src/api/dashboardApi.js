const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

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
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
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

export async function dashboardLogin({ identifier, password }) {
  const data = await request('/api/shared/auth/login', { method: 'POST', body: { identifier, password } });
  const role = data?.user?.role;
  if (role === 'passenger') {
    throw new Error('This account is a passenger account. Use the mobile app.');
  }
  return data;
}

export async function dashboardMe(token) {
  return request('/api/shared/auth/me', { token });
}

export async function dashboardMetrics(token) {
  return request('/api/dashboard/metrics', { token });
}

export async function dashboardVehicles(token) {
  return request('/api/dashboard/vehicles', { token });
}

export async function dashboardVehicle(token, vehicleId) {
  return request(`/api/dashboard/vehicles/${vehicleId}`, { token });
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

export async function dashboardPartners(token) {
  return request('/api/dashboard/partners', { token });
}

export async function dashboardPartner(token, partnerId) {
  return request(`/api/dashboard/partners/${partnerId}`, { token });
}

export async function dashboardCovers(token, status = 'all') {
  const q = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/dashboard/covers${q}`, { token });
}

export async function dashboardPayments(token, status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/dashboard/payments${q}`, { token });
}

export async function dashboardPaymentsConfig(token) {
  return request('/api/dashboard/payments/config', { token });
}

export async function dashboardClaims(token, status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/dashboard/claims${q}`, { token });
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
  const q = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/api/dashboard/support-reports${q}`, { token });
}

export async function updateSupportReport(token, id, body) {
  return request(`/api/dashboard/support-reports/${id}`, { method: 'PATCH', token, body });
}

export async function dashboardDrivers(token) {
  return request('/api/dashboard/drivers', { token });
}

export async function onboardDriver(token, driverData) {
  return request('/api/dashboard/drivers', { method: 'POST', token, body: driverData });
}
