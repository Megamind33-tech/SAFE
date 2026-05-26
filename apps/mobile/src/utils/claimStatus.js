const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  needs_action: 'Needs action',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  cancelled: 'Cancelled',
  processing: 'Under review',
  needs_documents: 'Needs action',
};

const STATUS_PILL_CLASS = {
  draft: 'claims-pill--draft',
  submitted: 'claims-pill--submitted',
  under_review: 'claims-pill--review',
  needs_action: 'claims-pill--action',
  approved: 'claims-pill--approved',
  rejected: 'claims-pill--rejected',
  paid: 'claims-pill--paid',
  cancelled: 'claims-pill--cancelled',
  processing: 'claims-pill--review',
  needs_documents: 'claims-pill--action',
};

export function normalizeClaimStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'processing') return 'under_review';
  if (s === 'needs_documents') return 'needs_action';
  return s;
}

export function claimStatusLabel(status) {
  const key = normalizeClaimStatus(status);
  return STATUS_LABELS[key] || 'Submitted';
}

export function claimStatusPillClass(status) {
  const key = normalizeClaimStatus(status);
  return STATUS_PILL_CLASS[key] || 'claims-pill--submitted';
}

export function isActiveClaimStatus(status) {
  const key = normalizeClaimStatus(status);
  return ['draft', 'submitted', 'under_review', 'needs_action'].includes(key);
}

export function formatIncidentDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function formatUpdatedAt(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
