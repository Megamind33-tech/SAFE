import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useDashboardSession } from '../context/DashboardSessionContext.jsx';
import { canAccessRoute } from '../lib/dashboardPermissions.js';
import AccessRestrictedPage from '../pages/AccessRestrictedPage.jsx';
import { LoadingBlock } from './admin/ui.jsx';

export default function RequirePermission({ children }) {
  const { permissions, loading } = useDashboardSession();
  const { pathname } = useLocation();

  if (loading) {
    return <LoadingBlock label="Loading access…" />;
  }

  if (!canAccessRoute(permissions, pathname)) {
    return <AccessRestrictedPage />;
  }

  return <Outlet />;
}
