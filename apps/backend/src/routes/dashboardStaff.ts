import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';
import { getAuthed } from '../middleware/requireAuth.js';
import { requireDashboardPermission } from '../middleware/requireDashboardPermission.js';
import {
  DASHBOARD_STAFF_ROLES,
  STAFF_ASSIGNABLE_ROLES,
  type DashboardStaffRole,
} from '../lib/dashboardPermissions.js';

export const dashboardStaffRouter = Router();

dashboardStaffRouter.use(requireDashboardPermission('staff.manage'));

function serializeStaffUser(
  u: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    isActive: boolean;
    createdAt: Date;
    passengerProfile?: { fullName: string | null } | null;
  },
) {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    fullName: u.passengerProfile?.fullName ?? null,
    role: u.role,
    status: u.isActive ? 'active' : 'inactive',
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: null,
  };
}

async function countActiveSuperAdmins(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: 'super_admin',
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

dashboardStaffRouter.get('/', async (req, res) => {
  const search = String(req.query.search ?? '').trim();
  const roleFilter = req.query.role ? String(req.query.role) : undefined;
  const status = String(req.query.status ?? 'all');

  const where: Record<string, unknown> = {
    role: { in: [...DASHBOARD_STAFF_ROLES] },
  };
  if (roleFilter && (DASHBOARD_STAFF_ROLES as readonly string[]).includes(roleFilter)) {
    where.role = roleFilter;
  }
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (search) {
    where.OR = [
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { passengerProfile: true },
  });

  res.json({ staff: users.map((u) => serializeStaffUser(u)) });
});

const createSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(32).optional(),
  role: z.enum(STAFF_ASSIGNABLE_ROLES as [DashboardStaffRole, ...DashboardStaffRole[]]),
  password: z.string().min(8).max(128),
});

dashboardStaffRouter.post('/', async (req, res) => {
  const authed = getAuthed(req);
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  if (parsed.data.role === 'super_admin' && authed.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Only a super admin can create another super admin.' });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);
  try {
    const user = await prisma.user.create({
      data: {
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone?.trim() || null,
        passwordHash,
        role: parsed.data.role,
        passengerProfile: {
          create: { fullName: parsed.data.fullName.trim() },
        },
      },
      include: { passengerProfile: true },
    });
    res.status(201).json({
      staff: serializeStaffUser(user),
      temporaryPasswordNote:
        'Temporary password must be changed manually after first login. Email invitation is not connected yet.',
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && String((err as { code: string }).code) === 'P2002') {
      res.status(409).json({ error: 'A user with this email or phone already exists.' });
      return;
    }
    res.status(500).json({ error: 'Failed to create staff user' });
  }
});

const patchSchema = z.object({
  role: z.enum(STAFF_ASSIGNABLE_ROLES as [DashboardStaffRole, ...DashboardStaffRole[]]).optional(),
  isActive: z.boolean().optional(),
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().max(32).nullable().optional(),
});

dashboardStaffRouter.patch('/:userId', async (req, res) => {
  const authed = getAuthed(req);
  const targetId = String(req.params.userId);
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
    return;
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { passengerProfile: true },
  });
  if (!target || !(DASHBOARD_STAFF_ROLES as readonly string[]).includes(target.role)) {
    res.status(404).json({ error: 'Staff user not found' });
    return;
  }

  if (target.role === 'super_admin' && parsed.data.isActive === false) {
    const others = await countActiveSuperAdmins(targetId);
    if (others === 0) {
      res.status(400).json({ error: 'Cannot deactivate the last active super admin.' });
      return;
    }
  }

  if (
    target.id === authed.user.id &&
    target.role === 'super_admin' &&
    parsed.data.role &&
    parsed.data.role !== 'super_admin'
  ) {
    const others = await countActiveSuperAdmins(authed.user.id);
    if (others === 0) {
      res.status(400).json({
        error: 'Cannot change your own role while you are the only active super admin.',
      });
      return;
    }
  }

  if (parsed.data.role === 'super_admin' && authed.user.role !== 'super_admin') {
    res.status(403).json({ error: 'Only a super admin can assign the super admin role.' });
    return;
  }

  if (target.role === 'super_admin' && authed.user.role !== 'super_admin' && authed.user.id !== target.id) {
    res.status(403).json({ error: 'Cannot modify a super admin account.' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: targetId },
    data: {
      ...(parsed.data.role !== undefined ? { role: parsed.data.role } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone } : {}),
      ...(parsed.data.fullName
        ? {
            passengerProfile: {
              upsert: {
                create: { fullName: parsed.data.fullName },
                update: { fullName: parsed.data.fullName },
              },
            },
          }
        : {}),
    },
    include: { passengerProfile: true },
  });

  res.json({ staff: serializeStaffUser(user) });
});
