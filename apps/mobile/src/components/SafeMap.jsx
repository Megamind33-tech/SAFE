import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Crosshair, MapPin } from 'lucide-react';

const userIcon = L.divIcon({
  className: 'safe-user-marker',
  html: '<div style="width:16px;height:16px;background:#006b3f;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.3)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const pinIcon = L.divIcon({
  className: 'safe-pin-marker',
  html: '<div style="width:12px;height:12px;background:#ef4444;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

function RecenterButton({ position }) {
  const map = useMap();
  if (!position) return null;
  return (
    <button
      type="button"
      onClick={() => map.flyTo(position, 15, { duration: 0.5 })}
      className="safe-map-recenter"
      aria-label="Center on my location"
    >
      <Crosshair size={18} />
    </button>
  );
}

function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 15, { duration: 0.8 });
  }, [position?.[0], position?.[1]]);
  return null;
}

export default function SafeMap({ destination, height = '100%', className = '' }) {
  const [userPos, setUserPos] = useState(null);
  const [locStatus, setLocStatus] = useState('loading');

  const defaultCenter = [-15.4167, 28.2833]; // Lusaka

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('unavailable');
      return;
    }
    setLocStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocStatus('granted');
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, []);

  const center = userPos || defaultCenter;

  return (
    <div className={`safe-map-container ${className}`} style={{ height, position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={userPos ? 15 : 13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {userPos && <Marker position={userPos} icon={userIcon}><Popup>You are here</Popup></Marker>}
        {destination && <Marker position={destination} icon={pinIcon}><Popup>Destination</Popup></Marker>}
        <FlyToLocation position={userPos} />
        <RecenterButton position={userPos} />
      </MapContainer>

      {locStatus === 'loading' && (
        <div className="safe-map-overlay">
          <div className="safe-map-overlay-content">
            <div className="safe-spinner" />
            <span>Finding your location...</span>
          </div>
        </div>
      )}

      {locStatus === 'denied' && (
        <div className="safe-map-banner">
          <MapPin size={14} />
          <span>Location unavailable — showing Lusaka</span>
        </div>
      )}
    </div>
  );
}
