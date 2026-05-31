import { ArrowLeft, Share2 } from 'lucide-react';
import HomeMapPreview from '../components/HomeMapPreview.jsx';
import BottomScrollSpacer from '../components/BottomScrollSpacer.jsx';
import { useLiveTrip } from '../hooks/useLiveTrip.js';
import routeMapArt from '../assets/real/route_map_bus_hero_clean.png';

async function shareTrip(trip) {
  const text = `I'm on a SAFE-covered trip. Policy: ${trip?.policyId ?? 'N/A'}. Vehicle: ${trip?.vehiclePlate ?? 'N/A'}.`;
  if (navigator.share) {
    try { await navigator.share({ title: 'My SAFE trip', text }); return; } catch {}
  }
  try { await navigator.clipboard.writeText(text); } catch {}
}

export default function LiveTripScreen({ setScreen, goCover }) {
  const {
    trip,
    activeCover,
    loading,
    loadError,
    syncWarning,
    locationState,
    mapTileError,
    setMapTileError,
    refresh,
    requestLocationPermission,
    startTrip,
  } = useLiveTrip({ trackLocation: true });

  const handleStart = async () => {
    const ok = await requestLocationPermission();
    if (!ok && locationState !== 'granted') return;
    let startLocation;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 12000,
            maximumAge: 60000,
          });
        });
        startLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      } catch {
        /* backend may still start without coords */
      }
    }
    await startTrip(startLocation);
    await refresh();
  };

  const isActiveTrip =
    (trip?.status === 'active' || trip?.status === 'pending') && !trip?.coverExpired;
  const hasActiveCoverNoTrip =
    !trip && activeCover?.trackable && !loading && !loadError;

  const startedTime = trip?.startedAt
    ? new Date(trip.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <main className="screen live-trip-screen">
      <header className="live-trip-screen__header">
        <button
          type="button"
          className="live-trip-screen__back"
          onClick={() => setScreen('home')}
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} />
        </button>
        <h1 className="live-trip-screen__title">Live trip</h1>
        <span className="live-trip-screen__spacer" aria-hidden="true" />
      </header>

      <div className="live-trip-screen__scroll">
        {/* Ready-to-start hero: shown above the map when cover is active but no trip started */}
        {hasActiveCoverNoTrip ? (
          <section className="live-trip-screen__intro">
            <img
              className="live-trip-screen__intro-art"
              src={routeMapArt}
              alt=""
              aria-hidden="true"
            />
            <div className="live-trip-screen__intro-body">
              <span className="live-trip-screen__status-pill live-trip-screen__status-pill--ready">
                Ready to start
              </span>
              <h2 className="live-trip-screen__intro-title">Start live tracking</h2>
              <p className="live-trip-screen__intro-sub">
                Share your journey with trusted contacts when you begin your trip.
              </p>
              <div className="live-trip-screen__intro-actions">
                <button
                  type="button"
                  className="live-trip-screen__cta live-trip-screen__cta--primary"
                  onClick={handleStart}
                >
                  Start live trip
                </button>
                <button
                  type="button"
                  className="live-trip-screen__cta live-trip-screen__cta--secondary"
                  onClick={goCover}
                >
                  View cover
                </button>
              </div>
              <p className="live-trip-screen__safety-note">
                Location updates depend on network availability.
              </p>
            </div>
          </section>
        ) : null}

        {/* Active trip status pill */}
        {isActiveTrip && !loading ? (
          <div className="live-trip-screen__status-row">
            <span className="live-trip-screen__status-pill live-trip-screen__status-pill--live">
              <i className="live-trip-screen__status-dot" aria-hidden="true" />
              Live trip active
            </span>
          </div>
        ) : null}

        {/* Map — always rendered; keeps all capture guards working */}
        <HomeMapPreview
          trip={trip}
          activeCover={activeCover}
          loading={loading}
          loadError={loadError}
          syncWarning={syncWarning}
          locationState={locationState}
          mapTileError={mapTileError}
          onRetry={() => {
            setMapTileError(false);
            refresh();
          }}
          onEnableLocation={requestLocationPermission}
          onOpenSettings={() => {
            if (typeof window !== 'undefined')
              window.alert('Enable location in your device settings for SAFE.');
          }}
          onStartTracking={handleStart}
          onBuyCover={goCover}
          onMapTileError={() => setMapTileError(true)}
          compact={false}
          requireDeviceLocation
        />

        {/* Active trip summary card */}
        {isActiveTrip ? (
          <section className="live-trip-screen__summary-card">
            {trip?.vehicle?.plateNumber ? (
              <div className="live-trip-screen__summary-row">
                <span className="live-trip-screen__summary-label">Vehicle</span>
                <strong className="live-trip-screen__summary-value">
                  {trip.vehicle.plateNumber}
                </strong>
              </div>
            ) : null}
            {trip?.vehicle?.routeName ? (
              <div className="live-trip-screen__summary-row">
                <span className="live-trip-screen__summary-label">Route</span>
                <strong className="live-trip-screen__summary-value">
                  {trip.vehicle.routeName}
                </strong>
              </div>
            ) : null}
            {startedTime ? (
              <div className="live-trip-screen__summary-row">
                <span className="live-trip-screen__summary-label">Started</span>
                <strong className="live-trip-screen__summary-value">{startedTime}</strong>
              </div>
            ) : null}
            {trip?.policyId ? (
              <div className="live-trip-screen__summary-row live-trip-screen__summary-row--last">
                <span className="live-trip-screen__summary-label">Policy</span>
                <strong className="live-trip-screen__summary-value">{trip.policyId}</strong>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Active trip CTAs */}
        {isActiveTrip ? (
          <div className="live-trip-screen__actions">
            <button type="button" className="live-trip-screen__cta live-trip-screen__cta--primary" onClick={() => shareTrip(trip)}>
              <Share2 size={17} aria-hidden="true" />
              Share trip
            </button>
            <button
              type="button"
              className="live-trip-screen__cta live-trip-screen__cta--secondary live-trip-screen__cta--emergency"
              onClick={() => setScreen('helpSafety')}
            >
              Emergency help
            </button>
          </div>
        ) : null}

        <BottomScrollSpacer height={160} />
      </div>
    </main>
  );
}
