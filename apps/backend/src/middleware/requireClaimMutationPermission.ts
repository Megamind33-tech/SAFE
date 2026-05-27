import type { NextFunction, Request, Response } from 'express';
import { assertClaimStatusAllowed } from '../lib/dashboardPermissions.js';
import type { AuthedRequest } from './requireAuth.js';
import { hasDashboardPermission } from '../lib/dashboardPermissions.js';

export function requireClaimMutationPermission() {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthedRequest).user?.role;
    if (!role) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!hasDashboardPermission(role, 'claims.view')) {
      res.status(403).json({ error: 'Forbidden', code: 'PERMISSION_DENIED' });
      return;
    }

    const status = typeof req.body?.status === 'string' ? req.body.status : 'approved';
    if (req.path.endsWith('/approve')) {
      if (!hasDashboardPermission(role, 'claims.approve')) {
        res.status(403).json({ error: 'Your staff role does not allow this action.', code: 'PERMISSION_DENIED' });
        return;
      }
      next();
      return;
    }
    if (req.path.endsWith('/reject')) {
      if (!hasDashboardPermission(role, 'claims.reject')) {
        res.status(403).json({ error: 'Your staff role does not allow this action.', code: 'PERMISSION_DENIED' });
        return;
      }
      next();
      return;
    }

    try {
      assertClaimStatusAllowed(role, status);
      next();
    } catch (err) {
      res.status(403).json({
        error: err instanceof Error ? err.message : 'Forbidden',
        code: 'PERMISSION_DENIED',
      });
    }
  };
}
