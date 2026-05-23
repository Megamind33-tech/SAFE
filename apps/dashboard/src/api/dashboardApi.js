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

export async function dashboardClaims(token) {
  return request('/api/dashboard/claims', { token });
}

export async function approveClaim(token, id) {
  return request(`/api/dashboard/claims/${id}/approve`, { method: 'POST', token });
}

export async function rejectClaim(token, id) {
  return request(`/api/dashboard/claims/${id}/reject`, { method: 'POST', token });
}

export async function dashboardVehicles(token) {
  return request('/api/dashboard/vehicles', { token });
}

export async function dashboardDrivers(token) {
  return request('/api/dashboard/drivers', { token });
}

export async function onboardDriver(token, driverData) {
  return request('/api/dashboard/drivers', { method: 'POST', token, body: driverData });
}

export async function dashboardPayments(token) {
  return request('/api/dashboard/payments', { token });
}

export async function dashboardUsers(token) {
  return request('/api/dashboard/users', { token });
}

export async function dashboardQRScans(token) {
  return request('/api/dashboard/qr-scans', { token });
}

export async function dashboardCovers(token) {
  return request('/api/dashboard/covers', { token });
}

export async function dashboardPayouts(token) {
  return request('/api/dashboard/payouts', { token });
}

export async function dashboardFraudFlags(token) {
  return request('/api/dashboard/fraud/flags', { token });
}

export async function dashboardRoutes(token) {
  return request('/api/dashboard/routes', { token });
}
