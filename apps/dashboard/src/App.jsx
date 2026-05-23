import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardShell from './components/DashboardShell.jsx';
import DashboardOverviewPage from './pages/DashboardOverviewPage.jsx';
import ClaimsPage from './pages/ClaimsPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import LiveOpsPage from './pages/LiveOpsPage.jsx';
import FraudPage from './pages/FraudPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DashboardLoginPage from './pages/DashboardLoginPage.jsx';
import PartnersPage from './pages/PartnersPage.jsx';
import DocumentsPage from './pages/DocumentsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import CoversPage from './pages/CoversPage.jsx';
import VehiclesPage from './pages/VehiclesPage.jsx';
import QRScansPage from './pages/QRScansPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<DashboardLoginPage />} />
        <Route element={<DashboardShell />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/covers" element={<CoversPage />} />
          <Route path="/partners" element={<PartnersPage />} />
          <Route path="/claims" element={<ClaimsPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/live-ops" element={<LiveOpsPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/qr-scans" element={<QRScansPage />} />
          <Route path="/fraud" element={<FraudPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
