import QRCodeLib from 'qrcode';
import { buildQrDeepLink, buildQrPublicUrl } from './qrCodes.js';

export async function generateQrSvg(code: string) {
  const payload = buildQrPublicUrl(code);
  return QRCodeLib.toString(payload, {
    type: 'svg',
    margin: 1,
    width: 256,
    color: {
      dark: '#007A3D',
      light: '#FFFFFF',
    },
  });
}

export async function generateQrPngDataUrl(code: string) {
  const payload = buildQrPublicUrl(code);
  return QRCodeLib.toDataURL(payload, {
    margin: 1,
    width: 256,
    color: {
      dark: '#007A3D',
      light: '#FFFFFF',
    },
  });
}

export function serializeQrRecord(record: { id: string; code: string; status: string; vehicleId: string | null; expiresAt: Date | null; lastScannedAt: Date | null }) {
  return {
    id: record.id,
    code: record.code,
    status: record.status,
    vehicleId: record.vehicleId,
    publicUrl: buildQrPublicUrl(record.code),
    deepLink: buildQrDeepLink(record.code),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    lastScannedAt: record.lastScannedAt?.toISOString() ?? null,
  };
}
