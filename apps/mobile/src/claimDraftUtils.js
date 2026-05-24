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

// TODO(backend): POST multipart files to /api/mobile/claims/documents and store returned file IDs.
