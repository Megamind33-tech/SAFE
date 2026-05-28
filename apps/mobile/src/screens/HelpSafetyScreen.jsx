import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  RefreshCcw,
  Shield,
  X,
} from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import { formatContactMeta, getContactInitials } from '../services/trustedContacts.js';
import roadToSecurityArt from '../assets/transport/mint_green_road_to_security_and_peace_transparent.png';
import {
  createSupportReport,
  getHelpSafetyConfig,
  getSupportContactConfig,
  getTrustedContactDialUrl,
  getTrustedContactsForEmergency,
  readCachedHelpSafetyConfig,
  REPORT_PROBLEM_TYPES,
  writeCachedHelpSafetyConfig,
} from '../services/helpSafety.js';

const ACCIDENT_STEPS = [
  {
    title: 'Get to safety',
    body: 'Move away from traffic or danger if you can.',
  },
  {
    title: 'Get medical help',
    body: 'Visit a clinic, hospital, or call emergency services if needed.',
  },
  {
    title: 'Report the accident',
    body: 'Get a police report or official incident reference where required.',
  },
  {
    title: 'Capture evidence',
    body: 'Take clear photos of the vehicle, location, injuries, and documents.',
  },
  {
    title: 'Submit your claim',
    body: 'Use SAFE claim flow and upload required documents.',
  },
];

const CHECKLIST_ITEMS = [
  { key: 'cover', label: 'Active SAFE cover', check: (ctx) => Boolean(ctx.hasActiveCover) },
  { key: 'datetime', label: 'Accident date and time', check: (ctx) => Boolean(ctx.hasClaimDraft) },
  { key: 'trip', label: 'Trip or vehicle details', check: (ctx) => Boolean(ctx.hasActiveCover) },
  { key: 'police', label: 'Police report or incident reference', check: (ctx) => Boolean(ctx.hasPoliceRef) },
  { key: 'medical', label: 'Medical report or treatment note', check: (ctx) => Boolean(ctx.hasHospitalDoc) },
  { key: 'photos', label: 'Photos of the accident or documents', check: () => false },
  { key: 'driver', label: 'Contact details of driver/operator if available', check: () => false },
];

const DOCUMENT_ROWS = [
  {
    title: 'Police report',
    body: 'Used to confirm the accident was reported.',
  },
  {
    title: 'Medical note',
    body: 'Used to confirm treatment or injury details.',
  },
  {
    title: 'Photos',
    body: 'Used to support accident location, vehicle, or damage evidence.',
  },
  {
    title: 'Trip details',
    body: 'Used to connect the cover to the journey.',
  },
];

const FRAUD_BULLETS = [
  'Checks cover validity',
  'Reviews accident timing',
  'Compares claim details with uploaded documents',
  'Flags duplicate or suspicious claims',
  'May contact trusted contacts or transport partners for follow-up',
];

