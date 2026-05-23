import { apiRequest, getToken } from './client.js';

export async function submitClaim({ tripCoverId, description, policeReference }) {
  return apiRequest('/api/mobile/claims/create', {
    method: 'POST',
    token: getToken(),
    body: { tripCoverId, description, policeReference: policeReference || undefined },
  });
}

export async function listClaims() {
  return apiRequest('/api/mobile/claims', { token: getToken() });
}
