import { useMemo, useState } from 'react';
import { Bell, Camera, MapPin } from 'lucide-react';
import {
  markPermissionsIntroSeen,
  requestCameraPermission,
  requestLocationPermission,
  requestNotificationPermissionIfNeeded,
} from '../utils/firstRunPermissions.js';

export default function PermissionsIntroScreen({ setScreen }) {
  const [busy, setBusy] = useState(false);

  const cards = useMemo(
    () => [
      {
        key: 'camera',
        title: 'Camera',
        body: 'Scan SAFE QR stickers before boarding.',
        icon: Camera,
      },
      {
        key: 'location',
        title: 'Location',
        body: 'Show nearby vehicles, routes, and SAFE stations.',
        icon: MapPin,
      },
      {
        key: 'notifications',
        title: 'Notifications',
        body: 'Receive cover, payment, and claim updates.',
        icon: Bell,
      },
    ],
    [],
  );

  const continueIntoApp = () => {
    markPermissionsIntroSeen();
    setScreen('home');
  };

  const handleMaybeLater = () => {
    continueIntoApp();
  };

  const handleAllow = async () => {
    setBusy(true);

    // Call permission APIs within the user gesture to keep Android/WebView prompts reliable.
    const cameraPromise = requestCameraPermission();
    const locationPromise = requestLocationPermission();
    const notificationPromise = requestNotificationPermissionIfNeeded();

    await Promise.allSettled([cameraPromise, locationPromise, notificationPromise]);

    continueIntoApp();
  };

  return (
    <main className="screen no-nav permissions-intro-screen">
      <div className="permissions-intro__scroll">
        <header className="permissions-intro__header">
          <h1 className="permissions-intro__title">Allow SAFE to protect your trip</h1>
          <p className="permissions-intro__message">
            SAFE needs camera access to scan vehicle QR codes, location access to show nearby vehicles and SAFE stations, and
            notifications for cover, payment, and claim updates.
          </p>
        </header>

        <section className="permissions-intro__cards" aria-label="Permissions needed">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div key={card.key} className="permissions-intro__card">
                <div className="permissions-intro__icon" aria-hidden="true">
                  <Icon size={20} />
                </div>
                <div className="permissions-intro__card-body">
                  <div className="permissions-intro__card-top">
                    <strong className="permissions-intro__card-title">{card.title}</strong>
                  </div>
                  <p className="permissions-intro__card-text">{card.body}</p>
                </div>
              </div>
            );
          })}
        </section>

        <div className="permissions-intro__actions" aria-label="Permission actions">
          <button type="button" className="primary-btn" onClick={handleAllow} disabled={busy}>
            {busy ? 'Requesting…' : 'Allow permissions'}
          </button>
          <button type="button" className="secondary-btn" onClick={handleMaybeLater} disabled={busy}>
            Maybe later
          </button>
        </div>
      </div>
    </main>
  );
}
