import { ArrowLeft } from 'lucide-react';
import HomeMapPreview from '../components/HomeMapPreview.jsx';
import { useLiveTrip } from '../hooks/useLiveTrip.js';

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
          if (typeof window !== 'undefined') window.alert('Enable location in your device settings for SAFE.');
        }}
        onStartTracking={handleStart}
        onBuyCover={goCover}
        onMapTileError={() => setMapTileError(true)}
        compact={false}
        requireDeviceLocation
      />

      {trip?.policyId ? (
        <p className="live-trip-screen__meta">
          Policy: <strong>{trip.policyId}</strong>
        </p>
      ) : null}
      {trip?.vehicle?.plateNumber ? (
        <p className="live-trip-screen__meta">
          Vehicle: <strong>{trip.vehicle.plateNumber}</strong>
        </p>
      ) : null}
    </main>
  );
}
