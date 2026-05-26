import { request } from '../api/safeApi.js';

export const CLAIMS_CACHE_KEY = 'safe_claims_cache';
export const CLAIM_DRAFT_SESSION_KEY = 'safe_claim_draft_session';

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export function readCachedClaims() {
  try {
    const raw = sessionStorage.getItem(CLAIMS_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedClaims(payload) {
  try {
    if (!payload) {
      sessionStorage.removeItem(CLAIMS_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(CLAIMS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readLocalClaimDraft() {
  try {
    const raw = sessionStorage.getItem(CLAIM_DRAFT_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeLocalClaimDraft(draft) {
  try {
    if (!draft) {
      sessionStorage.removeItem(CLAIM_DRAFT_SESSION_KEY);
      return;
    }
    sessionStorage.setItem(CLAIM_DRAFT_SESSION_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export async function getClaims(token) {
  const data = await request('/api/mobile/claims', { token });
  return data?.claims ?? [];
}

export async function getClaimDetail(token, claimId) {
  const data = await request(`/api/mobile/claims/${claimId}`, { token });
  return data?.claim ?? null;
}

export async function getClaimEligibility(token) {
  const data = await request('/api/mobile/claims/eligibility', { token });
  return {
    covers: data?.covers ?? [],
    uploadEnabled: Boolean(data?.uploadEnabled),
    claimWindowHours: data?.claimWindowHours ?? 168,
  };
}

export async function createClaimDraft(token, tripCoverId) {
  const data = await request('/api/mobile/claims', {
    method: 'POST',
    token,
    body: { tripCoverId },
  });
  return data?.claim ?? null;
}

export async function updateClaimDraft(token, claimId, payload) {
  const data = await request(`/api/mobile/claims/${claimId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
  return data?.claim ?? null;
}

export async function submitClaim(token, claimId) {
  const data = await request(`/api/mobile/claims/${claimId}/submit`, {
    method: 'POST',
    token,
  });
  return { claim: data?.claim ?? null, duplicate: data?.duplicate ?? null };
}

export async function uploadClaimDocument(token, claimId, { type, filename }) {
  const data = await request(`/api/mobile/claims/${claimId}/documents`, {
    method: 'POST',
    token,
    body: { type, filename },
  });
  return data?.document ?? null;
}

export async function getClaimDuplicateCheck(token, payload) {
  const data = await request('/api/mobile/claims/duplicate-check', {
    method: 'POST',
    token,
    body: payload,
  });
  return data;
}

export async function loadClaimsBundle(token) {
  const claims = await getClaims(token);
  return { claims };
}

export function isClaimsNetworkError(error) {
  return isNetworkError(error);
}
