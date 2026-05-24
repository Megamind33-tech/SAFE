export const EMPTY_CLAIM_DOCUMENTS = {
  accidentPhotos: [],
  medicalDocuments: [],
  policeReports: [],
};

export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function totalClaimFiles(documents) {
  if (!documents) return 0;
  return Object.values(documents).reduce((sum, files) => sum + (files?.length || 0), 0);
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
  return (documents?.[categoryKey] || []).filter((file) => file.status === 'ready');
}

export function hasUploadInProgress(documents) {
  return Object.values(documents || {})
    .flat()
    .some((file) => file?.status === 'uploading');
}

// TODO(backend): POST multipart files to /api/mobile/claims/documents and store returned file IDs.
