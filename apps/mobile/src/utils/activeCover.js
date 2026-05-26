import { formatPlanLabel } from '../hooks/useActiveTrip.js';

export function isActiveCover(cover) {
  if (!cover) return false;
  if (cover.paymentStatus === 'pending' || cover.status === 'pending') return false;
  if (cover.status && cover.status !== 'active') return false;
  if (cover.endsAt && new Date(cover.endsAt) <= new Date()) return false;
  return true;
}

/** Single source of truth for active cover across Cover, Claims, Profile, and claim flow. */
export function resolveActiveCover(activeCoverState, coversHistory = []) {
  if (activeCoverState) {
    return activeCoverState;
  }

  const history = Array.isArray(coversHistory) ? coversHistory : [];
  return history.find((cover) => isActiveCover(cover)) ?? null;
}

export function resolveCurrentPlanLabel(activeCover) {
  if (!activeCover?.plan) return 'None';
  return formatPlanLabel(activeCover.plan);
}

export function resolveTripsCoveredCount(coversHistory = [], user) {
  const fromUser = user?.stats?.tripsCovered ?? user?.passengerProfile?.tripsCovered;
  if (typeof fromUser === 'number' && Number.isFinite(fromUser)) return fromUser;
  if (!Array.isArray(coversHistory)) return 0;
  return coversHistory.length;
}

export function resolveClaimsCount(claimsList = [], user) {
  const fromUser = user?.stats?.claimsCount ?? user?.passengerProfile?.claimsCount;
  if (typeof fromUser === 'number' && Number.isFinite(fromUser)) return fromUser;
  if (!Array.isArray(claimsList)) return 0;
  return claimsList.length;
}

export function resolveUserName(user) {
  if (!user) return null;
  const name = user.name?.trim() || user.passengerProfile?.fullName?.trim();
  return name || null;
}

export function isUserVerified(user) {
  if (!user) return false;
  return Boolean(user.phoneVerified || user.emailVerified);
}
