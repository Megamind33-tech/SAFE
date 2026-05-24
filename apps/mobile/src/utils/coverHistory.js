import { buildClaimPolicyId } from '../claimDraftUtils.js';
import { formatPlanLabel } from '../hooks/useActiveTrip.js';

export function getEffectiveCoverStatus(cover) {
  if (!cover) return 'expired';
  if (cover.endsAt && new Date(cover.endsAt) <= new Date()) return 'expired';
  return cover.status || 'expired';
}

export function isEffectivelyActiveCover(cover) {
  return getEffectiveCoverStatus(cover) === 'active';
}

export function formatCoverRouteTitle(cover) {
  const route = cover?.route ?? cover?.vehicle?.route ?? null;
  if (route?.origin && route?.destination) {
    return `${route.origin} to ${route.destination}`;
  }
  return 'Lusaka Commute';
}

export function formatCoverPlanLine(cover) {
  if (!cover?.plan) return 'Cover pending';
  const label = formatPlanLabel(cover.plan);
  const amount = cover.amount != null ? `K${cover.amount}` : null;
  return amount ? `${label} Cover (${amount})` : `${label} Cover`;
}

export function formatCoverVehicle(cover) {
  return cover?.vehicle?.plateNumber || 'Not assigned';
}

export function getCoverPolicyId(cover) {
  return buildClaimPolicyId(cover) || 'Pending';
}

export function formatPolicyIdListDisplay(policyId, maxLen = 22) {
  const value = policyId || 'Pending';
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…`;
}

export function formatCoverDateParts(cover) {
  const stamp = cover?.createdAt || cover?.startedAt;
  const date = stamp ? new Date(stamp) : new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    day: String(date.getDate()),
    month: months[date.getMonth()],
    year: String(date.getFullYear()),
  };
}

export function formatCoverDateTime(iso) {
  if (!iso) return 'Pending';
  return new Date(iso).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mapCoverHistoryItem(cover, claimsList = []) {
  const claim = claimsList.find((c) => c.tripCoverId === cover.id) ?? null;
  const effectiveStatus = getEffectiveCoverStatus(cover);

  let statusType = 'expired';
  let statusLabel = 'Expired';

  if (claim) {
    statusType = 'claim';
    statusLabel = 'Claim';
  } else if (effectiveStatus === 'active') {
    statusType = 'active';
    statusLabel = 'Active';
  }

  const { day, month, year } = formatCoverDateParts(cover);

  return {
    id: cover.id,
    cover,
    claim,
    day,
    month,
    year,
    routeTitle: formatCoverRouteTitle(cover),
    vehicle: formatCoverVehicle(cover),
    planLine: formatCoverPlanLine(cover),
    policyId: getCoverPolicyId(cover),
    statusType,
    statusLabel,
    effectiveStatus,
    hasClaim: Boolean(claim),
  };
}

export function buildCoverHistoryItems(coversHistory = [], claimsList = []) {
  const covers = Array.isArray(coversHistory) ? coversHistory : [];
  return covers.map((cover) => mapCoverHistoryItem(cover, claimsList));
}

export function filterCoverHistoryItems(items, filter) {
  if (filter === 'All') return items;
  if (filter === 'Active') return items.filter((item) => item.effectiveStatus === 'active');
  if (filter === 'Expired') return items.filter((item) => item.effectiveStatus !== 'active');
  if (filter === 'Claims') return items.filter((item) => item.hasClaim);
  return items;
}
