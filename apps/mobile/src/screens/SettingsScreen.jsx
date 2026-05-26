import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  Globe,
  KeyRound,
  LogOut,
  RefreshCcw,
  Shield,
  Trash2,
  User,
  X,
} from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import {
  deleteAccount,
  envLabel,
  formatAccountCreatedAt,
  getLegalLinks,
  loadSettingsBundle,
  logout,
  readCachedSettings,
  requestDataExport,
  writeCachedSettings,
} from '../services/settings.js';

const SAFE_GREEN = '#007A3D';

function SettingsRow({
  title,
  subtitle,
  onClick,
  disabled = false,
  destructive = false,
  showChevron = true,
  Icon,
}) {
  const Tag = disabled ? 'div' : 'button';
  return (
    <Tag
      type={disabled ? undefined : 'button'}
      className={`settings-row${disabled ? ' settings-row--disabled' : ''}${
        destructive ? ' settings-row--destructive' : ''
      }`}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled || undefined}
    >
      <span className="settings-row__main">
        {Icon ? (
          <span className="settings-row__icon" style={{ display: 'inline-flex', marginBottom: 4 }}>
            <Icon size={18} strokeWidth={2.25} color={destructive ? '#c41e3a' : SAFE_GREEN} />
          </span>
        ) : null}
        <span className="settings-row__title">{title}</span>
        <span className="settings-row__subtitle">{subtitle}</span>
      </span>
      {showChevron && !disabled ? (
        <ChevronRight className="settings-row__chevron" size={20} strokeWidth={2.25} aria-hidden="true" />
      ) : null}
    </Tag>
  );
}

