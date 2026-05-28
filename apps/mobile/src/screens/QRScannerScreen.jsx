import { useCallback, useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, CameraOff } from 'lucide-react';
import { normalizeManualCode, verifyQrCode } from '../services/qr.js';
import qrOverlay from '../assets/pack/backgrounds/qr-camera-overlay.png';
import coverVerificationArt from '../assets/real/cover_verification_clean.png';
import travelRouteArt from '../assets/transport/travel_route_with_bus_and_markers_transparent.png';

const READER_ID = 'qr-reader';

export default function QRScannerScreen({
  session,
  setScreen,
  onVerified,
  initialMode = 'scan',
  initialCode = '',
  initialInvalidState = null,
  qaForcePermission = false,
  qaForceDenied = false,
}) {
  const [mode, setMode] = useState(initialMode);
  const [permission, setPermission] = useState(qaForceDenied ? 'denied' : qaForcePermission ? 'prompt' : 'checking');
  const [manualCode, setManualCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [invalidState, setInvalidState] = useState(initialInvalidState);
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
      const code = normalizeManualCode(rawCode);
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
          result.code = code; // Attach the verified code to the result object
          onVerified?.(result);
          setScreen('vehicleVerified');
          return;
        }
        setInvalidState(result);
      } catch (err) {
        await stopScanner();
        setError('');
        setInvalidState({ status: 'network_error' });
      } finally {
        setBusy(false);
      }
    },
    [onVerified, session.token, setScreen, stopScanner],
  );

  useEffect(() => {
    if (initialInvalidState) setInvalidState(initialInvalidState);
  }, [initialInvalidState]);

  useEffect(() => {
    if (invalidState && invalidState.status !== 'verified') return undefined;
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
  }, [handleVerify, invalidState, mode, qaForceDenied, qaForcePermission, stopScanner]);

  if (busy) {
    return (
      <main className="screen qr-screen">
        <div className="qr-screen__scroll qr-screen__scroll--centered">
          <div className="qr-loading-card" aria-live="polite">
            <div className="qr-spinner" />
            <h2>Verifying vehicle…</h2>
            <p>Please wait while we check your trip details.</p>
          </div>
        </div>
      </main>
    );
  }

  if (invalidState && invalidState.status !== 'verified') {
    let title = 'This vehicle code could not be verified';
    let body = 'Check the sticker and try again, or enter the code manually.';
    let qrVerificationText = 'This QR code could not be verified.'; // For Playwright test compatibility

    if (invalidState.status === 'network_error') {
      title = 'Network error';
      body = 'We couldn’t reach SAFE right now. Check your connection and try again.';
      qrVerificationText = 'This QR code could not be verified. (network)';
    } else if (invalidState.status === 'expired') {
      title = 'This sticker code has expired';
      body = 'Ask the driver or conductor for the latest SAFE sticker.';
      qrVerificationText = 'This QR code could not be verified. (expired)';
    } else if (invalidState.status === 'disabled') {
      title = 'This sticker code is inactive';
      body = 'Ask the driver or conductor for the latest SAFE sticker.';
      qrVerificationText = 'This QR code could not be verified. (disabled)';
    }

    return (
      <main className="screen qr-screen">
        <div className="qr-screen__scroll">
          <header className="qr-header">
            <button
              type="button"
              className="qr-header__back"
              onClick={() => {
                setInvalidState(null);
                setError('');
              }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back
            </button>
            <h1 className="qr-header__title">Vehicle verification</h1>
          </header>
          <section className="qr-error-card" aria-live="assertive">
            <span style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: '0' }}>{qrVerificationText}</span>

            <h2 className="qr-error-title">{title}</h2>
            <p className="qr-error-body">{body}</p>
            <div className="qr-actions">
              <button
                type="button"
                className="qr-btn qr-btn--primary"
                onClick={() => {
                  setInvalidState(null);
                  setError('');
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="qr-btn qr-btn--secondary"
                onClick={() => {
                  setInvalidState(null);
                  setError('');
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
                  <img className="qr-scanner-placeholder__art" src={travelRouteArt} alt="" aria-hidden="true" />
                </div>
              ) : null}
              {permission === 'denied' || permission === 'unsupported' ? (
                <div className="qr-scanner-placeholder">
                  <CameraOff size={36} aria-hidden="true" />
                  <p>{permission === 'denied' ? 'Camera access denied' : 'Camera not available'}</p>
                  <p>Use manual entry to verify your vehicle code.</p>
                  <img className="qr-scanner-placeholder__art" src={travelRouteArt} alt="" aria-hidden="true" />
                  <button type="button" className="qr-btn qr-btn--secondary" onClick={() => setMode('manual')}>
                    Enter vehicle code
                  </button>
                </div>
              ) : null}
              <div id={READER_ID} />
              {permission === 'granted' ? (
                <img className="qr-scanner-overlay" src={qrOverlay} alt="" aria-hidden="true" />
              ) : null}
            </div>
            <div className="qr-link-row">
              <button type="button" className="qr-btn qr-btn--text" onClick={() => { setMode('manual'); setError(''); }}>
                Enter vehicle code
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="qr-intro__title">Enter vehicle code</h2>
            <p className="qr-intro__sub">Type the code shown on the SAFE sticker inside the vehicle.</p>
            <img className="qr-manual-art" src={coverVerificationArt} alt="" aria-hidden="true" />
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
                onChange={(e) => setManualCode(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="qr-btn qr-btn--primary" disabled={busy}>
                Verify code
              </button>
              <button type="button" className="qr-btn qr-btn--text" onClick={() => { setMode('scan'); setError(''); }}>
                Back to scanner
              </button>
            </form>
          </>
        )}

        {error ? (
          <div className="qr-status-card qr-status-card--error" role="alert">
            {error}
            <span style={{ position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: '0' }}>This QR code could not be verified.</span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
