import { loadToken, request } from '../api/safeApi.js';

export const COVER_SCREEN_CACHE_KEY = 'safe_cover_screen_cache';

export function readCachedCoverScreen() {
  try {
    const raw = sessionStorage.getItem(COVER_SCREEN_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedCoverScreen(bundle) {
  try {
    if (!bundle) {
      sessionStorage.removeItem(COVER_SCREEN_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(COVER_SCREEN_CACHE_KEY, JSON.stringify(bundle));
  } catch {
    /* ignore */
  }
}

export async function fetchCoverPlans(token) {
  const data = await request('/api/mobile/cover/plans', { token });
  return {
    plans: data?.plans ?? [],
    capabilities: data?.capabilities ?? {},
  };
}

export async function fetchCoverActive(token) {
  const data = await request('/api/mobile/cover/active', { token });
  return {
    cover: data?.cover ?? null,
    pendingCover: data?.pendingCover ?? null,
    capabilities: data?.capabilities ?? {},
  };
}

export async function purchaseCover(token, payload) {
  const data = await request('/api/mobile/cover/purchase', {
    method: 'POST',
    token,
    body: payload,
  });
  return data;
}

export async function fetchPurchaseStatus(token, purchaseId) {
  const data = await request(`/api/mobile/cover/purchase/${purchaseId}/status`, { token });
  return data;
}

export async function loadCoverScreenBundle(token) {
  const [plansRes, activeRes] = await Promise.all([
    fetchCoverPlans(token),
    fetchCoverActive(token),
  ]);
  return {
    plans: plansRes.plans,
    capabilities: { ...plansRes.capabilities, ...activeRes.capabilities },
    activeCover: activeRes.cover,
    pendingCover: activeRes.pendingCover,
  };
}

export function isCoverActive(cover) {
  if (!cover) return false;
  if (cover.status === 'pending' || cover.paymentStatus === 'pending') return false;
  if (cover.status === 'expired') return false;
  if (cover.endsAt && new Date(cover.endsAt) <= new Date()) return false;
  return cover.status === 'active';
}

export function isCoverExpired(cover) {
  if (!cover) return false;
  if (cover.status === 'expired') return true;
  if (cover.endsAt && new Date(cover.endsAt) <= new Date()) return true;
  return false;
}

export function formatTimeRemaining(endsAt) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMins = Math.floor(diff / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `${hours}h ${mins}m left`;
  if (totalMins > 0) return `${totalMins}m left`;
  const secs = Math.floor(diff / 1000);
  return secs > 0 ? `${secs}s left` : null;
}

export function formatCoverEnds(endsAt) {
  if (!endsAt) return '';
  const end = new Date(endsAt);
  const now = new Date();
  const sameDay =
    end.getDate() === now.getDate() &&
    end.getMonth() === now.getMonth() &&
    end.getFullYear() === now.getFullYear();
  const time = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return end.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDurationLabel(minutes) {
  if (!minutes) return '';
  if (minutes >= 24 * 60) {
    const days = Math.round(minutes / (24 * 60));
    return days === 1 ? '1 day' : `${days} days`;
  }
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${hrs}h`;
    return `${hrs}h ${rem}m`;
  }
  return `${minutes}m`;
}

export function formatPrice(plan) {
  if (!plan) return '';
  return `K${plan.price}`;
}

export function estimateEndsAt(durationMinutes) {
  const end = new Date(Date.now() + durationMinutes * 60_000);
  return formatCoverEnds(end.toISOString());
}
