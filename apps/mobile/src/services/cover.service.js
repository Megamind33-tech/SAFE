import { apiRequest, getToken } from './client.js';

export async function getCoverProducts() {
  return apiRequest('/api/cover-products');
}

export async function getActiveCover() {
  return apiRequest('/api/mobile/cover/active', { token: getToken() });
}

export async function getCoverHistory() {
  return apiRequest('/api/mobile/cover/history', { token: getToken() });
}

export async function purchaseCover({ coverProductId, vehicleId, paymentMethod }) {
  return apiRequest('/api/mobile/cover/buy', {
    method: 'POST',
    token: getToken(),
    body: { coverProductId, vehicleId, paymentMethod },
  });
}
