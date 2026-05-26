import { request } from '../api/safeApi.js';

const QR_CACHE_KEY = 'safe_qr_verify_cache';

export function normalizeQrCodeInput(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';

  try {
    if (/^safe:\/\/vehicle\//i.test(trimmed)) {
      return decodeURIComponent(trimmed.replace(/^safe:\/\/vehicle\//i, '').split(/[?#]/)[0] ?? '').trim();
    }
    if (/^https?:\/\//i.test(trimmed)) {
      const url = new URL(trimmed);
      const hashPart = url.hash.replace(/^#/, '');
      if (hashPart.startsWith('qr/')) {
        return decodeURIComponent(hashPart.slice(3).split(/[?#]/)[0] ?? '').trim();
      }
      const pathParts = url.pathname.split('/').filter(Boolean);
      const qIndex = pathParts.findIndex((part) => part.toLowerCase() === 'q');
      if (qIndex >= 0 && pathParts[qIndex + 1]) {
        return decodeURIComponent(pathParts[qIndex + 1]).trim();
      }
      const last = pathParts[pathParts.length - 1];
      if (last && last.toLowerCase() !== 'q') return decodeURIComponent(last).trim();
    }
  } catch {
    /* fall through */
  }

  return trimmed;
}

export function readCachedQrVerify() {
  try {
    const raw = sessionStorage.getItem(QR_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCachedQrVerify(payload) {
  try {
    if (payload == null) {
      sessionStorage.removeItem(QR_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(QR_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export async function verifyQrCode(token, code, { approximateLat, approximateLng } = {}) {
  const data = await request('/api/mobile/qr/scan', {
    method: 'POST',
    token,
    body: {
      code,
      ...(approximateLat != null ? { approximateLat } : {}),
      ...(approximateLng != null ? { approximateLng } : {}),
    },
  });
  if (data.status === 'verified') {
    writeCachedQrVerify(data);
  }
  return data;
}

export function toCoverVehicleContext(qrResult) {
  if (!qrResult || qrResult.status !== 'verified') return null;
  return {
    qrCodeId: qrResult.qrCodeId,
    verifiedAt: qrResult.verifiedAt,
    coverEligibility: qrResult.coverEligibility,
    vehicle: {
      id: qrResult.vehicle.id,
      plateNumber: qrResult.vehicle.plateNumber,
      busId: null,
    },
    route: qrResult.route
      ? {
          id: qrResult.route.id,
          origin: qrResult.route.originLabel,
          destination: qrResult.route.destinationLabel,
        }
      : null,
    partner: qrResult.partner ?? null,
  };
}

export function formatVerifiedTime(iso) {
  if (!iso) return 'Just now';
  try {
    return new Date(iso).toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'Just now';
  }
}

export function invalidReasonLabel(reason) {
  const key = String(reason || 'invalid').toLowerCase();
  if (key.includes('expired')) return 'expired';
  if (key.includes('disabled')) return 'disabled';
  if (key.includes('vehicle')) return 'vehicle not found';
  return 'invalid';
}
