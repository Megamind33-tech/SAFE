/** @deprecated Unreachable legacy claim flow — App.jsx routes to ClaimFlowScreen only. */
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import {
  buildClaimPolicyId,
  buildClaimReference,
  formatClaimReviewStage,
  formatClaimStatusLabel,
} from '../claimDraftUtils.js';

const NEXT_STEPS = [
  'SAFE reviews your claim details.',
  'Evidence is checked before approval.',
  "You'll receive updates in Claims.",
];

function ReferenceRow({ label, value, isLast = false, isStatus = false, isReference = false }) {
  const statusLabel = isStatus ? formatClaimStatusLabel(value) : value;

  return (
    <div
      className={`claim-submitted-row${isReference ? ' claim-submitted-row--reference' : ''}${isLast ? ' claim-submitted-row--last' : ''}`}
    >
      <span className="claim-submitted-row__label">{label}</span>
      {isStatus ? (
        <span className="claim-submitted-row__pill">{statusLabel}</span>
      ) : (
        <span
          className={`claim-submitted-row__value${isReference ? ' claim-submitted-row__value--reference' : ''}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export default function ClaimFlowSubmittedStep({
  claim,
  activeCover,
  fallbackPolicyId,
  fallbackVehicle,
  onBackToClaims,
  onBackToHome,
}) {
  const claimReference = buildClaimReference(claim) || 'Not available';
  const policyId = buildClaimPolicyId(activeCover) || fallbackPolicyId || 'Not available';
  const vehicle = activeCover?.vehicle?.plateNumber || fallbackVehicle || 'Not assigned';
  const status = claim?.status || 'submitted';
  const reviewStage = formatClaimReviewStage(status);

  return (
    <main className="screen claim-flow-screen claim-flow-screen--submitted">
      <div className="claim-flow-submitted-scroll">
        <header className="claim-submitted-header">
          <button
            type="button"
            className="claim-submitted-header__back"
            onClick={onBackToClaims}
            aria-label="Back to Claims"
          >
            <ArrowLeft size={20} strokeWidth={2.25} />
          </button>
          <h1 className="claim-submitted-header__title">Claim Submitted</h1>
          <span className="claim-submitted-header__spacer" aria-hidden="true" />
        </header>

        <section className="claim-submitted-hero" aria-label="Claim submitted confirmation">
          <div className="claim-submitted-hero__icon" aria-hidden="true">
            <ShieldCheck size={36} strokeWidth={2} color="#FFFFFF" />
          </div>
          <h2 className="claim-submitted-hero__title">Claim submitted</h2>
          <p className="claim-submitted-hero__subtitle">
            SAFE has received your accident claim for review.
          </p>
        </section>

        <article className="claim-submitted-reference">
          <ReferenceRow label="Claim reference" value={claimReference} isReference />
          <ReferenceRow label="Policy ID" value={policyId} />
          <ReferenceRow label="Vehicle" value={vehicle} />
          <ReferenceRow label="Status" value={status} isStatus />
          <ReferenceRow label="Review stage" value={reviewStage} isLast />
        </article>

        <aside className="claim-submitted-notice" aria-label="Claim review notice">
          <p>
            SAFE will review your claim details and documents before approval. Police reports and
            uploaded files remain pending review until verified.
          </p>
        </aside>

        <article className="claim-submitted-next">
          <h3 className="claim-submitted-next__title">What happens next?</h3>
          <ul className="claim-submitted-next__list">
            {NEXT_STEPS.map((step) => (
              <li key={step} className="claim-submitted-next__item">
                <span className="claim-submitted-next__dot" aria-hidden="true">
                  <Check size={12} strokeWidth={3} color="#007A3D" />
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </article>

        <div className="claim-submitted-actions">
          <button type="button" className="claim-submitted-actions__primary" onClick={onBackToClaims}>
            Track Claim
          </button>
          <button type="button" className="claim-submitted-actions__secondary" onClick={onBackToHome}>
            Back to Home
          </button>
        </div>

        <BottomScrollSpacer height={180} />
      </div>
    </main>
  );
}
