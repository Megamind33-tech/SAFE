import homeBgNight from '../assets/safe/backgrounds/safe_bg_home_night_commuter_1080x2400.png';
import safeLogo from '../assets/real/safe_logo_clean.png';
import iconQrScan from '../assets/pack/icons/qr-scan.svg';
import iconLockShield from '../assets/pack/icons/lock-shield.svg';
import iconEmergency from '../assets/icons/phone-ringing-premium.png';
import HomeHeroCard from '../components/HomeHeroCard.jsx';

function openScanner(setScannerType, setShowScannerModal, type = 'qr') {
  setScannerType(type);
  setShowScannerModal(true);
}

export default function HomeScreen({
  setScreen,
  setShowScannerModal,
  setScannerType,
  activeCoverState,
  openHistory,
  goCover,
}) {
  const isProtected = Boolean(activeCoverState);
  const onScanVehicle = () => openScanner(setScannerType, setShowScannerModal, 'qr');

  return (
    <main className="screen home-screen home-screen-board">
      <div className="home-screen-board__bg" aria-hidden="true">
        <img className="home-screen-board__bg-image" src={homeBgNight} alt="" />
        <div className="home-screen-board__bg-overlay" />
      </div>

      <header className="home-screen-board__header">
        <div className="home-screen-board__brand">
          <img
            className="home-screen-board__logo-lockup"
            src={safeLogo}
            alt="SAFE commuter cover"
          />
        </div>
        <span className="home-screen-board__location">Lusaka</span>
      </header>

      <section className="home-screen-board__intro">
        <h1 className="home-screen-board__headline">A safer trip starts before you board.</h1>
        <p className="home-screen-board__subtitle">
          Buy, scan, and keep proof of cover without losing the premium feel.
        </p>
      </section>

      <HomeHeroCard
        activeCoverState={activeCoverState}
        isProtected={isProtected}
        onScanVehicle={onScanVehicle}
      />

      <button
        className="home-screen-board__quick-cover"
        type="button"
        onClick={() => (isProtected ? goCover() : onScanVehicle())}
      >
        <span className="home-screen-board__quick-cover-text">
          <span className="home-screen-board__quick-cover-title">Quick Cover</span>
          <span className="home-screen-board__quick-cover-sub">
            Choose cover or verify an active trip.
          </span>
        </span>
        <span className="home-screen-board__quick-cover-icon">
          <img src={iconQrScan} alt="" aria-hidden="true" />
        </span>
      </button>

      <div className="home-screen-board__actions">
        <button
          className="home-screen-board__action-card"
          type="button"
          onClick={() => openHistory('home')}
        >
          <span className="home-screen-board__action-icon">
            <img src={iconLockShield} alt="" aria-hidden="true" />
          </span>
          <span className="home-screen-board__action-title">Trip history</span>
          <span className="home-screen-board__action-status">Ready</span>
        </button>
        <button
          className="home-screen-board__action-card"
          type="button"
          onClick={() => setScreen('claim')}
        >
          <span className="home-screen-board__action-icon home-screen-board__action-icon--emergency">
            <img src={iconEmergency} alt="" aria-hidden="true" />
          </span>
          <span className="home-screen-board__action-title">Emergency</span>
          <span className="home-screen-board__action-status home-screen-board__action-status--emergency">
            Ready
          </span>
        </button>
      </div>
    </main>
  );
}
