import type { NextFunction, Request, Response } from 'express';
import type { AuthedRequest } from './requireAuth.js';
import {
  hasDashboardPermission,
  isDashboardAccessRole,
  type DashboardPermission,
} from '../lib/dashboardPermissions.js';

export function requireDashboardAccess() {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthedRequest).user?.role;
    if (!role) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!isDashboardAccessRole(role)) {
      res.status(403).json({ error: 'Forbidden', code: 'DASHBOARD_ACCESS_DENIED' });
      return;
    }
    if (!hasDashboardPermission(role, 'dashboard.view')) {
      res.status(403).json({ error: 'Forbidden', code: 'DASHBOARD_ACCESS_DENIED' });
      return;
    }
    next();
  };
}

export function requireDashboardPermission(permission: DashboardPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthedRequest).user?.role;
    if (!role) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!hasDashboardPermission(role, permission)) {
      res.status(403).json({
        error: 'Your staff role does not allow this action.',
        code: 'PERMISSION_DENIED',
        permission,
      });
      return;
    }
    next();
  };
}
