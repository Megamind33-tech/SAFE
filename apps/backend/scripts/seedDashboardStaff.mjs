/**
 * QA-only dashboard staff accounts (local / CI smoke).
 * Set SAFE_SEED_DASHBOARD_STAFF=true before seed, or run directly:
 *   npx tsx apps/backend/scripts/seedDashboardStaff.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const PASS = 'staffqa123';

const STAFF = [
  { email: 'superadmin@safe.local', role: 'super_admin', fullName: 'QA Super Admin' },
  { email: 'claims@safe.local', role: 'claims_officer', fullName: 'QA Claims Officer' },
  { email: 'support@safe.local', role: 'support_agent', fullName: 'QA Support Agent' },
  { email: 'finance@safe.local', role: 'finance_officer', fullName: 'QA Finance Officer' },
  { email: 'fleet@safe.local', role: 'fleet_manager', fullName: 'QA Fleet Manager' },
  { email: 'auditor@safe.local', role: 'auditor', fullName: 'QA Auditor' },
];

async function main() {
  const hash = await bcrypt.hash(PASS, 10);
  for (const row of STAFF) {
    const existing = await prisma.user.findFirst({ where: { email: row.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: row.role, isActive: true, passwordHash: hash },
      });
      console.log('updated', row.email, row.role);
      continue;
    }
    await prisma.user.create({
      data: {
        email: row.email,
        passwordHash: hash,
        role: row.role,
        isActive: true,
        passengerProfile: { create: { fullName: row.fullName } },
      },
    });
    console.log('created', row.email, row.role);
  }
  console.log('QA dashboard staff ready. Password:', PASS);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
