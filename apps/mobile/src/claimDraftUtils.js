export const EMPTY_CLAIM_DOCUMENTS = {
  accidentPhotos: [],
  medicalDocuments: [],
  policeReports: [],
};

export function createEmptyClaimDraft() {
  return {
    incidentNarrative: '',
    documents: {
      accidentPhotos: [],
      medicalDocuments: [],
      policeReports: [],
    },
  };
}

export const EMPTY_CLAIM_DRAFT = createEmptyClaimDraft();

export function normalizeClaimDocuments(documents) {
  return {
    accidentPhotos: Array.isArray(documents?.accidentPhotos) ? documents.accidentPhotos : [],
    medicalDocuments: Array.isArray(documents?.medicalDocuments) ? documents.medicalDocuments : [],
    policeReports: Array.isArray(documents?.policeReports) ? documents.policeReports : [],
  };
}

export function normalizeClaimDraft(draft) {
  return {
    incidentNarrative: draft?.incidentNarrative || '',
    documents: normalizeClaimDocuments(draft?.documents),
  };
}

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function totalClaimFiles(documents) {
  if (!documents) return 0;
  return Object.values(normalizeClaimDocuments(documents)).reduce(
    (sum, files) => sum + files.length,
    0
  );
}

export function totalReadyClaimFiles(documents) {
  return Object.values(normalizeClaimDocuments(documents))
    .flat()
    .filter((file) => file?.status === 'ready').length;
}

export function validateClaimFile(file) {
  if (!file) return 'Please select a file.';
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return 'File must be JPG, PNG, or PDF under 10MB.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'File must be JPG, PNG, or PDF under 10MB.';
  }
  return null;
}

export function createLocalFileId() {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function buildClaimPolicyId(cover) {
  if (!cover?.id) return null;
  const stamp = cover.createdAt || cover.startedAt;
  const date = stamp ? new Date(stamp) : new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-${ymd}-${cover.id.slice(-4).toUpperCase()}`;
}

export function buildClaimRoute(cover) {
  const route = cover?.route ?? cover?.vehicle?.route ?? null;
  if (!route?.origin || !route?.destination) return null;
  return `${route.origin} → ${route.destination}`;
}

export function readyClaimFiles(documents, categoryKey) {
  return normalizeClaimDocuments(documents)[categoryKey].filter((file) => file.status === 'ready');
}

export function hasUploadInProgress(documents) {
  return Object.values(normalizeClaimDocuments(documents))
    .flat()
    .some((file) => file?.status === 'uploading');
}

export function primaryClaimSlipUrl(documents) {
  const docs = normalizeClaimDocuments(documents);
  const medical = readyClaimFiles(docs, 'medicalDocuments')[0];
  if (medical?.dataUrl) return medical.dataUrl;
  const accident = readyClaimFiles(docs, 'accidentPhotos')[0];
  if (accident?.dataUrl) return accident.dataUrl;
  const police = readyClaimFiles(docs, 'policeReports')[0];
  return police?.dataUrl || undefined;
}

export function buildClaimSubmitPayload(claimDraft, { tripCoverId, policeReference = '' } = {}) {
  const draft = normalizeClaimDraft(claimDraft);
  const docs = draft.documents;
  const readyPolice = readyClaimFiles(docs, 'policeReports');

  return {
    tripCoverId,
    description: draft.incidentNarrative.trim(),
    hospitalSlipUrl: primaryClaimSlipUrl(docs),
    policeReference:
      policeReference.trim() ||
      (readyPolice[0] ? `Police report file: ${readyPolice[0].name}` : undefined),
  };
}

/** @deprecated Legacy claim flow only — never use for production submitted UI. */
export function buildClaimReference(claim) {
  if (!claim?.id) return null;
  const date = claim.createdAt ? new Date(claim.createdAt) : new Date();
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-CLM-${ymd}-${claim.id.slice(-4).toUpperCase()}`;
}

export function formatClaimStatusLabel(status) {
  const normalized = String(status || 'submitted').toLowerCase();
  const labels = {
    submitted: 'Submitted',
    processing: 'Processing',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
  };
  return labels[normalized] || 'Submitted';
}

export function formatClaimReviewStage(status) {
  const normalized = String(status || 'submitted').toLowerCase();
  if (normalized === 'submitted' || normalized === 'processing') return 'Pending review';
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  if (normalized === 'paid') return 'Paid';
  return 'Pending review';
}

// TODO(backend): POST multipart files to /api/mobile/claims/documents and store returned file IDs.
