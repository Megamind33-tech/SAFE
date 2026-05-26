import { loadToken, request } from '../api/safeApi.js';

export const HOME_SUMMARY_CACHE_KEY = 'safe_home_summary_cache';

function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|network|load failed|networkerror/i.test(message);
}

export function readCachedHomeSummary() {
  try {
    const raw = sessionStorage.getItem(HOME_SUMMARY_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeCachedHomeSummary(summary) {
  try {
    if (!summary) {
      sessionStorage.removeItem(HOME_SUMMARY_CACHE_KEY);
      return;
    }
    sessionStorage.setItem(HOME_SUMMARY_CACHE_KEY, JSON.stringify(summary));
  } catch {
    /* ignore */
  }
}

export async function fetchHomeSummary(token) {
  const data = await request('/api/mobile/home-summary', { token });
  return data?.summary ?? null;
}

export async function getHomeSummary(token = loadToken()) {
  if (!token) return null;
  return fetchHomeSummary(token);
}

export function getActiveCover(summary) {
  return summary?.activeCover ?? null;
}

export function getDisplayCover(summary) {
  return summary?.displayCover ?? summary?.activeCover ?? null;
}

export function getRecentClaims(summary) {
  return summary?.latestClaim ? [summary.latestClaim] : [];
}

export function getRecentActivity(summary) {
  return Array.isArray(summary?.recentActivity) ? summary.recentActivity : [];
}

export function getActiveTrip(summary) {
  return summary?.activeTrip ?? null;
}

export function getHomeMapData(summary) {
  const trip = summary?.activeTrip;
  if (!trip?.mapTrip) return null;
  return trip.mapTrip;
}

export function isCoverActive(cover) {
  if (!cover) return false;
  if (cover.paymentStatus === 'pending' || cover.status === 'pending') return false;
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

export function isPaymentPending(cover) {
  if (!cover) return false;
  return cover.paymentStatus === 'pending' || cover.status === 'pending';
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

export function greetingForUser(fullName) {
  if (!fullName) return 'Welcome back';
  const first = fullName.trim().split(/\s+/)[0];
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${period}, ${first}`;
}

export function formatClaimStatus(status) {
  if (!status) return 'Submitted';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatActivityWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export { isNetworkError };
