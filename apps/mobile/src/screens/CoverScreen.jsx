import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, FileText, History } from 'lucide-react';
import {
  formatCoverEnds,
  formatTimeRemaining,
  isCoverActive,
  isCoverExpired,
  loadCoverScreenBundle,
  readCachedCoverScreen,
  writeCachedCoverScreen,
} from '../services/cover.js';
import protectedBusArt from '../assets/transport/green_bus_with_protective_emblem_transparent.png';
import noCoverArt from '../assets/real/no_active_cover_clean.png';
import busHeroCityArt from '../assets/real/bus_hero_city_clean.png';
import coverVerificationArt from '../assets/real/cover_verification_clean.png';

const SAFE_GREEN = '#007A3D';

export default function CoverScreen({
  session,
  setScreen,
  openHistory,
  openClaimFlow,
  onBuyCover,
  onCheckPendingPurchase,
  capabilities: capabilitiesProp,
}) {
  const cached = readCachedCoverScreen();
  const [bundle, setBundle] = useState(cached);
  const [loading, setLoading] = useState(() => !cached);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const token = session?.token || '';

  const activeCover = bundle?.activeCover ?? null;
  const lastEndedCover = bundle?.lastEndedCover ?? null;
  const capabilities = bundle?.capabilities ?? capabilitiesProp ?? {};
  const active = isCoverActive(activeCover);
  const expired = !active && isCoverExpired(lastEndedCover);

  const loadBundle = useCallback(async () => {
    if (!token) {
      setBundle(null);
      setLoading(false);
      writeCachedCoverScreen(null);
      return;
    }

    const had = Boolean(bundleRef.current);
    if (!had) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await loadCoverScreenBundle(token);
      setBundle(next);
      writeCachedCoverScreen(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedCoverScreen()) {
        setSyncWarning('Could not refresh cover. Showing your last saved cover.');
        setLoadError('');
      } else {
        setLoadError('Couldn’t load cover plans');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stored = readCachedCoverScreen();
    if (stored) {
      setBundle(stored);
      setLoading(false);
    }
    loadBundle();
  }, [loadBundle]);

  useEffect(() => {
    if (!activeCover?.endsAt || !active) {
      setTimeLeft(null);
      return undefined;
    }
    const tick = () => setTimeLeft(formatTimeRemaining(activeCover.endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeCover?.endsAt, active]);

  if (loading && !bundle) {
    return (
      <main className="screen cover-flow cover-flow--loading" aria-busy="true">
        <p className="cover-flow__loading">Loading cover…</p>
      </main>
    );
  }

  if (loadError && !bundle) {
    return (
      <main className="screen cover-flow cover-flow--error" aria-live="assertive">
        <header className="cover-flow-header">
          <span className="cover-flow-header__spacer" />
          <h1 className="cover-flow-header__title">Cover</h1>
          <span className="cover-flow-header__spacer" />
        </header>
        <section className="cover-flow-error-card">
          <h2>Couldn’t load cover plans</h2>
          <p>Check your connection and try again.</p>
          <button type="button" className="cover-flow-btn cover-flow-btn--primary" onClick={loadBundle}>
            Retry
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="screen cover-flow">
      <div className="cover-flow__scroll">
        {syncWarning ? (
          <p className="cover-flow-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        <header className="cover-flow-header">
          <span className="cover-flow-header__spacer" />
          <h1 className="cover-flow-header__title">Cover</h1>
          <button
            type="button"
            className="cover-flow-header__link"
            onClick={() => openHistory('active')}
          >
            History
          </button>
        </header>

        <section className="cover-flow-intro">
          <h2 className="cover-flow-intro__title">
            {active ? 'You’re covered' : 'Choose your SAFE cover'}
          </h2>
          <p className="cover-flow-intro__sub">
            {active
              ? 'Your SAFE cover is active.'
              : 'Buy cover before your trip and keep your policy details ready.'}
          </p>
        </section>

        {active ? (
          <section className="cover-flow-hero cover-flow-hero--active" aria-label="Active cover">
            <img className="cover-flow-hero__art" src={protectedBusArt} alt="" aria-hidden="true" />
            <span className="cover-flow-pill cover-flow-pill--active">Active</span>
            <dl className="cover-flow-hero__details">
              <div>
                <dt>Plan</dt>
                <dd>{activeCover.planName}</dd>
              </div>
              <div>
                <dt>Time remaining</dt>
                <dd aria-live="polite">{timeLeft || 'Ending soon'}</dd>
              </div>
              <div>
                <dt>Ends at</dt>
                <dd>{formatCoverEnds(activeCover.endsAt)}</dd>
              </div>
              {activeCover.policyId ? (
                <div>
                  <dt>Policy</dt>
                  <dd>{activeCover.policyId}</dd>
                </div>
              ) : null}
              {activeCover.paymentStatus ? (
                <div>
                  <dt>Payment</dt>
                  <dd>{activeCover.paymentStatus}</dd>
                </div>
              ) : null}
            </dl>
            <div className="cover-flow-hero__actions">
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--primary"
                onClick={() => setScreen('viewPolicy')}
              >
                View cover
              </button>
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--secondary"
                onClick={() => openClaimFlow(1)}
              >
                Start claim
              </button>
              <button
                type="button"
                className="cover-flow-btn cover-flow-btn--text"
                onClick={() => openHistory('active')}
              >
                <History size={18} aria-hidden="true" />
                Cover history
              </button>
            </div>
            {!capabilities.allowCoverStacking ? (
              <div className="cover-flow-note-block">
                <p className="cover-flow-note">You already have active cover.</p>
                <p className="cover-flow-note cover-flow-note--muted">
                  Wait until it ends, or view your current policy.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {expired && lastEndedCover ? (
          <section className="cover-flow-hero cover-flow-hero--expired" aria-label="Cover expired">
            <img className="cover-flow-hero__art" src={busHeroCityArt} alt="" aria-hidden="true" />
            <span className="cover-flow-pill">Expired</span>
            <h3 className="cover-flow-hero__title">Cover expired</h3>
            <p className="cover-flow-hero__sub">Your last SAFE cover has ended.</p>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--primary"
              onClick={onBuyCover}
            >
              Buy cover again
            </button>
          </section>
        ) : null}

        {!active && !expired ? (
          <section className="cover-flow-start" aria-label="Get covered">
            <img className="cover-flow-start__art" src={noCoverArt} alt="" aria-hidden="true" />
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--primary cover-flow-btn--wide"
              onClick={onBuyCover}
            >
              Choose cover
            </button>
            <p className="cover-flow-note">Cover starts only after payment is confirmed.</p>
          </section>
        ) : null}

        <section className="cover-flow-proof-card" aria-label="Proof and verification">
          <img className="cover-flow-proof-card__art" src={coverVerificationArt} alt="" aria-hidden="true" />
          <div className="cover-flow-proof-card__body">
            <strong>Proof & verification</strong>
            <p>View your cover details or verify a vehicle QR code.</p>
          </div>
          <div className="cover-flow-proof-card__actions">
            <button type="button" className="cover-flow-btn cover-flow-btn--secondary" onClick={() => setScreen('viewPolicy')}>
              View cover
            </button>
            <button type="button" className="cover-flow-btn cover-flow-btn--secondary" onClick={() => (session?.token ? setScreen('qrScanner') : setScreen('login'))}>
              Verify
            </button>
          </div>
        </section>

        {bundle?.pendingCover?.paymentStatus === 'pending' ? (
          <section className="cover-flow-banner cover-flow-banner--warn" role="status">
            <strong>Payment pending</strong>
            <p>Complete the payment request on your phone to activate cover.</p>
            <button
              type="button"
              className="cover-flow-btn cover-flow-btn--secondary"
              onClick={() => onCheckPendingPurchase?.(bundle.pendingCover)}
            >
              Check status
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
