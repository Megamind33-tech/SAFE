import { apiRequest, getToken } from './client.js';

export async function confirmPayment(paymentId) {
  return apiRequest('/api/mobile/payment/confirm', {
    method: 'POST',
    token: getToken(),
    body: { paymentId },
  });
}

export async function getPaymentStatus(paymentId) {
  return apiRequest(`/api/mobile/payment/${paymentId}/status`, {
    token: getToken(),
  });
}
