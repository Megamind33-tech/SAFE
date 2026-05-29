import 'leaflet/dist/leaflet.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './home-screen.css';
import './cover-screen.css';
import './cover-flow-screen.css';
import './cover-hub-screen.css';
import './view-policy-screen.css';
import './claims-screen.css';
import './claim-flow-screen.css';
import './claim-submitted-screen.css';
import './claim-detail-screen.css';
import './profile-screen.css';
import './cover-history-screen.css';
import './payment-methods-screen.css';
import './trusted-contacts-screen.css';
import './settings-screen.css';
import './live-trip-screen.css';
import './help-safety-screen.css';
import './notifications-screen.css';
import './qr-screen.css';

// react-leaflet expects React on window in dev bundles
if (typeof window !== 'undefined') {
  window.React = React;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
