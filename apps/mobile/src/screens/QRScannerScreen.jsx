import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, CameraOff } from 'lucide-react';
import { invalidReasonLabel, normalizeQrCodeInput, readCachedQrVerify, verifyQrCode } from '../services/qr.js';

const READER_ID = 'qr-reader';

function extractCodeFromScan(decodedText) {
  return normalizeQrCodeInput(decodedText);
}

export default function QRScannerScreen({
  session,
  setScreen,
  onVerified,
  initialMode = 'scan',
  initialCode = '',
  qaForcePermission = false,
  qaForceDenied = false,
}) {
  const [mode, setMode] = useState(initialMode);
  const [permission, setPermission] = useState(qaForceDenied ? 'denied' : qaForcePermission ? 'prompt' : 'checking');
  const [manualCode, setManualCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalidState, setInvalidState] = useState(null);
  const scannerRef = useRef(null);
  const handledRef = useRef(false);

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      scanner.clear();
    } catch {
      /* ignore cleanup errors */
    }
  }, []);

  const handleVerify = useCallback(
    async (rawCode) => {
      const code = extractCodeFromScan(rawCode);
      if (!code) {
        setError('Enter a valid vehicle code.');
        return;
      }
      setBusy(true);
      setError('');
      setInvalidState(null);
      try {
        const result = await verifyQrCode(session.token, code);
        if (result.status === 'verified') {
          await stopScanner();
          onVerified?.(result);
          setScreen('vehicleVerified');
          return;
        }
        setInvalidState(result);
      } catch (err) {
        if (!readCachedQrVerify()) {
          setInvalidState({ status: 'invalid', reason: 'invalid' });
        } else {
          setError(err.message || 'This QR code could not be verified.');
        }
      } finally {
        setBusy(false);
      }
    },
    [onVerified, session.token, setScreen, stopScanner],
  );

  useEffect(() => {
    if (mode !== 'scan' || qaForcePermission || qaForceDenied) return undefined;

    let cancelled = false;
    const scanner = new Html5Qrcode(READER_ID, { verbose: false });
    scannerRef.current = scanner;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          if (!cancelled) setPermission('unsupported');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        if (cancelled) return;
        setPermission('granted');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 8, qrbox: { width: 220, height: 220 } },
          async (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            await handleVerify(decodedText);
            handledRef.current = false;
          },
          () => {},
        );
      } catch (err) {
        if (cancelled) return;
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPermission('denied');
        } else {
          setPermission('unsupported');
          setError('Camera is not available on this device.');
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [handleVerify, mode, qaForceDenied, qaForcePermission, stopScanner]);

  if (invalidState && invalidState.status !== 'verified') {
    const reason = invalidReasonLabel(invalidState.reason || invalidState.status);
    return (
      <main className="screen qr-screen">
        <div className="qr-screen__scroll">
          <header className="qr-header">
            <button type="button" className="qr-header__back" onClick={() => setInvalidState(null)}>
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
            <h1 className="qr-header__title">Scan vehicle QR</h1>
          </header>
          <section className="qr-error-card" aria-live="assertive">
            <h2>This QR code could not be verified.</h2>
            <p>Check the code on the vehicle sticker and try again.</p>
            <ul className="qr-error-reasons">
              <li>Reason: {reason}</li>
            </ul>
            <div className="qr-actions">
              <button type="button" className="qr-btn qr-btn--primary" onClick={() => setInvalidState(null)}>
                Try again
              </button>
              <button
                type="button"
                className="qr-btn qr-btn--secondary"
                onClick={() => {
                  setInvalidState(null);
                  setMode('manual');
                }}
              >
                Enter code manually
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="screen qr-screen">
      <div className="qr-screen__scroll">
        <header className="qr-header">
          <button type="button" className="qr-header__back" onClick={() => setScreen('profile')}>
            <ArrowLeft size={16} aria-hidden="true" />
            Back
          </button>
          <h1 className="qr-header__title">{mode === 'manual' ? 'Enter vehicle code' : 'Scan vehicle QR'}</h1>
        </header>

        {mode === 'scan' ? (
          <>
            <h2 className="qr-intro__title">Scan vehicle QR</h2>
            <p className="qr-intro__sub">Scan the SAFE QR inside the vehicle to verify your trip.</p>
            <div className="qr-scanner-frame" aria-label="QR scanner">
              {permission === 'prompt' || permission === 'checking' ? (
                <div className="qr-scanner-placeholder">
                  <CameraOff size={36} aria-hidden="true" />
                  <p>Camera permission needed</p>
                  <p>Allow camera access to scan the vehicle QR code.</p>
                </div>
              ) : null}
              {permission === 'denied' || permission === 'unsupported' ? (
                <div className="qr-scanner-placeholder">
                  <CameraOff size={36} aria-hidden="true" />
                  <p>{permission === 'denied' ? 'Camera access denied' : 'Camera not available'}</p>
                  <p>Use manual entry to verify your vehicle code.</p>
                  <button type="button" className="qr-btn qr-btn--secondary" onClick={() => setMode('manual')}>
                    Enter vehicle code
                  </button>
                </div>
              ) : null}
              <div id={READER_ID} />
            </div>
            <div className="qr-link-row">
              <button type="button" className="qr-btn qr-btn--text" onClick={() => setMode('manual')}>
                Enter vehicle code
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="qr-intro__title">Enter vehicle code</h2>
            <p className="qr-intro__sub">Type the code shown on the SAFE sticker inside the vehicle.</p>
            <form
              className="qr-manual-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(manualCode);
              }}
            >
              <label htmlFor="qr-manual-code">Vehicle code</label>
              <input
                id="qr-manual-code"
                type="text"
                placeholder="SAFE-LSK-XXXXXX"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="qr-btn qr-btn--primary" disabled={busy}>
                {busy ? 'Verifying…' : 'Verify code'}
              </button>
              <button type="button" className="qr-btn qr-btn--text" onClick={() => setMode('scan')}>
                Back to scanner
              </button>
            </form>
          </>
        )}

        {error ? (
          <div className="qr-status-card qr-status-card--error" role="alert">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
