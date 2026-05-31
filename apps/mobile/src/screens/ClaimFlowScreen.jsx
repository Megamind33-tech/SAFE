import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Clock, UploadCloud, X, FileCheck } from 'lucide-react';
import claimDocumentIcon from '../assets/pack/icons/claim-document.svg';
import policeReportIcon from '../assets/pack/icons/police-report.svg';
import claimMedicalIcon from '../assets/pack/icons/claim-medical.svg';
import claimUploadPhotoIcon from '../assets/pack/icons/claim-upload-photo.svg';
import coverVerificationArt from '../assets/real/cover_verification_clean.png';
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
import {
  clearQaSubmittedClaimId,
  isClaimsQaCapture,
  readQaSubmittedClaimId,
} from '../utils/claimsQa.js';

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
  qaSubmittedClaimId = null,
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

  // Restore draft from localStorage on mount (persists across app close/reload)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('safe_claim_draft');
      if (saved) {
        const d = JSON.parse(saved);
        if (d.step && d.step > 1 && d.step < 5) {
          setStep(d.step);
          if (d.selectedCoverId) setSelectedCoverId(d.selectedCoverId);
          if (d.accidentDate) setAccidentDate(d.accidentDate);
          if (d.accidentTime) setAccidentTime(d.accidentTime);
          if (d.location) setLocation(d.location);
          if (d.description) setDescription(d.description);
          if (d.injured !== undefined) setInjured(d.injured);
          if (d.vehicleInvolved !== undefined) setVehicleInvolved(d.vehicleInvolved);
          if (d.policeReference) setPoliceReference(d.policeReference);
          if (d.medicalReference) setMedicalReference(d.medicalReference);
        }
      }
    } catch {}
  }, []);

  // Save draft to localStorage on every field/step change
  useEffect(() => {
    if (step >= 5) { localStorage.removeItem('safe_claim_draft'); return; }
    try {
      localStorage.setItem('safe_claim_draft', JSON.stringify({
        step, selectedCoverId, accidentDate, accidentTime,
        location, description, injured, vehicleInvolved,
        policeReference, medicalReference,
      }));
    } catch {}
  }, [step, selectedCoverId, accidentDate, accidentTime, location,
      description, injured, vehicleInvolved, policeReference, medicalReference]);

  useEffect(() => {
    if (!isClaimsQaCapture || !qaSubmittedClaimId || !token) return;
    getClaimDetail(token, qaSubmittedClaimId)
      .then((claim) => {
        if (
          claim?.reference &&
          ['submitted', 'under_review'].includes(String(claim.status))
        ) {
          setSubmittedClaim(claim);
          setStep(5);
          clearQaSubmittedClaimId();
        }
      })
      .catch(() => {});
  }, [qaSubmittedClaimId, token]);

  useEffect(() => {
    if (!isClaimsQaCapture || !token) return;
    const qaClaimId = readQaSubmittedClaimId();
    if (!qaClaimId) return;
    getClaimDetail(token, qaClaimId)
      .then((claim) => {
        if (
          claim?.reference &&
          ['submitted', 'under_review'].includes(String(claim.status))
        ) {
          setSubmittedClaim(claim);
          setStep(5);
          clearQaSubmittedClaimId();
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
    if (injured == null) return "Please select Yes or No for 'Were you injured?'";
    if (vehicleInvolved == null) return "Please select Yes or No for 'Was the vehicle involved?'";
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
      localStorage.removeItem('safe_claim_draft');
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

  if (
    step === 5 &&
    submittedClaim?.reference &&
    ['submitted', 'under_review'].includes(String(submittedClaim.status))
  ) {
    return (
      <main className="screen claim-flow-screen claim-flow-screen--submitted">
        <div className="claim-flow-submitted-scroll" aria-live="polite">
          <header className="claim-submitted-header">
            <button
              type="button"
              className="claim-submitted-header__back"
              aria-label="Back to claims"
              onClick={() => setScreen('claim')}
            >
              <ArrowLeft size={20} strokeWidth={2.25} />
            </button>
            <h1 className="claim-submitted-header__title">Claim submitted</h1>
            <span className="claim-submitted-header__spacer" aria-hidden="true" />
          </header>

          <img className="claim-submitted-art" src={coverVerificationArt} alt="" aria-hidden="true" />

          <section className="claim-submitted-hero" aria-label="Claim submitted">
            <div className="claim-submitted-hero__icon" aria-hidden="true">
              <img src={claimDocumentIcon} alt="" />
            </div>
            <h2 className="claim-submitted-hero__title">Claim submitted</h2>
            <p className="claim-submitted-hero__subtitle">
              SAFE has received your claim and will review your details and documents.
            </p>
          </section>

          <section className="claim-submitted-reference" aria-label="Reference details">
            <div className="claim-submitted-row claim-submitted-row--reference">
              <span className="claim-submitted-row__label">Reference</span>
              <strong className="claim-submitted-row__value claim-submitted-row__value--reference">
                {submittedClaim.reference}
              </strong>
            </div>
            <div className="claim-submitted-row">
              <span className="claim-submitted-row__label">Status</span>
              <span className="claim-submitted-row__pill">{claimStatusLabel(submittedClaim.status)}</span>
            </div>
            <div className="claim-submitted-row claim-submitted-row--last">
              <span className="claim-submitted-row__label">Submitted</span>
              <strong className="claim-submitted-row__value">
                {new Date(submittedClaim.updatedAt || submittedClaim.createdAt).toLocaleString('en-GB')}
              </strong>
            </div>
          </section>

          <div className="claim-submitted-actions">
            <button
              type="button"
              className="claim-submitted-actions__primary"
              onClick={() => openClaimDetail?.(submittedClaim.id)}
            >
              View claim
            </button>
            <button
              type="button"
              className="claim-submitted-actions__secondary"
              onClick={() => setScreen('claim')}
            >
              Done
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`screen claim-flow-screen ${
        step === 3 ? 'claim-flow-screen--upload' : step === 4 ? 'claim-flow-screen--review' : 'claim-flow-screen--describe'
      }`}
    >
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
            <article className="claims-empty-card claims-empty-card--in-panel">
              <img className="claims-empty-card__art" src={coverVerificationArt} alt="" aria-hidden="true" />
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
            <div className="claim-input-wrapper">
              <Calendar className="claim-input-icon" size={18} />
              <input
                type="date"
                value={accidentDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setAccidentDate(e.target.value)}
              />
            </div>
          </label>
          <label className="claim-field">
            <span>Accident time</span>
            <div className="claim-input-wrapper">
              <Clock className="claim-input-icon" size={18} />
              <input type="time" value={accidentTime} onChange={(e) => setAccidentTime(e.target.value)} />
            </div>
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
          <div className="claim-fieldset" role="group" aria-labelledby="injured-legend">
            <span id="injured-legend" className="claim-fieldset legend" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'rgba(16, 24, 32, 0.56)' }}>Were you injured?</span>
            <div className="claim-selectable-group">
              <button
                type="button"
                className={`claim-selectable-card ${injured === true ? 'claim-selectable-card--active' : ''}`}
                onClick={() => setInjured(true)}
              >
                <div className="claim-selectable-card__radio-circle">
                  {injured === true && <div className="claim-selectable-card__radio-inner" />}
                </div>
                <span>Yes</span>
              </button>
              <button
                type="button"
                className={`claim-selectable-card ${injured === false ? 'claim-selectable-card--active' : ''}`}
                onClick={() => setInjured(false)}
              >
                <div className="claim-selectable-card__radio-circle">
                  {injured === false && <div className="claim-selectable-card__radio-inner" />}
                </div>
                <span>No</span>
              </button>
            </div>
            {/* Screen-reader accessible radio group */}
            <div className="sr-only">
              <input
                type="radio"
                name="injured"
                checked={injured === true}
                onChange={() => setInjured(true)}
              />
              <input
                type="radio"
                name="injured"
                checked={injured === false}
                onChange={() => setInjured(false)}
              />
            </div>
          </div>
          <div className="claim-fieldset" role="group" aria-labelledby="vehicle-legend">
            <span id="vehicle-legend" className="claim-fieldset legend" style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'rgba(16, 24, 32, 0.56)' }}>Was the vehicle involved?</span>
            <div className="claim-selectable-group">
              <button
                type="button"
                className={`claim-selectable-card ${vehicleInvolved === true ? 'claim-selectable-card--active' : ''}`}
                onClick={() => setVehicleInvolved(true)}
              >
                <div className="claim-selectable-card__radio-circle">
                  {vehicleInvolved === true && <div className="claim-selectable-card__radio-inner" />}
                </div>
                <span>Yes</span>
              </button>
              <button
                type="button"
                className={`claim-selectable-card ${vehicleInvolved === false ? 'claim-selectable-card--active' : ''}`}
                onClick={() => setVehicleInvolved(false)}
              >
                <div className="claim-selectable-card__radio-circle">
                  {vehicleInvolved === false && <div className="claim-selectable-card__radio-inner" />}
                </div>
                <span>No</span>
              </button>
            </div>
            {/* Screen-reader accessible radio group */}
            <div className="sr-only">
              <input
                type="radio"
                name="vehicle"
                checked={vehicleInvolved === true}
                onChange={() => setVehicleInvolved(true)}
              />
              <input
                type="radio"
                name="vehicle"
                checked={vehicleInvolved === false}
                onChange={() => setVehicleInvolved(false)}
              />
            </div>
          </div>
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
          {!eligibility.uploadEnabled ? (
            <p className="claims-upload-notice" role="status">
              Document upload is not connected yet.
            </p>
          ) : uploadNotice ? (
            <p className="claims-upload-notice" role="status">
              {uploadNotice}
            </p>
          ) : null}
          {[
            { key: 'police_report', label: 'Police report', typeIcon: policeReportIcon },
            { key: 'medical_note', label: 'Medical note', typeIcon: claimMedicalIcon },
            { key: 'photo', label: 'Accident photos', typeIcon: claimUploadPhotoIcon },
            { key: 'other', label: 'Vehicle / trip details', typeIcon: claimDocumentIcon },
          ].map((row) => {
            const file = pendingFiles[row.key];
            return (
              <label key={row.key} className={`claim-doc-row ${file ? 'claim-doc-row--filled' : ''}`}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setPendingFiles((prev) => ({ ...prev, [row.key]: f }));
                  }}
                />
                <div className="claim-doc-row__content">
                  <div className="claim-doc-row__icon-wrap">
                    {file ? <FileCheck size={20} /> : <UploadCloud size={20} />}
                  </div>
                  <div className="claim-doc-row__info">
                    <span className="claim-doc-row__label">
                      <img className="claim-doc-row__type-icon" src={row.typeIcon} alt="" aria-hidden="true" />
                      {row.label}
                    </span>
                    {file ? (
                      <span className="claim-doc-row__filename">{file.name}</span>
                    ) : (
                      <span className="claim-doc-row__hint">PDF, JPG, PNG up to 5MB</span>
                    )}
                  </div>
                  {file && (
                    <button
                      type="button"
                      className="claim-doc-row__remove-btn"
                      aria-label={`Remove ${row.label}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingFiles((prev) => ({ ...prev, [row.key]: null }));
                      }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </label>
            );
          })}
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
