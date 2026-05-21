import { Router } from 'express';
import { z } from 'zod';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';

const registerSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6),
  fullName: z.string().min(2).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

function publicUser(user: { id: string; role: string; email: string | null; phone: string | null }) {
  return { id: user.id, role: user.role, email: user.email, phone: user.phone };
}

export const sharedAuthRouter = Router();

sharedAuthRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { email, phone, password, fullName } = parsed.data;
  if (!email && !phone) {
    res.status(400).json({ error: 'Either email or phone is required' });
    return;
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email: email ?? null,
        phone: phone ?? null,
        passwordHash,
        role: 'passenger',
        passengerProfile: {
          create: {
            fullName: fullName ?? null,
          },
        },
      },
      select: { id: true, role: true, email: true, phone: true },
    });

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (err: any) {
    if (String(err?.code) === 'P2002') {
      res.status(409).json({ error: 'User already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to register' });
  }
});

sharedAuthRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const { identifier, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { phone: identifier }],
    },
    select: { id: true, role: true, email: true, phone: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: user.id, role: user.role });
  res.json({ token, user: publicUser(user) });
});

sharedAuthRouter.get('/me', requireAuth, async (req, res) => {
  const authed = req as AuthedRequest;
  const user = await prisma.user.findUnique({
    where: { id: authed.user.id },
    select: { id: true, role: true, email: true, phone: true, passengerProfile: true, driverProfile: true },
  });

  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json({
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
      passengerProfile: user.passengerProfile,
      driverProfile: user.driverProfile,
    },
  });
});

