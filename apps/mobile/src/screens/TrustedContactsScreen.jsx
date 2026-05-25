import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lock, MoreHorizontal, Plus, RefreshCcw, X } from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import {
  createTrustedContact,
  deleteTrustedContact,
  findDuplicateByPhone,
  formatContactMeta,
  getContactInitials,
  getTrustedContacts,
  readCachedTrustedContacts,
  RELATIONSHIP_OPTIONS,
  updateTrustedContact,
  normalizeZambianPhone,
  writeCachedTrustedContacts,
} from '../services/trustedContacts.js';

const EMPTY_FORM = {
  name: '',
  relationship: 'Sibling',
  phone: '',
  isPrimary: false,
};

function LoadingSkeleton() {
  return (
    <section className="trusted-contacts-skeleton" aria-live="polite" aria-busy="true">
      {[0, 1].map((item) => (
        <div className="trusted-contacts-skeleton__row" key={item}>
          <span className="trusted-contacts-skeleton__avatar" />
          <span className="trusted-contacts-skeleton__lines">
            <span className="trusted-contacts-skeleton__line trusted-contacts-skeleton__line--title" />
            <span className="trusted-contacts-skeleton__line trusted-contacts-skeleton__line--subtitle" />
          </span>
        </div>
      ))}
    </section>
  );
}

