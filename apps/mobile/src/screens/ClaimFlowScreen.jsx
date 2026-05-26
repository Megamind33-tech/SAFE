import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  createClaimDraft,
  getClaimDuplicateCheck,
  getClaimEligibility,
  submitClaim,
  updateClaimDraft,
  getClaimDetail,
  uploadClaimDocument,
} from '../services/claims.js';
import { claimStatusLabel } from '../utils/claimStatus.js';

const STEPS = ['Cover', 'Accident', 'Documents', 'Review', 'Submitted'];

function formatCoverPeriod(period) {
  if (!period?.start || !period?.end) return '—';
  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(period.start)} – ${fmt(period.end)}`;
}

export default function ClaimFlowScreen({
  session,
  setScreen,
  openClaimDetail,
  initialStep = 1,
  resumeClaimId = null,
  submittedClaimId = null,
  onClaimsChanged,
}) {
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState({ covers: [], uploadEnabled: false });
  const [claimId, setClaimId] = useState(resumeClaimId);
  const [submittedClaim, setSubmittedClaim] = useState(null);
  const [duplicate, setDuplicate] = useState(null);

  const [selectedCoverId, setSelectedCoverId] = useState('');
  const [accidentDate, setAccidentDate] = useState('');
  const [accidentTime, setAccidentTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [injured, setInjured] = useState(null);
  const [vehicleInvolved, setVehicleInvolved] = useState(null);
  const [driverDetails, setDriverDetails] = useState('');
  const [policeReference, setPoliceReference] = useState('');
  const [medicalReference, setMedicalReference] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [trustedContactNote, setTrustedContactNote] = useState('');
  const [pendingFiles, setPendingFiles] = useState({
    police_report: null,
    medical_note: null,
    photo: null,
    other: null,
  });
  const [uploadNotice, setUploadNotice] = useState('');

  const token = session?.token || '';

  useEffect(() => {
    if (!submittedClaimId || !token) return;
    getClaimDetail(token, submittedClaimId)
      .then((claim) => {
        if (claim?.reference) {
          setSubmittedClaim(claim);
          setStep(5);
        }
      })
      .catch(() => {});
  }, [submittedClaimId, token]);


  useEffect(() => {
    const qaClaimId = sessionStorage.getItem('safe_qa_submitted_claim');
    if (!qaClaimId || !token) return;
    getClaimDetail(token, qaClaimId)
      .then((claim) => {
        if (claim && ['submitted', 'under_review'].includes(String(claim.status))) {
          setSubmittedClaim(claim);
          setStep(5);
          sessionStorage.removeItem('safe_qa_submitted_claim');
        }
      })
      .catch(() => {});
  }, [token]);

  const selectedCover = eligibility.covers.find((c) => c.coverId === selectedCoverId);

  const loadEligibility = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getClaimEligibility(token);
      setEligibility(data);
      if (data.covers.length === 1) {
        setSelectedCoverId(data.covers[0].coverId);
      }
    } catch {
      setError('Could not load eligible cover.');
    }
  }, [token]);

  useEffect(() => {
    loadEligibility();
  }, [loadEligibility]);

  const ensureDraft = async () => {
    if (claimId) return claimId;
    if (!selectedCoverId) throw new Error('Select a cover');
    const draft = await createClaimDraft(token, selectedCoverId);
    setClaimId(draft.id);
    return draft.id;
  };

  const saveDraftPatch = async (patch) => {
    const id = await ensureDraft();
    await updateClaimDraft(token, id, patch);
    return id;
  };

  const validateAccident = () => {
    if (!accidentDate || !accidentTime) return 'Accident date and time are required.';
    if (!location.trim()) return 'Location is required.';
    if (description.trim().length < 20) return 'Description must be at least 20 characters.';
    const incident = new Date(`${accidentDate}T${accidentTime}:00`);
    if (Number.isNaN(incident.getTime())) return 'Enter a valid date and time.';
    if (incident > new Date()) return 'Date and time cannot be in the future.';
    if (injured == null || vehicleInvolved == null) {
      return 'Answer whether you were injured and if a vehicle was involved.';
    }
    return '';
  };

  const runDuplicateCheck = async (id) => {
    const result = await getClaimDuplicateCheck(token, {
      tripCoverId: selectedCoverId,
      incidentDateTime: new Date(`${accidentDate}T${accidentTime}:00`).toISOString(),
      location: location.trim(),
      policeReference: policeReference.trim() || undefined,
      excludeClaimId: id,
    });
    setDuplicate(result);
    return result;
  };

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const id = await saveDraftPatch({
        tripCoverId: selectedCoverId,
        accidentDate,
        accidentTime,
        location: location.trim(),
        description: description.trim(),
        injured,
        vehicleInvolved,
        driverDetails: driverDetails.trim() || undefined,
        policeReference: policeReference.trim() || undefined,
        medicalReference: medicalReference.trim() || undefined,
        vehiclePlate: vehiclePlate.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        trustedContactNote: trustedContactNote.trim() || undefined,
      });

      const dup = await runDuplicateCheck(id);
      if (dup.duplicateDecision === 'block') {
        setError('Possible duplicate claim. Review your existing claim before submitting another.');
        setStep(3);
        return;
      }

      const { claim, duplicate: dupWarn } = await submitClaim(token, id);
      if (!claim?.reference) {
        setError('Claim could not be submitted. Please try again.');
        return;
      }
      setSubmittedClaim(claim);
      if (dupWarn?.duplicate) setDuplicate(dupWarn);
      setStep(5);
      onClaimsChanged?.();
    } catch (e) {
      if (/duplicate/i.test(String(e.message))) {
        setError('Possible duplicate claim. Review your existing claim before submitting another.');
      } else {
        setError(e.message || 'Claim could not be submitted. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (step === 5 && submittedClaim) {
    return (
      <main className="screen claim-flow-screen claim-submitted-screen">
        <header className="claim-flow-screen__header">
          <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
          <h1 className="claim-flow-screen__header-title">Claim submitted</h1>
          <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
        </header>
        <article className="claim-submitted-card" aria-live="polite">
          <h2 className="claim-submitted-card__title">Claim submitted</h2>
          <p className="claim-submitted-card__body">
            SAFE has received your claim and will review your details and documents.
          </p>
          <p className="claim-submitted-card__meta">
            Reference: <strong>{submittedClaim.reference}</strong>
          </p>
          <p className="claim-submitted-card__meta">
            Status: {claimStatusLabel(submittedClaim.status)}
          </p>
          <p className="claim-submitted-card__meta">
            Submitted: {new Date(submittedClaim.updatedAt || submittedClaim.createdAt).toLocaleString('en-GB')}
          </p>
          <button
            type="button"
            className="claims-btn claims-btn--primary"
            onClick={() => openClaimDetail?.(submittedClaim.id)}
          >
            View claim
          </button>
          <button
            type="button"
            className="claims-btn claims-btn--secondary"
            onClick={() => setScreen('claim')}
          >
            Done
          </button>
        </article>
      </main>
    );
  }

  return (
    <main className="screen claim-flow-screen">
      <header className="claim-flow-screen__header">
        <button
          type="button"
          className="claim-flow-screen__back"
          onClick={() => (step <= 1 ? setScreen('claim') : setStep((s) => s - 1))}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="claim-flow-screen__header-title">
          {step === 1 ? 'Start a claim' : 'Claim details'}
        </h1>
        <span className="claim-flow-screen__header-spacer" aria-hidden="true" />
      </header>

      <nav className="claim-flow-steps" aria-label="Claim progress">
        <ol className="claim-flow-steps__list claim-flow-steps__list--compact">
          {STEPS.slice(0, 4).map((label, index) => {
            const n = index + 1;
            const active = step === n;
            const complete = step > n;
            return (
              <li
                key={label}
                className={`claim-flow-steps__item${active ? ' claim-flow-steps__item--active' : ''}${complete ? ' claim-flow-steps__item--complete' : ''}`}
              >
                <span className="claim-flow-steps__circle">{n}</span>
                <span className="claim-flow-steps__label">{label}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {duplicate?.duplicate && step >= 3 ? (
        <article className="claims-duplicate-card" role="alert">
          <h2 className="claims-duplicate-card__title">Possible duplicate claim</h2>
          <p className="claims-duplicate-card__body">
            A claim for this cover or incident may already exist. Review your existing claim
            before submitting another one.
          </p>
          {duplicate.existingClaimId ? (
            <button
              type="button"
              className="claims-btn claims-btn--secondary"
              onClick={() => openClaimDetail?.(duplicate.existingClaimId)}
            >
              View existing claim
            </button>
          ) : null}
          {duplicate.duplicateDecision === 'allow' ? (
            <p className="claims-duplicate-card__note">You may continue if details are correct.</p>
          ) : null}
        </article>
      ) : null}

      {error ? (
        <p className="claim-flow-screen__error" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <section className="claim-flow-panel">
          <h2 className="claim-flow-panel__title">Eligible cover</h2>
          {eligibility.covers.length === 0 ? (
            <article className="claims-empty-card">
              <h3 className="claims-empty-card__title">No eligible cover found</h3>
              <p className="claims-empty-card__body">
                You need an active or recently eligible SAFE cover to submit a claim.
              </p>
              <button
                type="button"
                className="claims-btn claims-btn--primary"
                onClick={() => setScreen('active')}
              >
                Buy cover
              </button>
            </article>
          ) : (
            <ul className="claim-eligibility-list">
              {eligibility.covers.map((cover) => (
                <li key={cover.coverId}>
                  <button
                    type="button"
                    className={`claim-eligibility-card${selectedCoverId === cover.coverId ? ' claim-eligibility-card--selected' : ''}`}
                    onClick={() => setSelectedCoverId(cover.coverId)}
                  >
                    <span className="claim-eligibility-card__plan">{cover.planName}</span>
                    <span className="claim-eligibility-card__policy">{cover.policyId}</span>
                    <span className="claim-eligibility-card__period">
                      {formatCoverPeriod(cover.coverPeriod)}
                    </span>
                    <span className="claim-eligibility-card__payment">
                      Payment: {cover.paymentStatus}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="claim-flow-screen__next"
            disabled={!selectedCoverId || busy}
            onClick={() => setStep(2)}
          >
            <span>Next: Accident details</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="claim-flow-panel">
          <h2 className="claim-flow-panel__title">Accident details</h2>
          <label className="claim-field">
            <span>Accident date</span>
            <input
              type="date"
              value={accidentDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setAccidentDate(e.target.value)}
            />
          </label>
          <label className="claim-field">
            <span>Accident time</span>
            <input type="time" value={accidentTime} onChange={(e) => setAccidentTime(e.target.value)} />
          </label>
          <label className="claim-field">
            <span>Where did it happen?</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Street, area, or landmark"
            />
          </label>
          <label className="claim-field">
            <span>What happened?</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              minLength={20}
              placeholder="Describe the accident (minimum 20 characters)"
            />
          </label>
          <fieldset className="claim-fieldset">
            <legend>Were you injured?</legend>
            <label>
              <input
                type="radio"
                name="injured"
                checked={injured === true}
                onChange={() => setInjured(true)}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="injured"
                checked={injured === false}
                onChange={() => setInjured(false)}
              />
              No
            </label>
          </fieldset>
          <fieldset className="claim-fieldset">
            <legend>Was the vehicle involved?</legend>
            <label>
              <input
                type="radio"
                name="vehicle"
                checked={vehicleInvolved === true}
                onChange={() => setVehicleInvolved(true)}
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="vehicle"
                checked={vehicleInvolved === false}
                onChange={() => setVehicleInvolved(false)}
              />
              No
            </label>
          </fieldset>
          <label className="claim-field">
            <span>Driver / operator details (optional)</span>
            <input
              type="text"
              value={driverDetails}
              onChange={(e) => setDriverDetails(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="claim-flow-screen__next"
            disabled={busy}
            onClick={async () => {
              const msg = validateAccident();
              if (msg) {
                setError(msg);
                return;
              }
              setError('');
              setBusy(true);
              try {
                await saveDraftPatch({
                  tripCoverId: selectedCoverId,
                  accidentDate,
                  accidentTime,
                  location: location.trim(),
                  description: description.trim(),
                  injured,
                  vehicleInvolved,
                  driverDetails: driverDetails.trim() || undefined,
                });
                const id = claimId || (await ensureDraft());
                await runDuplicateCheck(id);
                setStep(3);
              } catch (e) {
                setError(e.message || 'Could not save accident details.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <span>Next: Documents</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="claim-flow-panel">
          <h2 className="claim-flow-panel__title">Documents and evidence</h2>
          {uploadNotice ? (
            <p className="claims-upload-notice" role="status">
              {uploadNotice}
            </p>
          ) : null}
          {[
            { key: 'police_report', label: 'Police report' },
            { key: 'medical_note', label: 'Medical note' },
            { key: 'photo', label: 'Accident photos' },
            { key: 'other', label: 'Vehicle / trip details' },
          ].map((row) => (
            <label key={row.key} className="claim-doc-row">
              <span>{row.label}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setPendingFiles((prev) => ({ ...prev, [row.key]: file }));
                }}
              />
            </label>
          ))}
          <label className="claim-field">
            <span>Police reference number</span>
            <input
              type="text"
              value={policeReference}
              onChange={(e) => setPoliceReference(e.target.value)}
            />
          </label>
          <label className="claim-field">
            <span>Medical / hospital reference</span>
            <input
              type="text"
              value={medicalReference}
              onChange={(e) => setMedicalReference(e.target.value)}
            />
          </label>
          <label className="claim-field">
            <span>Vehicle plate (optional)</span>
            <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
          </label>
          <label className="claim-field">
            <span>Driver phone (optional)</span>
            <input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
          </label>
          <button
            type="button"
            className="claim-flow-screen__next"
            disabled={busy}
            onClick={async () => {
              setError('');
              setBusy(true);
              setUploadNotice('');
              try {
                const id = await saveDraftPatch({
                  policeReference: policeReference.trim() || undefined,
                  medicalReference: medicalReference.trim() || undefined,
                  vehiclePlate: vehiclePlate.trim() || undefined,
                  driverPhone: driverPhone.trim() || undefined,
                  trustedContactNote: trustedContactNote.trim() || undefined,
                });

                if (eligibility.uploadEnabled) {
                  for (const [type, file] of Object.entries(pendingFiles)) {
                    if (!file) continue;
                    await uploadClaimDocument(token, id, { type, filename: file.name });
                  }
                } else if (Object.values(pendingFiles).some(Boolean)) {
                  setUploadNotice('Document upload is not connected yet.');
                }

                if (duplicate?.duplicateDecision === 'block') {
                  setError('Possible duplicate claim. Review your existing claim first.');
                  return;
                }
                setStep(4);
              } catch (e) {
                if (/not connected/i.test(String(e.message))) {
                  setUploadNotice('Document upload is not connected yet.');
                  setStep(4);
                } else {
                  setError(e.message || 'Could not save documents.');
                }
              } finally {
                setBusy(false);
              }
            }}
          >
            <span>Next: Review</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="claim-flow-panel">
          <h2 className="claim-flow-panel__title">Review claim</h2>
          <dl className="claim-review-list">
            <div>
              <dt>Policy</dt>
              <dd>{selectedCover?.policyId || '—'}</dd>
            </div>
            <div>
              <dt>Accident</dt>
              <dd>
                {accidentDate} {accidentTime}
              </dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{location}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{description}</dd>
            </div>
            <div>
              <dt>Injured</dt>
              <dd>{injured ? 'Yes' : 'No'}</dd>
            </div>
            <div>
              <dt>Police reference</dt>
              <dd>{policeReference || '—'}</dd>
            </div>
            <div>
              <dt>Medical reference</dt>
              <dd>{medicalReference || '—'}</dd>
            </div>
          </dl>
          <p className="claim-review-terms">
            SAFE reviews claim details, documents, cover timing, and supporting evidence before
            approval.
          </p>
          <button
            type="button"
            className="claim-flow-screen__next claim-flow-screen__next--submit"
            disabled={busy || duplicate?.duplicateDecision === 'block'}
            onClick={handleSubmit}
          >
            {busy ? 'Submitting…' : 'Submit claim'}
          </button>
        </section>
      ) : null}
    </main>
  );
}
