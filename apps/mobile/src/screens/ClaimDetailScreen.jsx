import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getClaimDetail } from '../services/claims.js';
import {
  claimStatusLabel,
  claimStatusPillClass,
  formatIncidentDateTime,
  normalizeClaimStatus,
} from '../utils/claimStatus.js';

export default function ClaimDetailScreen({
  session,
  claimId,
  setScreen,
  openClaimFlow,
}) {
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = session?.token || '';

  const load = useCallback(async () => {
    if (!token || !claimId) {
      setLoading(false);
      setError('Couldn’t load claim');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const detail = await getClaimDetail(token, claimId);
      if (!detail) {
        setError('Claim not found');
        setClaim(null);
      } else {
        setClaim(detail);
      }
    } catch {
      setError('Couldn’t load claim');
    } finally {
      setLoading(false);
    }
  }, [token, claimId]);

  useEffect(() => {
    load();
  }, [load]);

  const status = normalizeClaimStatus(claim?.status);
  const needsAction = status === 'needs_action';

  return (
    <main className="screen claim-detail-screen">
      <header className="claim-flow-screen__header">
        <button
          type="button"
          className="claim-flow-screen__back"
          onClick={() => setScreen('claim')}
          aria-label="Back to claims"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="claim-flow-screen__header-title">Claim details</h1>
        <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
      </header>

      {loading ? (
        <p className="claim-detail-screen__status">Loading claim…</p>
      ) : null}

      {error ? (
        <article className="claims-state-card">
          <p className="claims-state-card__title">{error}</p>
          <button type="button" className="claims-btn claims-btn--primary" onClick={load}>
            Retry
          </button>
        </article>
      ) : null}

      {claim ? (
        <>
          <article className="claim-detail-card">
            <div className="claim-detail-card__top">
              <span className="claim-detail-card__ref">{claim.reference}</span>
              <span className={`claims-pill ${claimStatusPillClass(claim.status)}`}>
                {claimStatusLabel(claim.status)}
              </span>
            </div>
            <p className="claim-detail-card__row">
              Incident: {formatIncidentDateTime(claim.incidentDateTime)}
            </p>
            {claim.policyId ? (
              <p className="claim-detail-card__row">Policy: {claim.policyId}</p>
            ) : null}
            {claim.location ? (
              <p className="claim-detail-card__row">Location: {claim.location}</p>
            ) : null}
          </article>

          <section className="claim-detail-section" aria-label="Timeline">
            <h2 className="claim-detail-section__title">Timeline</h2>
            {claim.timeline?.length ? (
              <ol className="claim-detail-timeline">
                {claim.timeline.map((event) => (
                  <li key={event.id} className="claim-detail-timeline__item">
                    <span className="claim-detail-timeline__title">{event.title}</span>
                    {event.detail ? (
                      <span className="claim-detail-timeline__detail">{event.detail}</span>
                    ) : null}
                    <span className="claim-detail-timeline__date">
                      {new Date(event.createdAt).toLocaleString('en-GB')}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="claim-detail-section__placeholder">
                Latest status from SAFE: {claimStatusLabel(claim.status)}
              </p>
            )}
          </section>

          {claim.documents?.length ? (
            <section className="claim-detail-section" aria-label="Documents">
              <h2 className="claim-detail-section__title">Documents</h2>
              <ul className="claim-detail-docs">
                {claim.documents.map((doc) => (
                  <li key={doc.id} className="claim-detail-docs__row">
                    <span>{doc.filename}</span>
                    <span className="claim-detail-docs__status">{doc.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {needsAction ? (
            <button
              type="button"
              className="claims-btn claims-btn--primary"
              onClick={() => openClaimFlow?.({ claimId: claim.id, step: 3 })}
            >
              Add more documents
            </button>
          ) : null}

          <button
            type="button"
            className="claims-btn claims-btn--secondary"
            onClick={() => setScreen('helpSafety')}
          >
            Contact support
          </button>
        </>
      ) : null}
    </main>
  );
}
