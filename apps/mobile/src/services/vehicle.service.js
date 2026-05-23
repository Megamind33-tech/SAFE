import { apiRequest, getToken } from './client.js';

export async function verifyByPlate(plateNumber) {
  return apiRequest('/api/mobile/vehicle/verify', {
    method: 'POST',
    token: getToken(),
    body: { plateNumber },
  });
}

export async function verifyByQR(qrCode) {
  return apiRequest('/api/mobile/vehicle/verify', {
    method: 'POST',
    token: getToken(),
    body: { qrCode },
  });
}
