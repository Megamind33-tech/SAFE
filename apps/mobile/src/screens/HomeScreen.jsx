import { Bell, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import homeBgNight from '../assets/safe/backgrounds/safe_bg_home_night_commuter_1080x2400.png';
import HomeHeroCard from '../components/HomeHeroCard.jsx';
import iconQrScan from '../assets/pack/icons/qr-scan.svg';
import iconVehicleFound from '../assets/pack/icons/vehicle-found.svg';
import iconLockShield from '../assets/pack/icons/lock-shield.svg';
import iconArrowRight from '../assets/pack/icons/arrow-right.svg';
import LiveRouteMap from '../components/LiveRouteMap.jsx';
import { useActiveTrip } from '../hooks/useActiveTrip.js';

function openScanner(setScannerType, setShowScannerModal, type) {
  setScannerType(type);
  setShowScannerModal(true);
}

function PrimaryActionButtons({ onScanQr, onEnterPlate }) {
  return (
    <section className="home-primary-actions" aria-label="Primary actions">
      <button className="home-primary-btn home-primary-btn-yellow" type="button" onClick={onScanQr}>
        <img src={iconQrScan} alt="" aria-hidden="true" />
        <span>Scan QR Code</span>
      </button>
      <button className="home-primary-btn home-primary-btn-outline" type="button" onClick={onEnterPlate}>
        <img src={iconVehicleFound} alt="" aria-hidden="true" />
        <span>Enter Plate</span>
      </button>
    </section>
  );
}

export default function HomeScreen({
  setScreen,
  setShowScannerModal,
  setScannerType,
  activeCoverState,
  countdown,
  session,
  goCover,
}) {
  const { trip: liveTrip, loading: tripLoading, error: tripError, refresh: refreshTrip } = useActiveTrip();

  useEffect(() => {
    refreshTrip();
  }, [activeCoverState?.id, refreshTrip]);

  const isProtected = Boolean(activeCoverState);
  const firstName = session?.user?.passengerProfile?.fullName?.split(' ')[0]
    || session?.user?.phone?.slice(-4)
    || 'Moses';

  const onScanQr = () => openScanner(setScannerType, setShowScannerModal, 'qr');
  const onEnterPlate = () => openScanner(setScannerType, setShowScannerModal, 'plate');

  const quickActions = [
    {
      label: 'Start cover',
      detail: 'Protect this trip',
      icon: iconLockShield,
      action: onScanQr,
      tone: 'yellow',
    },
    {
      label: 'Scan vehicle',
      detail: 'Verify minibus',
      icon: iconQrScan,
      action: onScanQr,
      tone: 'blue',
    },
    {
      label: 'Report incident',
      detail: 'Fast claim help',
      icon: iconArrowRight,
      action: () => setScreen('claim'),
      tone: 'danger',
    },
    {
      label: 'View cover',
      detail: isProtected ? 'Active policy' : 'No active cover',
      icon: iconLockShield,
      action: goCover,
      tone: 'glass',
    },
  ];

  return (
    <main className="screen home-screen">
      <div
        className="home-bg-layer"
        style={{ backgroundImage: `url(${homeBgNight})` }}
        aria-hidden="true"
      />
      <div className="home-bg-overlay" aria-hidden="true" />

      <header className="home-header">
        <div className="home-identity">
          <p>Good morning, {firstName}</p>
          <strong>SAFE active in motion</strong>
        </div>
        <div className="home-top-actions">
          <button className="location-pill" type="button" aria-label="Current city">
            <MapPin size={15} />
            <span>Lusaka</span>
          </button>
          <button className="notify-btn" type="button" aria-label="Notifications" onClick={() => setScreen('notifications')}>
            <Bell size={19} />
            <i />
          </button>
        </div>
      </header>

      <div className="home-scroll-content">
        <HomeHeroCard
          activeCoverState={activeCoverState}
          countdown={countdown}
          isProtected={isProtected}
          liveTrip={liveTrip}
        />

        <PrimaryActionButtons onScanQr={onScanQr} onEnterPlate={onEnterPlate} />

        <section className="live-route-panel">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Live route intelligence</p>
              <h2>Protected route map</h2>
            </div>
          </div>
          <LiveRouteMap
            trip={liveTrip}
            loading={tripLoading}
            error={tripError}
            onRetry={refreshTrip}
          />
        </section>

        <section className="quick-action-section">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">Quick actions</p>
              <h2>Move faster</h2>
            </div>
          </div>
          <div className="home-quick-grid">
            {quickActions.map((action) => (
              <button className={`home-quick-card ${action.tone}`} key={action.label} type="button" onClick={action.action}>
                <span className="home-quick-icon"><img src={action.icon} alt="" /></span>
                <strong>{action.label}</strong>
                <small>{action.detail}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
