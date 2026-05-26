import { request } from '../api/safeApi.js';

export const NOTIFICATION_PREFERENCES_CACHE_KEY = 'safe_notification_preferences_cache';

export const PREFERENCE_KEYS = [
  'coverExpiryReminders',
  'claimStatusUpdates',
  'paymentUpdates',
  'safetyEmergencyAlerts',
  'coverPurchaseConfirmations',
  'tripTimerAlerts',
  'savedPolicyUpdates',
  'trustedContactChanges',
  'emergencyContactAlerts',
  'productUpdates',
  'offersPromotions',
  'pushEnabled',
  'smsEnabled',
  'emailEnabled',
  'quietHoursEnabled',
];

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export function readCachedNotificationPreferences() {
  try {
    const raw = sessionStorage.getItem(NOTIFICATION_PREFERENCES_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedNotificationPreferences(preferences) {
  try {
    if (!preferences) {
      sessionStorage.removeItem(NOTIFICATION_PREFERENCES_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(NOTIFICATION_PREFERENCES_CACHE_KEY, JSON.stringify(preferences));
  } catch {
    /* ignore */
  }
}

export function getNotificationPermissionState() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

export async function getNotificationPreferences(token) {
  if (!token) return null;
  try {
    const data = await request('/api/mobile/notification-preferences', { token });
    return data?.preferences ?? null;
  } catch (error) {
    if (isNetworkError(error)) {
      throw new Error('Could not load notification settings.');
    }
    throw error;
  }
}

export async function updateNotificationPreferences(token, payload) {
  const data = await request('/api/mobile/notification-preferences', {
    method: 'PATCH',
    token,
    body: payload,
  });
  return data?.preferences ?? null;
}

export async function updateNotificationPreference(token, key, value) {
  return updateNotificationPreferences(token, { [key]: value });
}

export async function notifyPermissionRequested(token, granted) {
  const data = await request('/api/mobile/notification-preferences/permission-requested', {
    method: 'POST',
    token,
    body: { granted },
  });
  return data?.preferences ?? null;
}
