/**
 * Create staging admin from env and optionally disable default dev admin.
 *
 * Usage (staging database only):
 *   SAFE_ADMIN_EMAIL=ops@staging.example \
 *   SAFE_ADMIN_PASSWORD='strong-secret' \
 *   SAFE_DISABLE_DEFAULT_ADMIN=true \
 *   npm run create-staging-admin
 *
 * Does not overwrite existing user passwords. Local dev seed unchanged.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_EMAIL = 'admin@safe.local';
const email = process.env.SAFE_ADMIN_EMAIL?.trim();
const password = process.env.SAFE_ADMIN_PASSWORD;
const disableDefault = process.env.SAFE_DISABLE_DEFAULT_ADMIN === 'true';

async function hashPassword(raw) {
  return bcrypt.hash(raw, 10);
}

async function main() {
  if (!email || !password) {
    console.error('SAFE_ADMIN_EMAIL and SAFE_ADMIN_PASSWORD are required.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('SAFE_ADMIN_PASSWORD must be at least 10 characters.');
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log(JSON.stringify({ action: 'exists', email, role: existing.role, isActive: existing.isActive }));
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        phone: null,
        passwordHash: await hashPassword(password),
        role: 'super_admin',
        isActive: true,
      },
    });
    console.log(JSON.stringify({ action: 'created', email, userId: user.id, role: user.role }));
  }

  if (disableDefault) {
    const defaultAdmin = await prisma.user.findFirst({ where: { email: DEFAULT_ADMIN_EMAIL } });
    if (defaultAdmin?.isActive) {
      await prisma.user.update({
        where: { id: defaultAdmin.id },
        data: { isActive: false },
      });
      console.log(JSON.stringify({ action: 'disabled_default_admin', email: DEFAULT_ADMIN_EMAIL }));
    } else {
      console.log(JSON.stringify({ action: 'default_admin_already_inactive_or_missing', email: DEFAULT_ADMIN_EMAIL }));
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
