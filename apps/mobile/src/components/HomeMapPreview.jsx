import LiveRouteMap from './LiveRouteMap.jsx';

/**
 * Shared live trip map card for View Policy and Live Trip screen.
 * Does not modify locked Home/Cover layouts when used only from allowed screens.
 */
export default function HomeMapPreview({
  trip,
  activeCover,
  loading,
  loadError,
  syncWarning,
  locationState,
  mapTileError,
  onRetry,
  onEnableLocation,
  onOpenSettings,
  onStartTracking,
  onBuyCover,
  onMapTileError,
  compact = true,
  requireDeviceLocation = false,
}) {
  return (
    <section className="home-map-preview" aria-label="Live trip map">
      <LiveRouteMap
        trip={trip}
        activeCover={activeCover}
        loading={loading}
        error={loadError}
        syncWarning={syncWarning}
        locationState={locationState}
        mapTileError={mapTileError}
        onRetry={onRetry}
        onEnableLocation={onEnableLocation}
        onOpenSettings={onOpenSettings}
        onStartTracking={onStartTracking}
        onBuyCover={onBuyCover}
        onMapTileError={onMapTileError}
        compact={compact}
        requireDeviceLocation={requireDeviceLocation}
      />
    </section>
  );
}
