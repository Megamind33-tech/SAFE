import 'leaflet/dist/leaflet.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './home-screen.css';
import './cover-screen.css';
import './view-policy-screen.css';
import './claims-screen.css';

// react-leaflet expects React on window in dev bundles
if (typeof window !== 'undefined') {
  window.React = React;
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
