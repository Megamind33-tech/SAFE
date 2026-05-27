import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from './components/DashboardShell.jsx';
import RequirePermission from './components/RequirePermission.jsx';
import { DashboardSessionProvider } from './context/DashboardSessionContext.jsx';
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
import StaffUsersPage from './pages/StaffUsersPage.jsx';
import AccessRestrictedPage from './pages/AccessRestrictedPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <DashboardSessionProvider>
      <Routes>
        <Route path="/login" element={<DashboardLoginPage />} />
        <Route path="/forbidden" element={<AccessRestrictedPage />} />
        <Route element={<DashboardShell />}>
          <Route element={<RequirePermission />}>
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
          <Route path="/staff" element={<StaffUsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </DashboardSessionProvider>
    </BrowserRouter>
  );
}
