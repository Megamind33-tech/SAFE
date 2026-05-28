import { loadToken, request } from '../api/safeApi.js';
import { getPaymentMethods } from './paymentMethods.js';

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
    lastEndedCover: data?.lastEndedCover ?? null,
    pendingCover: data?.pendingCover ?? null,
    trip: data?.trip ?? null,
    capabilities: data?.capabilities ?? {},
  };
}

export async function purchaseCover(token, payload) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
  const res = await fetch(`${API_BASE}/api/mobile/cover/purchase`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 501 && data?.purchase?.status === 'not_configured') {
    return data;
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function fetchPurchaseStatus(token, purchaseId) {
  const data = await request(`/api/mobile/cover/purchase/${purchaseId}/status`, { token });
  return data;
}

export async function loadCoverScreenBundle(token) {
  const [plansRes, activeRes, paymentMethods] = await Promise.all([
    fetchCoverPlans(token),
    fetchCoverActive(token),
    getPaymentMethods(token).catch(() => []),
  ]);
  const defaultPaymentMethod =
    paymentMethods.find((m) => m.isDefault) ?? paymentMethods[0] ?? null;
  return {
    plans: plansRes.plans,
    capabilities: { ...plansRes.capabilities, ...activeRes.capabilities },
    activeCover: activeRes.cover,
    lastEndedCover: activeRes.lastEndedCover,
    pendingCover: activeRes.pendingCover,
    trip: activeRes.trip,
    defaultPaymentMethod,
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

export function formatCoverPeriod(startsAt, endsAt) {
  if (!startsAt && !endsAt) return null;
  const fmt = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  const start = fmt(startsAt);
  const end = fmt(endsAt);
  if (start && end) return `${start} to ${end}`;
  return start || end || null;
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
  const raw = plan.price ?? plan.amount ?? plan.priceZmw ?? null;
  const value = raw == null ? NaN : Number(raw);
  if (!Number.isFinite(value) || value <= 0) return 'Price unavailable';
  return `K${value}`;
}

export function estimateEndsAt(durationMinutes) {
  const end = new Date(Date.now() + durationMinutes * 60_000);
  return formatCoverEnds(end.toISOString());
}
