/** @deprecated Unreachable legacy claim flow — App.jsx routes to ClaimFlowScreen only. */
import {
  ArrowLeft,
  ClipboardCheck,
  File,
  Info,
} from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import ClaimFlowSteps from './ClaimFlowSteps.jsx';
import {
  buildClaimPolicyId,
  buildClaimRoute,
  formatFileSize,
  normalizeClaimDocuments,
  readyClaimFiles,
} from '../claimDraftUtils.js';
import { formatPlanLabel } from '../hooks/useActiveTrip.js';

const EVIDENCE_GROUPS = [
  { key: 'accidentPhotos', label: 'Accident photos' },
  { key: 'medicalDocuments', label: 'Hospital or clinic document' },
  { key: 'policeReports', label: 'Police report' },
];

function SummaryRow({ label, value, isLast = false }) {
  return (
    <div className={`claim-flow-review-row${isLast ? ' claim-flow-review-row--last' : ''}`}>
      <span className="claim-flow-review-row__label">{label}</span>
      <span className="claim-flow-review-row__value">{value}</span>
    </div>
  );
}

function EvidenceCategory({ label, files, isPolice }) {
  return (
    <div className="claim-flow-review-evidence-group">
      <p className="claim-flow-review-evidence-group__label">{label}</p>
      {files.length === 0 ? (
        <p className="claim-flow-review-evidence-group__empty">Not added</p>
      ) : (
        <ul className="claim-flow-review-evidence-group__list">
          {files.map((file) => (
            <li key={file.id} className="claim-flow-review-file">
              <File size={16} strokeWidth={2} color="#007A3D" aria-hidden="true" />
              <span className="claim-flow-review-file__meta">
                <span className="claim-flow-review-file__name">{file.name}</span>
                <span className="claim-flow-review-file__size">{formatFileSize(file.size)}</span>
              </span>
              <span
                className={`claim-flow-review-file__pill${isPolice ? ' claim-flow-review-file__pill--pending' : ''}`}
              >
                {isPolice ? 'Attached — pending review' : 'Attached'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ClaimFlowReviewStep({
  incidentNarrative = '',
  documents,
  activeCover,
  fallbackPolicyId,
  fallbackVehicle,
  fallbackRoute,
  busy = false,
  error = '',
  canSubmit = false,
  onBack,
  onEditNarrative,
  onEditEvidence,
  onSubmit,
}) {
  const narrative = incidentNarrative.trim();
  const draftDocuments = normalizeClaimDocuments(documents);
  const policyId = buildClaimPolicyId(activeCover) || fallbackPolicyId || 'Not available';
  const vehicle = activeCover?.vehicle?.plateNumber || fallbackVehicle || 'Not assigned';
  const route = buildClaimRoute(activeCover) || fallbackRoute || 'Not specified';
  const plan = activeCover?.plan ? `${formatPlanLabel(activeCover.plan)} Cover` : 'Not specified';

  return (
    <main className="screen claim-flow-screen claim-flow-screen--review">
      <div className="claim-flow-review-scroll">
        <header className="claim-flow-screen__header">
        <button type="button" className="claim-flow-screen__back" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="claim-flow-screen__header-title">Review Claim</h1>
        <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
      </header>

      <ClaimFlowSteps currentStep={3} />

      <section className="claim-flow-screen__intro">
        <h2 className="claim-flow-screen__heading">Review your claim</h2>
        <p className="claim-flow-screen__subheading">
          Check your details before submitting to SAFE support.
        </p>
      </section>

      <article className="claim-flow-review-summary">
        <div className="claim-flow-review-summary__head">
          <div className="claim-flow-review-summary__icon" aria-hidden="true">
            <ClipboardCheck size={22} strokeWidth={2} color="#007A3D" />
          </div>
          <div>
            <h3 className="claim-flow-review-summary__title">Claim summary</h3>
            <p className="claim-flow-review-summary__hint">Ready for review</p>
          </div>
        </div>

        <div className="claim-flow-review-summary__rows">
          <SummaryRow label="Policy ID" value={policyId} />
          <SummaryRow label="Vehicle" value={vehicle} />
          <SummaryRow label="Route" value={route} />
          <SummaryRow label="Cover" value={plan} />
          <SummaryRow label="Incident time" value="Not specified" />
          <SummaryRow label="Status" value="Draft" isLast />
        </div>
      </article>

      <article className="claim-flow-review-card">
        <div className="claim-flow-review-card__head">
          <h3 className="claim-flow-review-card__title">Accident narrative</h3>
          <button type="button" className="claim-flow-review-card__edit" onClick={onEditNarrative}>
            Edit
          </button>
        </div>
        <p className="claim-flow-review-card__body">
          {narrative.length >= 10 ? narrative : 'No narrative added'}
        </p>
      </article>

      <article className="claim-flow-review-card claim-flow-review-card--evidence">
        <div className="claim-flow-review-card__head">
          <h3 className="claim-flow-review-card__title">Evidence</h3>
          <button type="button" className="claim-flow-review-card__edit" onClick={onEditEvidence}>
            Edit
          </button>
        </div>

        <div className="claim-flow-review-evidence">
          {EVIDENCE_GROUPS.map((group) => (
            <EvidenceCategory
              key={group.key}
              label={group.label}
              files={readyClaimFiles(draftDocuments, group.key)}
              isPolice={group.key === 'policeReports'}
            />
          ))}
        </div>
      </article>

      <div className="claim-flow-review-footer">
        <aside className="claim-flow-review-notice" aria-label="Document review notice">
          <Info size={18} strokeWidth={2.25} color="#A86B00" aria-hidden="true" />
          <p>
            SAFE reviews claim documents before approval. Uploading a police report does not automatically
            verify a claim.
          </p>
        </aside>

        {error && (
          <p className="claim-flow-review-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className="claim-flow-screen__submit"
          disabled={!canSubmit || busy}
          onClick={onSubmit}
        >
          {busy ? 'Submitting…' : 'Submit Claim'}
        </button>
      </div>

        <BottomScrollSpacer height={180} />
      </div>
    </main>
  );
}
