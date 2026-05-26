import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/auth.js';

export type AuthedUser = {
  id: string;
  role: string;
};

export type AuthedRequest = Request & { user: AuthedUser };

/** Narrow Express request after requireAuth — no runtime effect. */
export function getAuthed(req: Request): AuthedRequest {
  return req as unknown as AuthedRequest;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Missing Authorization bearer token' });
    return;
  }

  try {
    const payload = verifyToken(match[1]);
    (req as AuthedRequest).user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

