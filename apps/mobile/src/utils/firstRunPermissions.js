import { requestNotificationPermission } from '../services/notificationPreferences.js';

const PERMISSIONS_INTRO_SEEN_KEY = 'safe_permissions_intro_seen';

export function isAndroidNative() {
  return (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.Capacitor?.getPlatform === 'function' &&
    globalThis.Capacitor.getPlatform() === 'android'
  );
}

export function hasSeenPermissionsIntro() {
  try {
    return localStorage.getItem(PERMISSIONS_INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markPermissionsIntroSeen() {
  try {
    localStorage.setItem(PERMISSIONS_INTRO_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

function parseAndroidMajorVersion(userAgent) {
  const ua = String(userAgent || '');
  const match = ua.match(/Android\s+(\d+)(?:[._]\d+)?/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function shouldRequestRuntimeNotificationPermission() {
  if (typeof navigator === 'undefined') return false;
  const major = parseAndroidMajorVersion(navigator.userAgent);
  return major != null && major >= 13;
}

export async function requestCameraPermission() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return 'unsupported';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch {
      /* ignore */
    }
    return 'granted';
  } catch (err) {
    const name = typeof err === 'object' && err ? err.name : '';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'no_camera';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
    return 'denied';
  }
}

export async function requestLocationPermission() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return 'unsupported';
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err?.code === 1 ? 'denied' : 'prompt'),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

export async function requestNotificationPermissionIfNeeded() {
  if (!shouldRequestRuntimeNotificationPermission()) return 'skipped';
  return requestNotificationPermission();
}
