import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import safeShieldIcon from '../assets/real/safe_shield_clean.png';
import {
  loadClaimsBundle,
  readCachedClaims,
  writeCachedClaims,
} from '../services/claims.js';
import {
  claimStatusLabel,
  claimStatusPillClass,
  formatIncidentDateTime,
  formatUpdatedAt,
  isActiveClaimStatus,
  normalizeClaimStatus,
} from '../utils/claimStatus.js';

function pickSummaryClaim(claims) {
  if (!Array.isArray(claims) || claims.length === 0) return null;
  const active = claims.find((c) => isActiveClaimStatus(c.status));
  if (active) return active;
  const nonDraft = claims.find((c) => normalizeClaimStatus(c.status) !== 'draft');
  return nonDraft || claims[0];
}

export default function ClaimsScreen({
  session,
  setScreen,
  openClaimFlow,
  openClaimDetail,
  cityLabel = 'Lusaka',
}) {
  const cached = readCachedClaims();
  const [claims, setClaims] = useState(cached?.claims ?? []);
  const [loading, setLoading] = useState(() => !cached?.claims?.length);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');

  const claimsRef = useRef(claims);
  claimsRef.current = claims;
  const token = session?.token || '';

  const loadClaims = useCallback(async () => {
    if (!token) {
      setClaims([]);
      setLoading(false);
      setLoadError('');
      setSyncWarning('');
      writeCachedClaims(null);
      return;
    }

    const hadClaims = (claimsRef.current?.length ?? 0) > 0;
    if (!hadClaims) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const bundle = await loadClaimsBundle(token);
      setClaims(bundle.claims);
      writeCachedClaims(bundle);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedClaims()?.claims?.length) {
        setSyncWarning(
          'Could not refresh claims. Showing your last saved claim status.'
        );
        setLoadError('');
      } else {
        setLoadError('Couldn’t load claims');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const summaryClaim = pickSummaryClaim(claims);
  const visibleClaims = claims.filter((c) => normalizeClaimStatus(c.status) !== 'draft');
  const hasClaims = visibleClaims.length > 0;

  if (loadError && !claims.length) {
    return (
      <main className="screen claims-screen claims-screen-board" aria-live="polite">
        <ClaimsHeader cityLabel={cityLabel} />
        <section className="claims-screen-board__title-area">
          <h1 className="claims-screen-board__title">Claims</h1>
          <p className="claims-screen-board__title-sub">
            Submit accident details and track claim progress.
          </p>
        </section>
        <article className="claims-state-card">
          <h2 className="claims-state-card__title">{loadError}</h2>
          <p className="claims-state-card__body">Check your connection and try again.</p>
          <button type="button" className="claims-btn claims-btn--primary" onClick={loadClaims}>
            Retry
          </button>
        </article>
      </main>
    );
  }

  return (
    <main className="screen claims-screen claims-screen-board" aria-live="polite">
      <ClaimsHeader cityLabel={cityLabel} />

      {syncWarning ? (
        <p className="claims-sync-warning" role="status">
          {syncWarning}
        </p>
      ) : null}

      <section className="claims-screen-board__title-area">
        <h1 className="claims-screen-board__title">Claims</h1>
        <p className="claims-screen-board__title-sub">
          Submit accident details and track claim progress.
        </p>
      </section>

      {loading && !claims.length ? (
        <article className="claims-state-card" aria-busy="true">
          <p className="claims-state-card__body">Loading your claims…</p>
        </article>
      ) : null}

      {summaryClaim && isActiveClaimStatus(summaryClaim.status) ? (
        <article className="claims-summary-card">
          <p className="claims-summary-card__label">Claim in progress</p>
          <p className="claims-summary-card__meta">
            Status:{' '}
            <span className={`claims-pill ${claimStatusPillClass(summaryClaim.status)}`}>
              {claimStatusLabel(summaryClaim.status)}
            </span>
          </p>
          <p className="claims-summary-card__ref">
            Reference: <strong>{summaryClaim.reference}</strong>
          </p>
          <button
            type="button"
            className="claims-btn claims-btn--secondary"
            onClick={() => openClaimDetail?.(summaryClaim.id)}
          >
            View claim
          </button>
        </article>
      ) : !hasClaims && !loading ? (
        <article className="claims-empty-card">
          <h2 className="claims-empty-card__title">No claims yet</h2>
          <p className="claims-empty-card__body">
            If something happened, start a claim and upload your documents.
          </p>
          <button
            type="button"
            className="claims-btn claims-btn--primary"
            onClick={() => openClaimFlow?.()}
          >
            Start claim
          </button>
        </article>
      ) : (
        <button
          type="button"
          className="claims-btn claims-btn--primary claims-start-cta"
          onClick={() => openClaimFlow?.()}
        >
          Start claim
        </button>
      )}

      {hasClaims ? (
        <section className="claims-list-section" aria-label="Your claims">
          <h2 className="claims-list-section__heading">Your claims</h2>
          <ul className="claims-list">
            {visibleClaims.map((claim) => (
              <li key={claim.id}>
                <article className="claims-list-card">
                  <div className="claims-list-card__top">
                    <span className="claims-list-card__ref">{claim.reference}</span>
                    <span className={`claims-pill ${claimStatusPillClass(claim.status)}`}>
                      {claimStatusLabel(claim.status)}
                    </span>
                  </div>
                  <p className="claims-list-card__row">
                    Incident: {formatIncidentDateTime(claim.incidentDateTime)}
                  </p>
                  {claim.policyId ? (
                    <p className="claims-list-card__row">Policy: {claim.policyId}</p>
                  ) : null}
                  <p className="claims-list-card__row">
                    Last updated: {formatUpdatedAt(claim.updatedAt)}
                  </p>
                  <button
                    type="button"
                    className="claims-btn claims-btn--secondary claims-list-card__cta"
                    onClick={() => openClaimDetail?.(claim.id)}
                  >
                    View details
                  </button>
                </article>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button
        type="button"
        className="claims-refresh-btn"
        onClick={loadClaims}
        aria-label="Refresh claims"
      >
        <RefreshCcw size={18} aria-hidden="true" />
      </button>
    </main>
  );
}

function ClaimsHeader({ cityLabel }) {
  return (
    <header className="cover-screen-board__header">
      <div className="cover-screen-board__brand">
        <img
          className="cover-screen-board__brand-icon"
          src={safeShieldIcon}
          alt=""
          aria-hidden="true"
        />
        <div className="cover-screen-board__brand-text">
          <span className="cover-screen-board__brand-name">SAFE</span>
          <span className="cover-screen-board__brand-sub">commuter cover</span>
        </div>
      </div>
      <span className="cover-screen-board__location">{cityLabel}</span>
    </header>
  );
}
