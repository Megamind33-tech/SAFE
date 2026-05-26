/** QA-only helpers for QR screenshot capture. */
export const isQrQaCapture =
  import.meta.env.DEV && import.meta.env.VITE_QR_QA_CAPTURE === 'true';

const QA_MODE_KEY = 'safe_qa_qr_mode';
const QA_CODE_KEY = 'safe_qa_qr_code';
const QA_RESULT_KEY = 'safe_qa_qr_result';

export function readQrQaMode() {
  if (!isQrQaCapture) return null;
  return sessionStorage.getItem(QA_MODE_KEY);
}

export function setQrQaMode(mode) {
  if (!isQrQaCapture || !mode) return;
  sessionStorage.setItem(QA_MODE_KEY, mode);
}

export function clearQrQaMode() {
  if (!isQrQaCapture) return;
  sessionStorage.removeItem(QA_MODE_KEY);
}

export function readQrQaCode() {
  if (!isQrQaCapture) return '';
  return sessionStorage.getItem(QA_CODE_KEY) || '';
}

export function setQrQaCode(code) {
  if (!isQrQaCapture) return;
  sessionStorage.setItem(QA_CODE_KEY, code || '');
}

export function readQrQaResult() {
  if (!isQrQaCapture) return null;
  try {
    const raw = sessionStorage.getItem(QA_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setQrQaResult(result) {
  if (!isQrQaCapture) return;
  sessionStorage.setItem(QA_RESULT_KEY, JSON.stringify(result));
}

export function clearQrQaResult() {
  if (!isQrQaCapture) return;
  sessionStorage.removeItem(QA_RESULT_KEY);
}
