/** QA-only helpers for claims screenshot capture. Never active in production builds. */
export const isClaimsQaCapture =
  import.meta.env.DEV && import.meta.env.VITE_CLAIMS_QA_CAPTURE === 'true';

const QA_OPEN_CLAIM_FLOW_KEY = 'safe_qa_open_claim_flow';
const QA_SUBMITTED_CLAIM_KEY = 'safe_qa_submitted_claim';

export function readQaOpenClaimFlowFlag() {
  if (!isClaimsQaCapture) return false;
  return sessionStorage.getItem(QA_OPEN_CLAIM_FLOW_KEY) === '1';
}

export function clearQaOpenClaimFlowFlag() {
  if (!isClaimsQaCapture) return;
  sessionStorage.removeItem(QA_OPEN_CLAIM_FLOW_KEY);
}

export function setQaOpenClaimFlowFlag() {
  if (!isClaimsQaCapture) return;
  sessionStorage.setItem(QA_OPEN_CLAIM_FLOW_KEY, '1');
}

export function readQaSubmittedClaimId() {
  if (!isClaimsQaCapture) return null;
  return sessionStorage.getItem(QA_SUBMITTED_CLAIM_KEY);
}

export function setQaSubmittedClaimId(claimId) {
  if (!isClaimsQaCapture || !claimId) return;
  sessionStorage.setItem(QA_SUBMITTED_CLAIM_KEY, String(claimId));
}

export function clearQaSubmittedClaimId() {
  if (!isClaimsQaCapture) return;
  sessionStorage.removeItem(QA_SUBMITTED_CLAIM_KEY);
}