export default function TrustedContactsScreen({ session, setScreen }) {
  const [contacts, setContacts] = useState(() => readCachedTrustedContacts());
  const [loading, setLoading] = useState(() => readCachedTrustedContacts().length === 0);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [sheetMode, setSheetMode] = useState(null);
  const [editingContact, setEditingContact] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formNotice, setFormNotice] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);

  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;

  const token = session?.token || '';

  const loadContacts = useCallback(async () => {
    if (!token) {
      setContacts([]);
      setLoading(false);
      setLoadError('');
      setSyncWarning('');
      writeCachedTrustedContacts([]);
      return;
    }

    const hadContacts = contactsRef.current.length > 0;
    if (!hadContacts) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await getTrustedContacts(token);
      setContacts(next);
      writeCachedTrustedContacts(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (contactsRef.current.length > 0) {
        setSyncWarning('Could not refresh trusted contacts. Showing your last saved contacts.');
        setLoadError('');
      } else {
        setLoadError('Could not load trusted contacts.');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const cached = readCachedTrustedContacts();
    if (cached.length > 0) {
      setContacts(cached);
      setLoading(false);
    }
    loadContacts();
  }, [loadContacts]);

  const handleBack = () => {
    setScreen?.('profile');
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormNotice('');
    setSubmitError('');
    setEditingContact(null);
  };

  const openAddSheet = () => {
    resetForm();
    setForm({ ...EMPTY_FORM, isPrimary: contacts.length === 0 });
    setSheetMode('add');
  };

  const openEditSheet = (contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      relationship: contact.relationship,
      phone: '',
      isPrimary: contact.isPrimary,
    });
    setFieldErrors({});
    setFormNotice('');
    setSubmitError('');
    setSheetMode('edit');
  };

  const closeSheets = () => {
    if (saving) return;
    setSheetMode(null);
    resetForm();
  };

  const openDeleteConfirm = () => {
    setSheetMode('delete');
  };

  const hasContacts = contacts.length > 0;
  const showSkeleton = loading && !hasContacts;
  const showFullError = !loading && Boolean(loadError) && !hasContacts;
  const showEmpty = !loading && !loadError && !hasContacts;
  const showList = hasContacts;
  const showSecurity = showList || showEmpty;
  const showHeaderActions = !showSkeleton && !showFullError;

  const validateForm = () => {
    const trimmedName = form.name.trim();
    if (trimmedName.length < 2) {
      setFieldErrors({ name: 'Enter the contact’s full name (at least 2 characters).' });
      return null;
    }
    if (!RELATIONSHIP_OPTIONS.includes(form.relationship)) {
      setFieldErrors({ relationship: 'Choose a relationship.' });
      return null;
    }

    let normalized = null;
    if (sheetMode === 'add' || form.phone.trim()) {
      normalized = normalizeZambianPhone(form.phone);
      if (!normalized) {
        setFieldErrors({ phone: 'Use +260XXXXXXXXX, 09XXXXXXXX, or 9XXXXXXXX.' });
        return null;
      }
      const duplicate = findDuplicateByPhone(contacts, normalized, editingContact?.id);
      if (duplicate) {
        setFormNotice('This phone number is already saved as a trusted contact.');
        return null;
      }
    } else if (sheetMode === 'add') {
      setFieldErrors({ phone: 'Enter a phone number.' });
      return null;
    }

    setFieldErrors({});
    setFormNotice('');
    return { name: trimmedName, normalized };
  };

  const handleSave = async () => {
    setSubmitError('');
    const validation = validateForm();
    if (!validation) return;

    setSaving(true);
    try {
      if (sheetMode === 'add') {
        await createTrustedContact(token, {
          name: validation.name,
          relationship: form.relationship,
          phoneNumber: validation.normalized,
          isPrimary: form.isPrimary,
        });
      } else if (sheetMode === 'edit' && editingContact) {
        const payload = {
          name: validation.name,
          relationship: form.relationship,
          isPrimary: form.isPrimary,
        };
        if (validation.normalized) {
          payload.phoneNumber = validation.normalized;
        }
        await updateTrustedContact(token, editingContact.id, payload);
      }
      const next = await getTrustedContacts(token);
      setContacts(next);
      writeCachedTrustedContacts(next);
      closeSheets();
    } catch (error) {
      const message = error?.message || 'Could not save contact.';
      if (/already saved/i.test(message)) {
        setFormNotice('This phone number is already saved as a trusted contact.');
      } else {
        setSubmitError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingContact) return;
    setSaving(true);
    setSubmitError('');
    try {
      const next = await deleteTrustedContact(token, editingContact.id);
      setContacts(next);
      writeCachedTrustedContacts(next);
      closeSheets();
    } catch (error) {
      setSubmitError(error?.message || 'Could not remove contact.');
      setSheetMode('edit');
    } finally {
      setSaving(false);
    }
  };

  const formValid =
    form.name.trim().length >= 2 &&
    RELATIONSHIP_OPTIONS.includes(form.relationship) &&
    (sheetMode === 'edit' && !form.phone.trim()
      ? true
      : Boolean(normalizeZambianPhone(form.phone)));

  const sheetTitle =
    sheetMode === 'edit'
      ? 'Edit trusted contact'
      : sheetMode === 'delete'
        ? 'Remove trusted contact?'
        : 'Add trusted contact';

  return (
    <main className="screen trusted-contacts-screen trusted-contacts-screen-board">
      <div className="trusted-contacts-scroll">
        <header className="trusted-contacts-header">
          <button
            type="button"
            className="trusted-contacts-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="trusted-contacts-header__title">Trusted Contacts</h1>
          {showHeaderActions ? (
            <button
              type="button"
              className="trusted-contacts-header__action"
              aria-label="Add trusted contact"
              onClick={openAddSheet}
            >
              <Plus size={22} strokeWidth={2.25} color="#101820" />
            </button>
          ) : (
            <span className="trusted-contacts-header__spacer" aria-hidden="true" />
          )}
        </header>

        <section className="trusted-contacts-title-area">
          <h2 className="trusted-contacts-title-area__heading">Trusted contacts</h2>
          <p className="trusted-contacts-title-area__subtitle">
            People SAFE can contact during an accident or claim review.
          </p>
        </section>

        {showSkeleton ? <LoadingSkeleton /> : null}

        {syncWarning ? (
          <p className="trusted-contacts-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        {showFullError ? (
          <section className="trusted-contacts-error" aria-live="polite">
            <h3 className="trusted-contacts-error__title">Couldn&apos;t load trusted contacts</h3>
            <p className="trusted-contacts-error__subtitle">Check your connection and try again.</p>
            <button type="button" className="trusted-contacts-error__retry" onClick={loadContacts}>
              <RefreshCcw size={18} strokeWidth={2.25} />
              Retry
            </button>
          </section>
        ) : null}

        {showEmpty ? (
          <section className="trusted-contacts-empty" aria-label="No trusted contacts">
            <h3 className="trusted-contacts-empty__title">No trusted contacts added</h3>
            <p className="trusted-contacts-empty__subtitle">
              Add someone SAFE can contact if you are involved in an accident.
            </p>
            <button type="button" className="trusted-contacts-empty__cta" onClick={openAddSheet}>
              Add trusted contact
            </button>
          </section>
        ) : null}

        {showList ? (
          <section className="trusted-contacts-list" aria-label="Trusted contacts">
            {contacts.map((contact) => (
              <article
                key={contact.id}
                className="trusted-contact-card"
                role="button"
                tabIndex={0}
                onClick={() => openEditSheet(contact)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openEditSheet(contact);
                  }
                }}
              >
                <span className="trusted-contact-card__avatar" aria-hidden="true">
                  {getContactInitials(contact.name)}
                </span>
                <div className="trusted-contact-card__body">
                  <strong className="trusted-contact-card__name">{contact.name}</strong>
                  <span className="trusted-contact-card__meta">{formatContactMeta(contact)}</span>
                  <span
                    className={`trusted-contact-card__status${
                      contact.isVerified ? ' trusted-contact-card__status--verified' : ''
                    }`}
                  >
                    {contact.isVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
                {contact.isPrimary ? (
                  <span className="trusted-contact-card__badge trusted-contact-card__badge--primary">
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    className="trusted-contact-card__menu"
                    aria-label={`Edit ${contact.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditSheet(contact);
                    }}
                  >
                    <MoreHorizontal size={22} strokeWidth={2.25} color="#101820" />
                  </button>
                )}
              </article>
            ))}
          </section>
        ) : null}

        {showSecurity ? (
          <section className="trusted-contacts-security" aria-label="Security note">
            <Lock size={16} strokeWidth={2.25} color="#008748" className="trusted-contacts-security__icon" />
            <p>
              SAFE only uses trusted contacts for emergency support, claim follow-up, and safety
              communication.
            </p>
          </section>
        ) : null}

        <BottomScrollSpacer height={180} />
      </div>

      {sheetMode ? (
        <div className="trusted-contacts-sheet-overlay" role="presentation" onClick={closeSheets}>
          <div
            className={`trusted-contacts-sheet${
              sheetMode === 'delete' ? ' trusted-contacts-sheet--confirm' : ''
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="trusted-contacts-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="trusted-contacts-sheet__handle" aria-hidden="true" />
            <div className="trusted-contacts-sheet__header">
              <h2 id="trusted-contacts-sheet-title" className="trusted-contacts-sheet__title">
                {sheetTitle}
              </h2>
              <button
                type="button"
                className="trusted-contacts-sheet__close"
                aria-label="Close"
                onClick={closeSheets}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            {sheetMode === 'delete' ? (
              <div className="trusted-contacts-sheet__confirm">
                <p className="trusted-contacts-sheet__confirm-text">
                  SAFE will no longer use this person for emergency or claim follow-up.
                </p>
                <div className="trusted-contacts-sheet__confirm-actions">
                  <button
                    type="button"
                    className="trusted-contacts-sheet__confirm-cancel"
                    onClick={() => setSheetMode('edit')}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="trusted-contacts-sheet__confirm-remove"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    {saving ? 'Removing…' : 'Remove contact'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="trusted-contacts-sheet__form">
                <label className="trusted-contacts-sheet__label" htmlFor="tc-name">
                  Full name
                </label>
                <input
                  id="tc-name"
                  className="trusted-contacts-sheet__input"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, name: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, name: '' }));
                    setFormNotice('');
                  }}
                />
                {fieldErrors.name ? (
                  <p className="trusted-contacts-sheet__field-error">{fieldErrors.name}</p>
                ) : null}

                <label className="trusted-contacts-sheet__label" htmlFor="tc-relationship">
                  Relationship
                </label>
                <select
                  id="tc-relationship"
                  className="trusted-contacts-sheet__select"
                  value={form.relationship}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, relationship: event.target.value }));
                    setFieldErrors((prev) => ({ ...prev, relationship: '' }));
                  }}
                >
                  {RELATIONSHIP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {fieldErrors.relationship ? (
                  <p className="trusted-contacts-sheet__field-error">{fieldErrors.relationship}</p>
                ) : null}

                <label className="trusted-contacts-sheet__label" htmlFor="tc-phone">
                  Phone number
                </label>
                {sheetMode === 'edit' && editingContact ? (
                  <p className="trusted-contacts-sheet__hint">
                    Current: {editingContact.maskedPhone}. Enter a new number only if you want to change it.
                  </p>
                ) : null}
                <input
                  id="tc-phone"
                  className="trusted-contacts-sheet__input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+260XXXXXXXXX or 09XXXXXXXX"
                  value={form.phone}
                  onChange={(event) => {
                    const phone = event.target.value;
                    setForm((prev) => ({ ...prev, phone }));
                    setFieldErrors((prev) => ({ ...prev, phone: '' }));
                    setSubmitError('');
                    const normalized = normalizeZambianPhone(phone);
                    if (normalized) {
                      const duplicate = findDuplicateByPhone(contacts, normalized, editingContact?.id);
                      if (duplicate) {
                        setFormNotice('This phone number is already saved as a trusted contact.');
                        return;
                      }
                    }
                    setFormNotice('');
                  }}
                />
                {fieldErrors.phone ? (
                  <p className="trusted-contacts-sheet__field-error">{fieldErrors.phone}</p>
                ) : null}
                {formNotice ? (
                  <p className="trusted-contacts-sheet__field-notice">{formNotice}</p>
                ) : null}
                {submitError ? (
                  <p className="trusted-contacts-sheet__field-error">{submitError}</p>
                ) : null}

                <label className="trusted-contacts-sheet__toggle">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isPrimary: event.target.checked }))
                    }
                  />
                  <span>Set as primary contact</span>
                </label>

                <button
                  type="button"
                  className="trusted-contacts-sheet__save"
                  disabled={saving || !formValid || Boolean(formNotice)}
                  onClick={handleSave}
                >
                  {saving ? 'Saving…' : sheetMode === 'edit' ? 'Save changes' : 'Save contact'}
                </button>
                <button type="button" className="trusted-contacts-sheet__cancel" onClick={closeSheets}>
                  Cancel
                </button>
                {sheetMode === 'edit' ? (
                  <button
                    type="button"
                    className="trusted-contacts-sheet__remove-link"
                    onClick={openDeleteConfirm}
                  >
                    Remove contact
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
