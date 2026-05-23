import { apiRequest, setToken, removeToken, getToken } from './client.js';

export async function register({ phone, password, fullName, email }) {
  const data = await apiRequest('/api/shared/auth/register', {
    method: 'POST',
    body: { email, phone, password, fullName },
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function login({ identifier, password }) {
  const data = await apiRequest('/api/shared/auth/login', {
    method: 'POST',
    body: { identifier, password },
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return apiRequest('/api/shared/auth/me', { token: getToken() });
}

export function logout() {
  removeToken();
}
