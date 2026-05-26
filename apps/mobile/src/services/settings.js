import { clearToken, request } from '../api/safeApi.js';

export const SETTINGS_CACHE_KEY = 'safe_settings_cache';

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export function readCachedSettings() {
  try {
    const raw = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedSettings(bundle) {
  try {
    if (!bundle) {
      sessionStorage.removeItem(SETTINGS_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export async function getSettingsConfig(token) {
  const data = await request('/api/mobile/settings/config', { token });
  return data?.config ?? null;
}

export async function getAccountDetails(token) {
  const data = await request('/api/mobile/settings/account', { token });
  return data?.account ?? null;
}

export async function loadSettingsBundle(token) {
  const [config, account] = await Promise.all([
    getSettingsConfig(token),
    getAccountDetails(token),
  ]);
  return { config, account };
}

export async function updateAccountDetails(token, payload) {
  const data = await request('/api/mobile/settings/account', {
    method: 'PATCH',
    token,
    body: payload,
  });
  return data?.account ?? null;
}

export async function requestDataExport(token) {
  try {
    const data = await request('/api/mobile/settings/data-export', {
      method: 'POST',
      token,
    });
    return { ok: true, message: data?.message ?? 'Data request received. SAFE will prepare your account data.' };
  } catch (error) {
    if (/not connected/i.test(String(error.message))) {
      return { ok: false, message: 'Data download is not connected yet.' };
    }
    throw error;
  }
}

export async function deleteAccount(token, confirmText) {
  try {
    const data = await request('/api/mobile/settings/account', {
      method: 'DELETE',
      token,
      body: { confirmText },
    });
    return { ok: true, deleted: Boolean(data?.deleted) };
  } catch (error) {
    if (/not connected/i.test(String(error.message))) {
      return { ok: false, message: 'Account deletion is not connected yet.' };
    }
    throw error;
  }
}

export function getLegalLinks(config) {
  return config?.legalLinks ?? { terms: null, privacy: null, claimsPolicy: null };
}

export function logout() {
  clearToken();
}

export function formatAccountCreatedAt(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

export function envLabel(appEnv) {
  if (appEnv === 'production') return 'Production';
  if (appEnv === 'staging') return 'Staging';
  return 'Local';
}
