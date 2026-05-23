const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export function getToken() {
  return localStorage.getItem('safe_token') || '';
}

export function setToken(token) {
  if (token) localStorage.setItem('safe_token', token);
}

export function removeToken() {
  localStorage.removeItem('safe_token');
}
