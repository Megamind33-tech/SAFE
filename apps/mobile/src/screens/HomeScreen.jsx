import { Bell, MapPin } from 'lucide-react';
import { useEffect } from 'react';
import homeBgNight from '../assets/lusaka-night-aerial.png';
import heroContainerMobile from '../assets/hero/safe_hero_container_mobile_transparent.png';
import heroBusAsset from '../assets/real/verified_vehicle_clean.png';
import heroShieldAsset from '../assets/real/safe_shield_clean.png';
import routeLineAsset from '../assets/pack/icons/route-line.svg';
import iconQrScan from '../assets/pack/icons/qr-scan.svg';
import iconVehicleFound from '../assets/pack/icons/vehicle-found.svg';
import iconLockShield from '../assets/pack/icons/lock-shield.svg';
import iconArrowRight from '../assets/pack/icons/arrow-right.svg';
import LiveRouteMap from '../components/LiveRouteMap.jsx';
import {
  formatDriverLabel,
  formatPlanLabel,
  formatStartedAt,
  formatVehicleLabel,
  remainingCoverLabel,
  useActiveTrip,
} from '../hooks/useActiveTrip.js';

function openScanner(setScannerType, setShowScannerModal, type) {
  setScannerType(type);
  setShowScannerModal(true);
}

function HomeHeroCard({ activeCoverState, countdown, isProtected, liveTrip }) {
  const statusChip = isProtected
    ? remainingCoverLabel(activeCoverState?.endsAt)
    : 'Unprotected';

  return (
    <section className="home-hero-card" aria-label={isProtected ? 'Active cover' : 'Get covered'}>
      <div className="home-hero-stage">
        <img className="home-hero-container" src={heroContainerMobile} alt="" aria-hidden="true" />
        <img className="home-hero-route" src={routeLineAsset} alt="" aria-hidden="true" />
        <img
          className={`home-hero-bus${isProtected ? '' : ' home-hero-bus-muted'}`}
          src={heroBusAsset}
          alt=""
          aria-hidden="true"
        />
        <img
          className={`home-hero-shield${isProtected ? '' : ' home-hero-shield-muted'}`}
          src={heroShieldAsset}
          alt=""
          aria-hidden="true"
        />
        <div className="home-hero-copy">
          <span className={`home-hero-chip${isProtected ? '' : ' home-hero-chip-muted'}`}>{statusChip}</span>
          <h1 className="home-hero-title">{isProtected ? 'Active Cover' : 'Secure Your Ride'}</h1>
          <p className="home-hero-subtitle">
            {isProtected
              ? 'Protected for this trip'
              : 'Protect your current commute with instant accident medical coverage.'}
          </p>
          {isProtected && countdown && countdown !== '00:00:00' ? (
            <span className="home-hero-countdown">{countdown}</span>
          ) : null}
        </div>
      </div>

      {isProtected ? (
        <div className="home-hero-meta">
          <div><span>Vehicle</span><strong>{formatVehicleLabel(activeCoverState?.vehicle)}</strong></div>
          <div><span>Driver</span><strong>{formatDriverLabel(liveTrip?.driver)}</strong></div>
          <div><span>Started</span><strong>{formatStartedAt(activeCoverState?.startedAt)}</strong></div>
          <div><span>Cover</span><strong>{formatPlanLabel(activeCoverState?.plan)}</strong></div>
        </div>
      ) : null}
    </section>
  );
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
