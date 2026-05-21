import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from './env.js';

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export type JwtPayload = {
  sub: string;
  role: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

