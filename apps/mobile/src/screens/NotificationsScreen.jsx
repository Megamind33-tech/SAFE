import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bell, RefreshCcw } from 'lucide-react';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import NotificationToggleRow from '../components/NotificationToggleRow.jsx';
import {
  getNotificationPermissionState,
  getNotificationPreferences,
  notifyPermissionRequested,
  readCachedNotificationPreferences,
  requestNotificationPermission,
  updateNotificationPreference,
  writeCachedNotificationPreferences,
} from '../services/notificationPreferences.js';

const SECTIONS = [
  {
    id: 'important',
    title: 'Important alerts',
    items: [
      {
        key: 'coverExpiryReminders',
        title: 'Cover expiry reminders',
        subtitle: 'Alert me before my SAFE cover ends.',
      },
      {
        key: 'claimStatusUpdates',
        title: 'Claim status updates',
        subtitle:
          'Tell me when my claim is received, reviewed, approved, or needs action.',
      },
      {
        key: 'paymentUpdates',
        title: 'Payment updates',
        subtitle: 'Tell me when a payment succeeds, fails, or needs attention.',
      },
      {
        key: 'safetyEmergencyAlerts',
        title: 'Safety and emergency alerts',
        subtitle: 'Send alerts related to accident support or urgent account safety.',
      },
    ],
  },
  {
    id: 'trip',
    title: 'Trip and cover activity',
    items: [
      {
        key: 'coverPurchaseConfirmations',
        title: 'Cover purchase confirmations',
        subtitle: 'Send confirmation after I buy cover.',
      },
      {
        key: 'tripTimerAlerts',
        title: 'Trip cover timer alerts',
        subtitle: 'Remind me when trip cover is close to ending.',
      },
      {
        key: 'savedPolicyUpdates',
        title: 'Saved policy updates',
        subtitle: 'Alert me when policy details change.',
      },
    ],
  },
  {
    id: 'trusted',
    title: 'Trusted contacts',
    items: [
      {
        key: 'trustedContactChanges',
        title: 'Trusted contact changes',
        subtitle: 'Tell me when a trusted contact is added, edited, or removed.',
      },
      {
        key: 'emergencyContactAlerts',
        title: 'Emergency contact alerts',
        subtitle:
          'Allow SAFE to notify trusted contacts during claim or accident follow-up where needed.',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing and product updates',
    items: [
      {
        key: 'productUpdates',
        title: 'Product updates',
        subtitle: 'Send updates about new SAFE features.',
      },
      {
        key: 'offersPromotions',
        title: 'Offers and promotions',
        subtitle: 'Send occasional SAFE offers.',
      },
    ],
  },
];

function LoadingSkeleton() {
  return (
    <section className="notifications-skeleton" aria-live="polite" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="notifications-skeleton__card" key={item}>
          <span className="notifications-skeleton__line notifications-skeleton__line--title" />
          <span className="notifications-skeleton__line" />
          <span className="notifications-skeleton__line" />
        </div>
      ))}
    </section>
  );
}

