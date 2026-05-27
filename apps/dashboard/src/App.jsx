import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from './components/DashboardShell.jsx';
import DashboardOverviewPage from './pages/DashboardOverviewPage.jsx';
import ClaimsPage from './pages/ClaimsPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DashboardLoginPage from './pages/DashboardLoginPage.jsx';
import PartnersPage from './pages/PartnersPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import CoversPage from './pages/CoversPage.jsx';
import LiveTripsPage from './pages/LiveTripsPage.jsx';
import QrScansPage from './pages/QrScansPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DashboardLoginPage />} />
        <Route element={<DashboardShell />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/covers" element={<CoversPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/live-trips" element={<LiveTripsPage />} />
          <Route path="/qr-scans" element={<QrScansPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
