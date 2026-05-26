import { request } from '../api/safeApi.js';
import { getTrustedContacts } from './trustedContacts.js';

export const HELP_SAFETY_CONFIG_CACHE_KEY = 'safe_help_safety_config_cache';

export const REPORT_PROBLEM_TYPES = [
  { value: 'claim_issue', label: 'Claim issue' },
  { value: 'payment_issue', label: 'Payment issue' },
  { value: 'cover_issue', label: 'Cover issue' },
  { value: 'app_bug', label: 'App bug' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
];

export function readCachedHelpSafetyConfig() {
  try {
    const raw = sessionStorage.getItem(HELP_SAFETY_CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedHelpSafetyConfig(config) {
  try {
    if (!config) {
      sessionStorage.removeItem(HELP_SAFETY_CONFIG_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(HELP_SAFETY_CONFIG_CACHE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export async function getHelpSafetyConfig(token) {
  if (!token) return null;
  try {
    const data = await request('/api/mobile/help-safety/config', { token });
    return data?.config ?? null;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error('Could not load help options.');
    }
    throw error;
  }
}

export function getSupportContactConfig(config) {
  return {
    supportPhone: config?.supportPhone || null,
    supportEmail: config?.supportEmail || null,
    emergencyPhone: config?.emergencyPhone || null,
    supportHours: config?.supportHours || null,
    claimsGuideVersion: config?.claimsGuideVersion || '1',
  };
}

export async function getTrustedContactsForEmergency(token) {
  return getTrustedContacts(token);
}

export async function getTrustedContactDialUrl(token, contactId) {
  const data = await request(`/api/mobile/trusted-contacts/${contactId}/dial`, { token });
  return data?.dialUrl || null;
}

export async function createSupportReport(token, payload) {
  const data = await request('/api/mobile/support-reports', {
    method: 'POST',
    token,
    body: payload,
  });
  return data?.report ?? null;
}