export default function HelpSafetyScreen({
  session,
  setScreen,
  openClaimFlow,
  activeCover,
  claimDraft,
  policeReference,
  hospitalSlipUrl,
}) {
  const [config, setConfig] = useState(() => readCachedHelpSafetyConfig());
  const [configLoading, setConfigLoading] = useState(!readCachedHelpSafetyConfig());
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [sheetMode, setSheetMode] = useState(null);
  const [reportType, setReportType] = useState('claim_issue');
  const [reportMessage, setReportMessage] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [dialBusyId, setDialBusyId] = useState('');

  const checklistRef = useRef(null);
  const configRef = useRef(config);
  configRef.current = config;
  const token = session?.token || '';

  const support = getSupportContactConfig(config);

  const checklistContext = {
    hasActiveCover: Boolean(activeCover),
    hasClaimDraft: Boolean(claimDraft?.description?.trim()),
    hasPoliceRef: Boolean(policeReference?.trim()),
    hasHospitalDoc: Boolean(hospitalSlipUrl?.trim()),
  };

  const loadConfig = useCallback(async () => {
    if (!token) {
      setConfig(null);
      setConfigLoading(false);
      setLoadError('');
      setSyncWarning('');
      writeCachedHelpSafetyConfig(null);
      return;
    }

    const hadConfig = Boolean(configRef.current);
    if (!hadConfig) {
      setConfigLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await getHelpSafetyConfig(token);
      setConfig(next);
      writeCachedHelpSafetyConfig(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedHelpSafetyConfig()) {
        setSyncWarning('Could not refresh help options. Showing the last saved guidance.');
        setLoadError('');
      } else {
        setLoadError('Could not load help options.');
        setSyncWarning('');
      }
    } finally {
      setConfigLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const loadEmergencyContacts = useCallback(async () => {
    if (!token) return [];
    setContactsLoading(true);
    try {
      const list = await getTrustedContactsForEmergency(token);
      setEmergencyContacts(list);
      return list;
    } catch {
      setEmergencyContacts([]);
      return [];
    } finally {
      setContactsLoading(false);
    }
  }, [token]);

  const handleBack = () => {
    setScreen?.('profile');
  };

  const handleCallEmergencyContact = async () => {
    const list = emergencyContacts.length ? emergencyContacts : await loadEmergencyContacts();
    if (!list.length) {
      setSheetMode('no-contacts');
      return;
    }
    setSheetMode('contact-picker');
  };

  const handleDialContact = async (contactId) => {
    if (!token) return;
    setDialBusyId(contactId);
    try {
      const dialUrl = await getTrustedContactDialUrl(token, contactId);
      if (dialUrl) {
        window.location.href = dialUrl;
      }
    } catch {
      setReportError('Could not start the call. Try again.');
    } finally {
      setDialBusyId('');
    }
  };

  const scrollToChecklist = () => {
    checklistRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const closeSheet = () => {
    if (reportSubmitting) return;
    setSheetMode(null);
    setReportError('');
    setReportSuccess('');
  };

  const handleSubmitReport = async () => {
    setReportError('');
    setReportSuccess('');
    const trimmed = reportMessage.trim();
    if (trimmed.length < 10) {
      setReportError('Tell us a bit more about the problem (at least 10 characters).');
      return;
    }
    if (!token) {
      setReportError('Sign in to send a report.');
      return;
    }

    setReportSubmitting(true);
    try {
      await createSupportReport(token, {
        problemType: reportType,
        message: trimmed,
      });
      setReportSuccess('Your report was sent to SAFE support.');
      setReportMessage('');
    } catch (error) {
      const message = error?.message || '';
      if (/not connected|404|not found/i.test(message)) {
        setReportError('Support reporting is not connected yet.');
      } else {
        setReportError(message || 'Could not send your report. Try again.');
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  const showConfigError = !configLoading && Boolean(loadError) && !config && !readCachedHelpSafetyConfig();

  return (
    <main className="screen help-safety-screen help-safety-screen-board">
      <div className="help-safety-scroll">
        <header className="help-safety-header">
          <button
            type="button"
            className="help-safety-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="help-safety-header__title">Help &amp; Safety</h1>
          <button
            type="button"
            className="help-safety-header__action"
            aria-label="Chat with support"
            onClick={() => setScreen?.('chat')}
          >
            <MessageCircle size={22} strokeWidth={2.25} color="#101820" />
          </button>
        </header>

        <section className="help-safety-title-area">
          <h2 className="help-safety-title-area__heading">Help &amp; safety</h2>
          <p className="help-safety-title-area__subtitle">
            Clear steps for accidents, claims, documents, and support.
          </p>
        </section>

        {syncWarning ? (
          <p className="help-safety-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        {showConfigError ? (
          <section className="help-safety-error" aria-live="polite">
            <h3 className="help-safety-error__title">Couldn&apos;t load help options</h3>
            <p className="help-safety-error__subtitle">Check your connection and try again.</p>
            <button type="button" className="help-safety-error__retry" onClick={loadConfig}>
              <RefreshCcw size={18} strokeWidth={2.25} />
              Retry
            </button>
          </section>
        ) : null}

        <section className="help-safety-emergency-card" aria-label="In an accident">
          <img className="help-safety-emergency-card__art" src={roadToSecurityArt} alt="" aria-hidden="true" />
          <div className="help-safety-emergency-card__icon" aria-hidden="true">
            <AlertTriangle size={28} strokeWidth={2.25} color="#c62828" />
          </div>
          <h3 className="help-safety-emergency-card__title">In an accident?</h3>
          <p className="help-safety-emergency-card__body">
            Stay safe first. Move away from danger, get medical help, and report the incident before
            starting a claim.
          </p>
          <div className="help-safety-emergency-card__actions">
            <button
              type="button"
              className="help-safety-emergency-card__btn help-safety-emergency-card__btn--call"
              onClick={handleCallEmergencyContact}
              disabled={contactsLoading}
            >
              <Phone size={18} strokeWidth={2.25} />
              Call emergency contact
            </button>
            <button
              type="button"
              className="help-safety-emergency-card__btn"
              onClick={() => openClaimFlow?.(1)}
            >
              Start a claim
            </button>
            <button
              type="button"
              className="help-safety-emergency-card__btn help-safety-emergency-card__btn--ghost"
              onClick={scrollToChecklist}
            >
              <ClipboardList size={18} strokeWidth={2.25} />
              View claim checklist
            </button>
          </div>
        </section>

        <section className="help-safety-section-card" aria-labelledby="help-accident-steps">
          <h3 id="help-accident-steps" className="help-safety-section-card__title">
            What to do first
          </h3>
          <ol className="help-safety-steps">
            {ACCIDENT_STEPS.map((step, index) => (
              <li key={step.title} className="help-safety-steps__item">
                <span className="help-safety-steps__num">{index + 1}</span>
                <span className="help-safety-steps__text">
                  <strong>{step.title}</strong>
                  <small>{step.body}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          ref={checklistRef}
          className="help-safety-section-card"
          aria-labelledby="help-claim-checklist"
        >
          <h3 id="help-claim-checklist" className="help-safety-section-card__title">
            Claim checklist
          </h3>
          <ul className="help-safety-checklist">
            {CHECKLIST_ITEMS.map((item) => {
              const met = item.check(checklistContext);
              return (
                <li
                  key={item.key}
                  className={`help-safety-checklist__row${met ? ' help-safety-checklist__row--met' : ''}`}
                >
                  <span className="help-safety-checklist__mark" aria-hidden="true">
                    {met ? <Check size={16} strokeWidth={2.5} color="#008748" /> : null}
                  </span>
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="help-safety-section-card" aria-labelledby="help-documents">
          <h3 id="help-documents" className="help-safety-section-card__title">
            Documents SAFE may ask for
          </h3>
          <ul className="help-safety-docs">
            {DOCUMENT_ROWS.map((row) => (
              <li key={row.title} className="help-safety-docs__row">
                <FileText size={20} strokeWidth={2.25} color="#007a3d" aria-hidden="true" />
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.body}</small>
                </span>
              </li>
            ))}
          </ul>
          <p className="help-safety-note">
            SAFE may review documents for authenticity before a claim is approved.
          </p>
        </section>

        <section className="help-safety-section-card" aria-labelledby="help-fraud">
          <h3 id="help-fraud" className="help-safety-section-card__title">
            How SAFE protects claims
          </h3>
          <p className="help-safety-section-card__lead">
            SAFE reviews claim details, documents, trip timing, contact information, and supporting
            evidence before approval.
          </p>
          <ul className="help-safety-bullets">
            {FRAUD_BULLETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="help-safety-section-card" aria-labelledby="help-support">
          <h3 id="help-support" className="help-safety-section-card__title">
            Contact SAFE support
          </h3>
          <div className="help-safety-support-rows">
            <button
              type="button"
              className="help-safety-support-row"
              onClick={() => setScreen?.('chat')}
            >
              <MessageCircle size={22} strokeWidth={2.25} color="#007a3d" />
              <span>
                <strong>Chat with support</strong>
                <small>Get help with cover, claims, or account issues.</small>
              </span>
              <ChevronRight size={18} color="rgba(16,24,32,0.36)" />
            </button>

            {support.supportPhone ? (
              <a className="help-safety-support-row" href={`tel:${support.supportPhone.replace(/\s/g, '')}`}>
                <Phone size={22} strokeWidth={2.25} color="#007a3d" />
                <span>
                  <strong>Call SAFE</strong>
                  <small>
                    {support.supportHours
                      ? `Speak to support during ${support.supportHours}.`
                      : 'Speak to support during business hours.'}
                  </small>
                </span>
                <ChevronRight size={18} color="rgba(16,24,32,0.36)" />
              </a>
            ) : (
              <div className="help-safety-support-row help-safety-support-row--static">
                <Phone size={22} strokeWidth={2.25} color="#007a3d" />
                <span>
                  <strong>Call SAFE</strong>
                  <small>Support number not configured yet.</small>
                </span>
              </div>
            )}

            {support.supportEmail ? (
              <a className="help-safety-support-row" href={`mailto:${support.supportEmail}`}>
                <Mail size={22} strokeWidth={2.25} color="#007a3d" />
                <span>
                  <strong>Email SAFE</strong>
                  <small>Send documents or claim questions.</small>
                </span>
                <ChevronRight size={18} color="rgba(16,24,32,0.36)" />
              </a>
            ) : (
              <div className="help-safety-support-row help-safety-support-row--static">
                <Mail size={22} strokeWidth={2.25} color="#007a3d" />
                <span>
                  <strong>Email SAFE</strong>
                  <small>Support email not configured yet.</small>
                </span>
              </div>
            )}

            <button
              type="button"
              className="help-safety-support-row"
              onClick={() => {
                setReportError('');
                setReportSuccess('');
                setSheetMode('report');
              }}
            >
              <Shield size={22} strokeWidth={2.25} color="#007a3d" />
              <span>
                <strong>Report a problem</strong>
                <small>Tell us if something in the app is not working.</small>
              </span>
              <ChevronRight size={18} color="rgba(16,24,32,0.36)" />
            </button>
          </div>
        </section>

        <BottomScrollSpacer height={180} />
      </div>

      {sheetMode ? (
        <div className="help-safety-sheet-overlay" role="presentation" onClick={closeSheet}>
          <div
            className="help-safety-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-safety-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-safety-sheet__handle" aria-hidden="true" />
            <div className="help-safety-sheet__header">
              <h2 id="help-safety-sheet-title" className="help-safety-sheet__title">
                {sheetMode === 'contact-picker'
                  ? 'Call trusted contact'
                  : sheetMode === 'no-contacts'
                    ? 'Add a trusted contact first'
                    : 'Report a problem'}
              </h2>
              <button
                type="button"
                className="help-safety-sheet__close"
                aria-label="Close"
                onClick={closeSheet}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            {sheetMode === 'no-contacts' ? (
              <div className="help-safety-sheet__body">
                <p className="help-safety-sheet__text">
                  Add someone SAFE can contact if you are involved in an accident.
                </p>
                <button
                  type="button"
                  className="help-safety-sheet__primary"
                  onClick={() => {
                    closeSheet();
                    setScreen?.('trustedContacts');
                  }}
                >
                  Add trusted contact
                </button>
                <button type="button" className="help-safety-sheet__secondary" onClick={closeSheet}>
                  Cancel
                </button>
              </div>
            ) : null}

            {sheetMode === 'contact-picker' ? (
              <ul className="help-safety-contact-picker">
                {emergencyContacts.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      className="help-safety-contact-picker__row"
                      disabled={dialBusyId === contact.id}
                      onClick={() => handleDialContact(contact.id)}
                    >
                      <span className="help-safety-contact-picker__avatar" aria-hidden="true">
                        {getContactInitials(contact.name)}
                      </span>
                      <span className="help-safety-contact-picker__text">
                        <strong>{contact.name}</strong>
                        <small>{formatContactMeta(contact)}</small>
                      </span>
                      {contact.isPrimary ? (
                        <span className="help-safety-contact-picker__badge">Primary</span>
                      ) : null}
                      <Phone size={18} strokeWidth={2.25} color="#007a3d" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {sheetMode === 'report' ? (
              <div className="help-safety-sheet__form">
                <label className="help-safety-sheet__label" htmlFor="report-type">
                  Problem type
                </label>
                <select
                  id="report-type"
                  className="help-safety-sheet__select"
                  value={reportType}
                  onChange={(event) => setReportType(event.target.value)}
                >
                  {REPORT_PROBLEM_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <label className="help-safety-sheet__label" htmlFor="report-message">
                  Message
                </label>
                <textarea
                  id="report-message"
                  className="help-safety-sheet__textarea"
                  rows={4}
                  placeholder="Tell us what happened."
                  value={reportMessage}
                  onChange={(event) => setReportMessage(event.target.value)}
                />
                {reportError ? (
                  <p className="help-safety-sheet__field-error" role="alert">
                    {reportError}
                  </p>
                ) : null}
                {reportSuccess ? (
                  <p className="help-safety-sheet__field-success" role="status">
                    {reportSuccess}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="help-safety-sheet__primary"
                  disabled={reportSubmitting || reportMessage.trim().length < 10}
                  onClick={handleSubmitReport}
                >
                  {reportSubmitting ? 'Sending…' : 'Send report'}
                </button>
                <button type="button" className="help-safety-sheet__secondary" onClick={closeSheet}>
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
