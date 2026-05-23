import { apiRequest } from './client.js';

export async function getServerTime() {
  return apiRequest('/api/time');
}