export default function NotificationsScreen({ session, setScreen }) {
  const [prefs, setPrefs] = useState(() => readCachedNotificationPreferences());
  const [loading, setLoading] = useState(() => !readCachedNotificationPreferences());
  const [loadError, setLoadError] = useState('');
  const [syncWarning, setSyncWarning] = useState('');
  const [saveWarning, setSaveWarning] = useState('');
  const [savingKey, setSavingKey] = useState('');
  const [permission, setPermission] = useState(() => getNotificationPermissionState());
  const [requestingPermission, setRequestingPermission] = useState(false);

  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const token = session?.token || '';

  const loadPrefs = useCallback(async () => {
    if (!token) {
      setPrefs(null);
      setLoading(false);
      setLoadError('');
      setSyncWarning('');
      writeCachedNotificationPreferences(null);
      return;
    }

    const hadPrefs = Boolean(prefsRef.current);
    if (!hadPrefs) {
      setLoading(true);
      setLoadError('');
    }
    setSyncWarning('');

    try {
      const next = await getNotificationPreferences(token);
      setPrefs(next);
      writeCachedNotificationPreferences(next);
      setLoadError('');
      setSyncWarning('');
    } catch {
      if (readCachedNotificationPreferences()) {
        setSyncWarning(
          'Could not refresh notification settings. Showing your last saved preferences.'
        );
        setLoadError('');
      } else {
        setLoadError('Couldn’t load notification settings');
        setSyncWarning('');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const cached = readCachedNotificationPreferences();
    if (cached) {
      setPrefs(cached);
      setLoading(false);
    }
    loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    setPermission(getNotificationPermissionState());
  }, []);

  const handleBack = () => {
    setScreen?.('profile');
  };

  const handleToggle = async (key, nextValue) => {
    if (!prefs || !token) return;

    const previous = { ...prefs };
    const optimistic = { ...prefs, [key]: nextValue };
    setPrefs(optimistic);
    setSaveWarning('');
    setSavingKey(key);

    try {
      const updated = await updateNotificationPreference(token, key, nextValue);
      setPrefs(updated);
      writeCachedNotificationPreferences(updated);
    } catch {
      setPrefs(previous);
      setSaveWarning('Couldn’t save that change. Try again.');
    } finally {
      setSavingKey('');
    }
  };

  const handleRequestPermission = async () => {
    if (!token) return;
    setRequestingPermission(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      const granted = result === 'granted';
      const updated = await notifyPermissionRequested(token, granted);
      if (updated) {
        setPrefs(updated);
        writeCachedNotificationPreferences(updated);
      }
    } catch {
      setSaveWarning('Couldn’t update notification permission. Try again.');
    } finally {
      setRequestingPermission(false);
    }
  };

  const showSkeleton = loading && !prefs;
  const showFullError = !loading && Boolean(loadError) && !prefs;
  const showContent = Boolean(prefs) && !showFullError;

  const permissionGranted = permission === 'granted';
  const permissionDenied = permission === 'denied';
  const permissionUnsupported = permission === 'unsupported';

  const channels = prefs?.channelsSupported ?? { push: true, sms: false, email: false };

  return (
    <main className="screen notifications-screen notifications-screen-board">
      <div className="notifications-scroll">
        <header className="notifications-header">
          <button
            type="button"
            className="notifications-header__back"
            aria-label="Go back"
            onClick={handleBack}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="notifications-header__title">Notifications</h1>
          <span className="notifications-header__spacer" aria-hidden="true">
            <Bell size={22} strokeWidth={2.25} color="#101820" />
          </span>
        </header>

        <section className="notifications-title-area">
          <h2 className="notifications-title-area__heading">Notifications</h2>
          <p className="notifications-title-area__subtitle">
            Choose the alerts SAFE can send about cover, claims, payments, and safety.
          </p>
        </section>

        <div className="notifications-coming-soon-banner" role="note">
          Push notifications are coming soon. Your preferences are saved and will take effect when push delivery is enabled.
        </div>

        {showSkeleton ? <LoadingSkeleton /> : null}

        {syncWarning ? (
          <p className="notifications-sync-warning" role="status">
            {syncWarning}
          </p>
        ) : null}

        {saveWarning ? (
          <p className="notifications-save-warning" role="alert">
            {saveWarning}
          </p>
        ) : null}

        {showFullError ? (
          <section className="notifications-error" aria-live="polite">
            <h3 className="notifications-error__title">Couldn&apos;t load notification settings</h3>
            <p className="notifications-error__subtitle">Check your connection and try again.</p>
            <button type="button" className="notifications-error__retry" onClick={loadPrefs}>
              <RefreshCcw size={18} strokeWidth={2.25} />
              Retry
            </button>
          </section>
        ) : null}

        {showContent ? (
          <>
            <section className="notifications-status-card" aria-label="Notification permission">
              {permissionGranted ? (
                <>
                  <h3 className="notifications-status-card__title">Notifications enabled</h3>
                  <p className="notifications-status-card__body">
                    SAFE can send important cover, claim, and safety alerts.
                  </p>
                </>
              ) : permissionUnsupported ? (
                <>
                  <h3 className="notifications-status-card__title">Notification permission</h3>
                  <p className="notifications-status-card__body">
                    Notification permission is managed by your browser or device settings.
                  </p>
                  <p className="notifications-status-card__hint">
                    Your alert preferences are saved. Push delivery depends on device support.
                  </p>
                </>
              ) : permissionDenied ? (
                <>
                  <h3 className="notifications-status-card__title">Notifications off</h3>
                  <p className="notifications-status-card__body">
                    Turn on notifications so you don’t miss cover expiry or claim updates.
                  </p>
                  <p className="notifications-status-card__hint">
                    Enable alerts in your browser or device settings, then return here.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="notifications-status-card__title">Notifications off</h3>
                  <p className="notifications-status-card__body">
                    Turn on notifications so you don’t miss cover expiry or claim updates.
                  </p>
                  <button
                    type="button"
                    className="notifications-status-card__cta"
                    onClick={handleRequestPermission}
                    disabled={requestingPermission}
                  >
                    {requestingPermission ? 'Checking…' : 'Turn on notifications'}
                  </button>
                </>
              )}
            </section>

            <section className="notifications-channels-card" aria-label="Alert channels">
              <h3 className="notifications-section-card__title">Alert channels</h3>
              <NotificationToggleRow
                title="Push notifications"
                subtitle={
                  channels.push
                    ? 'Delivered through your device or browser when permitted.'
                    : 'Push is not available on this device.'
                }
                checked={Boolean(prefs.pushEnabled) && permissionGranted}
                disabled={!channels.push || permission !== 'granted'}
                loading={savingKey === 'pushEnabled'}
                onChange={(next) => handleToggle('pushEnabled', next)}
              />
              <NotificationToggleRow
                title="SMS"
                subtitle={
                  channels.sms
                    ? 'Text messages for urgent alerts when supported.'
                    : 'SMS alerts are not configured for SAFE yet.'
                }
                checked={Boolean(prefs.smsEnabled)}
                disabled={!channels.sms}
                loading={savingKey === 'smsEnabled'}
                onChange={(next) => handleToggle('smsEnabled', next)}
              />
              <NotificationToggleRow
                title="Email"
                subtitle={
                  channels.email
                    ? 'Email updates for cover and claim activity.'
                    : 'Email alerts are not configured for SAFE yet.'
                }
                checked={Boolean(prefs.emailEnabled)}
                disabled={!channels.email}
                loading={savingKey === 'emailEnabled'}
                onChange={(next) => handleToggle('emailEnabled', next)}
              />
            </section>

            {SECTIONS.map((section) => (
              <section
                key={section.id}
                className="notifications-section-card"
                aria-labelledby={`notifications-section-${section.id}`}
              >
                <h3 id={`notifications-section-${section.id}`} className="notifications-section-card__title">
                  {section.title}
                </h3>
                {section.items.map((item) => (
                  <NotificationToggleRow
                    key={item.key}
                    title={item.title}
                    subtitle={item.subtitle}
                    checked={Boolean(prefs[item.key])}
                    loading={savingKey === item.key}
                    onChange={(next) => handleToggle(item.key, next)}
                  />
                ))}
              </section>
            ))}

            <section className="notifications-quiet-card" aria-label="Quiet hours">
              <h3 className="notifications-section-card__title">Quiet hours</h3>
              <p className="notifications-quiet-card__body">
                Reduce non-urgent notifications during selected hours.
              </p>
              <span className="notifications-quiet-card__badge">Coming later</span>
            </section>

            <p className="notifications-autosave">Changes save automatically.</p>
          </>
        ) : null}

        <BottomScrollSpacer height={180} />
      </div>
    </main>
  );
}
