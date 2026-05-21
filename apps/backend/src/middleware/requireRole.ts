import type { NextFunction, Request, Response } from 'express';
import type { AuthedRequest } from './requireAuth.js';

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req as AuthedRequest).user?.role;
    if (!role) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

