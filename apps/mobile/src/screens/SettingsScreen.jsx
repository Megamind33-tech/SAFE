import { ArrowLeft } from 'lucide-react';

export default function SettingsScreen({ setScreen }) {
  return (
    <main className="screen profile-screen profile-screen-board">
      <div className="profile-screen-scroll">
        <header className="trusted-contacts-header" style={{ marginTop: 48 }}>
          <button
            type="button"
            className="trusted-contacts-header__back"
            aria-label="Go back"
            onClick={() => setScreen?.('profile')}
          >
            <ArrowLeft size={22} strokeWidth={2.25} color="#101820" />
          </button>
          <h1 className="trusted-contacts-header__title">Settings</h1>
          <span className="trusted-contacts-header__spacer" aria-hidden="true" />
        </header>
        <p className="profile-placeholder-note" style={{ marginTop: 32 }}>
          Settings are coming soon.
        </p>
      </div>
    </main>
  );
}
