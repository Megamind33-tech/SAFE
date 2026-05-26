import { normalizeQrCodeInput } from '../services/qr.js';

const CODE_PATTERN = /^SAFE-[A-Z0-9-]+$/i;

function isValidQrToken(code) {
  return Boolean(code) && CODE_PATTERN.test(code);
}

/**
 * Extract a SAFE vehicle QR token from the current browser location.
 * Supports:
 * - /q/SAFE-LSK-8KJ29X
 * - #qr/SAFE-LSK-8KJ29X
 * - full https://safe.co.zm/q/... or safe://vehicle/... via normalizeQrCodeInput
 */
export function extractQrCodeFromLocation(location = window.location) {
  if (typeof window === 'undefined') return null;

  const pathnameMatch = location.pathname.match(/\/q\/([^/?#]+)/i);
  if (pathnameMatch?.[1]) {
    const code = normalizeQrCodeInput(decodeURIComponent(pathnameMatch[1]));
    if (isValidQrToken(code)) return code;
  }

  const hash = (location.hash || '').replace(/^#/, '');
  const hashBase = hash.split('?')[0];
  if (hashBase.startsWith('qr/')) {
    const code = normalizeQrCodeInput(decodeURIComponent(hashBase.slice(3)));
    if (isValidQrToken(code)) return code;
  }

  const href = location.href || '';
  if (/^safe:\/\/vehicle\//i.test(href) || /^https?:\/\//i.test(href)) {
    const code = normalizeQrCodeInput(href);
    if (isValidQrToken(code)) return code;
  }

  return null;
}

/** Remove launch tokens from the address bar after the app has consumed them. */
export function replaceLocationAfterQrLaunch() {
  if (typeof window === 'undefined') return;
  const { pathname, search, hash } = window.location;
  let nextPath = pathname;
  let nextHash = hash;

  if (/\/q\/[^/?#]+/i.test(pathname)) {
    nextPath = '/';
  }
  if (hash.replace(/^#/, '').startsWith('qr/')) {
    nextHash = '';
  }

  const next = `${nextPath}${search || ''}${nextHash || ''}` || '/';
  window.history.replaceState(null, '', next);
}
