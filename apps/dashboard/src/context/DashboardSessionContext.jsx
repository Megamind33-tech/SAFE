import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { dashboardSession, loadDashboardToken } from '../api/dashboardApi.js';
import { hasPermission } from '../lib/dashboardPermissions.js';

const DashboardSessionContext = createContext({
  user: null,
  permissions: [],
  loading: true,
  error: '',
  refresh: async () => {},
  can: () => false,
});

export function DashboardSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const token = loadDashboardToken();
    if (!token) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await dashboardSession(token);
      setUser(data.user ?? null);
      setPermissions(data.permissions ?? []);
      setError('');
    } catch (e) {
      setUser(null);
      setPermissions([]);
      setError(e?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback((permission) => hasPermission(permissions, permission), [permissions]);

  const value = useMemo(
    () => ({ user, permissions, loading, error, refresh, can }),
    [user, permissions, loading, error, refresh, can],
  );

  return <DashboardSessionContext.Provider value={value}>{children}</DashboardSessionContext.Provider>;
}

export function useDashboardSession() {
  return useContext(DashboardSessionContext);
}