export default function SettingsScreen({ session, setScreen, setSession }) {
  const cached = readCachedSettings();
  const [bundle, setBundle] = useState(cached);
  const [loading, setLoading] = useState(() => !cached);
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [inlineNotice, setInlineNotice] = useState('');
  const [sheet, setSheet] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');
  const [dataExportMessage, setDataExportMessage] = useState('');
  const [dataExportBusy, setDataExportBusy] = useState(false);

  const bundleRef = useRef(bundle);
  bundleRef.current = bundle;
  const token = session?.token || '';

  const config = bundle?.config ?? null;
  const account = bundle?.account ?? null;
  const legal = getLegalLinks(config);
  const caps = config?.capabilities ?? {};
  const showDevEnv = import.meta.env.DEV;

  const loadSettings = useCallback(async () => {
    if (!token) {
      setBundle(null);
      setLoading(false);
      setLoadError('');
      setSyncWarning('');
      writeCachedSettings(null);
      return;
    }

    const hadBundle = Boolean(bundleRef.current);
    if (!hadBundle) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await loadSettingsBundle(token);
      setBundle(next);
      writeCachedSettings(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedSettings()) {
        setSyncWarning('Could not refresh settings. Showing your last saved details.');
        setLoadError('');
      } else {
        setLoadError('Couldn’t load settings');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const stored = readCachedSettings();
    if (stored) {
      setBundle(stored);
      setLoading(false);
    }
    loadSettings();
  }, [loadSettings]);

  const closeSheet = () => {
    setSheet(null);
    setDeleteConfirmText('');
    setDeleteMessage('');
    setDataExportMessage('');
  };

  const handleBack = () => setScreen?.('profile');

  const openLegal = (url, fallbackMessage) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setInlineNotice(fallbackMessage);
  };

  const handleDownloadData = async () => {
    if (!token) return;
    setDataExportBusy(true);
    setDataExportMessage('');
    try {
      const result = await requestDataExport(token);
      setDataExportMessage(result.message);
      if (!result.ok) {
        setSheet('dataExport');
      } else {
        setInlineNotice(result.message);
      }
    } catch {
      setInlineNotice('Could not request your data. Check your connection and try again.');
    } finally {
      setDataExportBusy(false);
    }
  };

  const handleLogoutConfirm = () => {
    logout();
    setSession?.({ token: '', user: null, ready: true });
    closeSheet();
    setScreen?.('login');
  };

  const handleDeleteContinue = async () => {
    if (!token) return;
    setDeleteBusy(true);
    setDeleteMessage('');
    try {
      const result = await deleteAccount(token, 'DELETE');
      if (result.ok && result.deleted) {
        logout();
        setSession?.({ token: '', user: null, ready: true });
        closeSheet();
        setScreen?.('login');
        return;
      }
      setDeleteMessage(result.message || 'Account deletion is not connected yet.');
    } catch {
      setDeleteMessage('Could not delete account. Check your connection and try again.');
    } finally {
      setDeleteBusy(false);
    }
  };

  const showFullError = !loading && Boolean(loadError) && !bundle;
  const showContent = Boolean(bundle) && !showFullError;

  const displayName =
    account?.fullName ||
    session?.user?.passengerProfile?.fullName ||
    'Account holder';
  const maskedPhone = account?.maskedPhone || 'Phone not added';
  const emailLine = account?.email || 'Not added';
  const createdLine = formatAccountCreatedAt(account?.createdAt);

  const appVersion = config?.appVersion || '1.0.0';
  const environmentLine = envLabel(config?.appEnv);

  return (
    <main className="screen settings-screen settings-screen-board">
      <div className="settings-scroll">
        <header className="settings-header">
          <button
            type="button"
            className="settings-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="settings-header__title">Settings</h1>
          <span className="settings-header__spacer" aria-hidden="true" />
        </header>

        <section className="settings-title-area">
          <h2 className="settings-title-area__heading">Settings</h2>
          <p className="settings-title-area__subtitle">
            Manage your SAFE account, privacy, security, and app preferences.
          </p>
        </section>

        {syncWarning ? (
          <p className="settings-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        {inlineNotice ? (
          <p className="settings-inline-notice" role="status">
            {inlineNotice}
          </p>
        ) : null}

        {showFullError ? (
          <section className="settings-error" aria-live="polite">
            <h3 className="settings-error__title">Couldn&apos;t load settings</h3>
            <p className="settings-error__subtitle">Check your connection and try again.</p>
            <button type="button" className="settings-error__retry" onClick={loadSettings}>
              <RefreshCcw size={18} strokeWidth={2.25} />
              Retry
            </button>
          </section>
        ) : null}

        {showContent ? (
          <>
            <section className="settings-section" aria-labelledby="settings-account-heading">
              <h3 id="settings-account-heading" className="settings-section__title">
                Account
              </h3>
              <div className="settings-card">
                <SettingsRow
                  title="Personal details"
                  subtitle="Name, phone number, and account information."
                  Icon={User}
                  onClick={() => setSheet('personal')}
                />
                <SettingsRow
                  title="Login and security"
                  subtitle="Password and account access."
                  Icon={KeyRound}
                  onClick={() => setSheet('loginSecurity')}
                />
                <SettingsRow
                  title="Language"
                  subtitle={caps.multipleLanguages ? 'Choose your language' : 'English only for now.'}
                  Icon={Globe}
                  disabled={!caps.multipleLanguages}
                />
                <SettingsRow
                  title="Currency"
                  subtitle={config?.currency?.label || 'Zambian Kwacha (ZMW)'}
                  disabled={!caps.multiCurrency}
                  showChevron={false}
                />
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-privacy-heading">
              <h3 id="settings-privacy-heading" className="settings-section__title">
                Privacy and data
              </h3>
              <div className="settings-card">
                <SettingsRow
                  title="Data and privacy"
                  subtitle="How SAFE uses your account and claim information."
                  Icon={Shield}
                  onClick={() => setSheet('privacy')}
                />
                <SettingsRow
                  title="Download my data"
                  subtitle="Request a copy of your SAFE account data."
                  Icon={FileText}
                  onClick={handleDownloadData}
                  showChevron={false}
                />
                <SettingsRow
                  title="Delete account"
                  subtitle="Permanently remove your SAFE account."
                  Icon={Trash2}
                  destructive
                  onClick={() => setSheet('delete1')}
                />
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-legal-heading">
              <h3 id="settings-legal-heading" className="settings-section__title">
                Legal
              </h3>
              <div className="settings-card">
                <SettingsRow
                  title="Terms of service"
                  subtitle="SAFE usage terms."
                  onClick={() =>
                    openLegal(legal.terms, 'Terms link not configured yet.')
                  }
                />
                <SettingsRow
                  title="Privacy policy"
                  subtitle="How SAFE handles your data."
                  onClick={() =>
                    openLegal(legal.privacy, 'Privacy link not configured yet.')
                  }
                />
                <SettingsRow
                  title="Claims policy"
                  subtitle="Claim rules, documents, and review process."
                  onClick={() =>
                    openLegal(legal.claimsPolicy, 'Claims policy link not configured yet.')
                  }
                />
              </div>
            </section>

            <section className="settings-section" aria-labelledby="settings-app-heading">
              <h3 id="settings-app-heading" className="settings-section__title">
                App
              </h3>
              <div className="settings-card">
                <SettingsRow
                  title="App version"
                  subtitle={appVersion}
                  disabled
                  showChevron={false}
                />
                {showDevEnv ? (
                  <SettingsRow
                    title="Environment"
                    subtitle={environmentLine}
                    disabled
                    showChevron={false}
                  />
                ) : null}
                <SettingsRow
                  title="Sign out"
                  subtitle="Sign out of this device."
                  Icon={LogOut}
                  onClick={() => setSheet('logout')}
                />
              </div>
            </section>
          </>
        ) : null}

        <BottomScrollSpacer height={180} />
      </div>

      {sheet ? (
        <div className="settings-sheet-overlay" role="presentation" onClick={closeSheet}>
          <div
            className="settings-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-sheet-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="settings-sheet__handle" aria-hidden="true" />
            <div className="settings-sheet__header">
              <h2 id="settings-sheet-title" className="settings-sheet__title">
                {sheet === 'personal' && 'Personal details'}
                {sheet === 'loginSecurity' && 'Login and security'}
                {sheet === 'privacy' && 'Data and privacy'}
                {sheet === 'delete1' && 'Delete account?'}
                {sheet === 'delete2' && 'Confirm deletion'}
                {sheet === 'logout' && 'Sign out?'}
                {sheet === 'dataExport' && 'Download my data'}
              </h2>
              <button
                type="button"
                className="settings-sheet__close"
                aria-label="Close"
                onClick={closeSheet}
              >
                <X size={20} strokeWidth={2.25} />
              </button>
            </div>

            {sheet === 'personal' ? (
              <>
                <dl className="settings-detail-list">
                  <div>
                    <dt>Full name</dt>
                    <dd>{displayName}</dd>
                  </div>
                  <div>
                    <dt>Phone number</dt>
                    <dd>{maskedPhone}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{emailLine}</dd>
                  </div>
                  {createdLine ? (
                    <div>
                      <dt>Account created</dt>
                      <dd>{createdLine}</dd>
                    </div>
                  ) : null}
                </dl>
                <p className="settings-sheet__notice">
                  {caps.accountEdit
                    ? 'Account editing is not connected yet.'
                    : 'Account editing is not connected yet.'}
                </p>
              </>
            ) : null}

            {sheet === 'loginSecurity' ? (
              <>
                <div className="settings-security-row">
                  <span className="settings-security-row__title">Change password</span>
                  <span className="settings-security-row__badge">Not connected</span>
                </div>
                <p className="settings-sheet__notice">
                  Password changes are not connected yet.
                </p>
                <div className="settings-security-row">
                  <span className="settings-security-row__title">Active sessions</span>
                  <span className="settings-security-row__badge">Not available</span>
                </div>
                <div className="settings-security-row">
                  <span className="settings-security-row__title">Two-step verification</span>
                  <span className="settings-security-row__badge">Coming later</span>
                </div>
              </>
            ) : null}

            {sheet === 'privacy' ? (
              <p className="settings-sheet__body">
                SAFE uses your account, cover, claim, trip, payment, and trusted contact
                information to provide cover, support claims, reduce fraud, and improve safety.
                <br />
                <br />
                Trusted contact phone numbers are used for safety or claim follow-up when needed.
              </p>
            ) : null}

            {sheet === 'delete1' ? (
              <>
                <p className="settings-sheet__body">
                  This will permanently remove your SAFE account access and may affect your
                  cover, claims, payment methods, and trusted contacts.
                </p>
                <div className="settings-sheet__actions">
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--secondary"
                    onClick={closeSheet}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--destructive"
                    onClick={() => {
                      setDeleteConfirmText('');
                      setDeleteMessage('');
                      setSheet('delete2');
                    }}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : null}

            {sheet === 'delete2' ? (
              <>
                <p className="settings-sheet__body">Type DELETE to confirm.</p>
                <label className="settings-sheet__field-label" htmlFor="settings-delete-confirm">
                  Confirmation
                </label>
                <input
                  id="settings-delete-confirm"
                  className="settings-sheet__input"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                  aria-label="Type DELETE to confirm account deletion"
                />
                {deleteMessage ? (
                  <p className="settings-sheet__notice" role="alert">
                    {deleteMessage}
                  </p>
                ) : null}
                <div className="settings-sheet__actions">
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--secondary"
                    onClick={() => setSheet('delete1')}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--destructive"
                    disabled={deleteConfirmText !== 'DELETE' || deleteBusy}
                    onClick={handleDeleteContinue}
                  >
                    {deleteBusy ? 'Deleting…' : 'Delete account'}
                  </button>
                </div>
              </>
            ) : null}

            {sheet === 'logout' ? (
              <>
                <p className="settings-sheet__body">
                  You will need to log in again to access your SAFE cover and claims.
                </p>
                <div className="settings-sheet__actions">
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--secondary"
                    onClick={closeSheet}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="settings-sheet__btn settings-sheet__btn--primary"
                    onClick={handleLogoutConfirm}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : null}

            {sheet === 'dataExport' && dataExportMessage ? (
              <p className="settings-sheet__body" role="status">
                {dataExportMessage}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
