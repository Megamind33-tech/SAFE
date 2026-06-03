import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { loadDashboardToken } from '../api/dashboardApi.js';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import { canAccessRoute } from '../lib/dashboardPermissions.js';
import AccessRestrictedPage from '../pages/AccessRestrictedPage.jsx';
import DashboardAccessDeniedPage from '../pages/DashboardAccessDeniedPage.jsx';
import { LoadingBlock } from './admin/ui.jsx';

export default function RequirePermission() {
  const { user, permissions, loading, error, errorCode } = useDashboardSession();
  const { pathname } = useLocation();
  const token = loadDashboardToken();

  if (loading) {
    return <LoadingBlock label="Loading access…" />;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  if (!user) {
    if (errorCode === 'DASHBOARD_ACCESS_DENIED') {
      return <DashboardAccessDeniedPage />;
    }
    if (error) {
      return <Navigate to="/login" replace state={{ from: pathname }} />;
    }
    return <LoadingBlock label="Loading session..." />;
  }

  if (!canAccessRoute(permissions, pathname)) {
    return <AccessRestrictedPage />;
  }

  return <Outlet />;
}
