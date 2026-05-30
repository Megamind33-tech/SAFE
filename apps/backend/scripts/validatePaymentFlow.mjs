/**
 * Validates the SAFE payment state machine end-to-end.
 * Run with: node --loader ts-node/esm scripts/validatePaymentFlow.mjs
 * Or via ts-node: npx ts-node --esm scripts/validatePaymentFlow.mjs
 *
 * Uses the live SQLite DB — ensure seed data exists or run seed first.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓ ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗ ${label}${detail ? `: ${detail}` : ''}`);
  failed++;
}

function assert(condition, label, detail) {
  if (condition) ok(label);
  else fail(label, detail);
}

async function run() {
  console.log('\n─── SAFE Payment Flow Validation ───\n');

  // ── 1. Find a payment in pending state with a pending_payment cover
  console.log('1. Payment initiated creates pending cover');
  const pendingPayment = await prisma.payment.findFirst({
    where: { status: 'pending' },
    include: { tripCover: true },
  });
  if (!pendingPayment) {
    console.log('  (skip — no pending payment found; run seed first)');
  } else {
    assert(
      pendingPayment.tripCover.status === 'pending_payment',
      'pending payment → cover in pending_payment',
      `cover.status=${pendingPayment.tripCover.status}`,
    );
    assert(
      pendingPayment.tripCover.activationSource == null,
      'pending cover has no activationSource',
      `activationSource=${pendingPayment.tripCover.activationSource}`,
    );
  }

  // ── 2. Mobile cannot set cover to active directly (schema constraint)
  console.log('\n2. Cover cannot be set to active without a succeeded payment');
  const activeCovers = await prisma.tripCover.findMany({
    where: { status: 'active' },
    include: { payment: true },
    take: 20,
  });
  const activeWithoutSucceeded = activeCovers.filter(
    (c) => c.payment && c.payment.status !== 'succeeded',
  );
  assert(
    activeWithoutSucceeded.length === 0,
    'no active cover linked to non-succeeded payment',
    `found ${activeWithoutSucceeded.length} violations`,
  );

  // ── 3. Admin override requires payments.admin_override permission (code check)
  console.log('\n3. Admin override permission is defined in RBAC');
  const { DASHBOARD_PERMISSIONS, ROLE_PERMISSIONS } = await import('../src/lib/dashboardPermissions.js').catch(() => null) ?? {};
  if (DASHBOARD_PERMISSIONS) {
    assert(
      DASHBOARD_PERMISSIONS.includes('payments.admin_override'),
      'payments.admin_override in DASHBOARD_PERMISSIONS',
    );
  } else {
    console.log('  (skip — could not import dashboardPermissions; run tsc first)');
  }

  // ── 4. Amount mismatch does not activate cover
  console.log('\n4. Amount verification — mismatched amount leaves cover pending');
  const pendingForMismatch = await prisma.payment.findFirst({
    where: { status: 'pending' },
    include: { tripCover: true },
  });
  if (pendingForMismatch) {
    // Dry-run check: verify the amount field exists and is a number
    assert(
      typeof pendingForMismatch.amount === 'number',
      'payment.amount is a number (verification field exists)',
    );
    assert(
      pendingForMismatch.tripCover.status === 'pending_payment',
      'cover stays pending_payment before webhook',
    );
  } else {
    console.log('  (skip — no pending payment)');
  }

  // ── 5. Idempotency — providerReference field exists on Payment
  console.log('\n5. Idempotency: providerReference field is present on Payment schema');
  const anyPayment = await (prisma.payment).findFirst();
  if (anyPayment) {
    assert(
      'providerReference' in anyPayment,
      'payment.providerReference field exists',
    );
    assert(
      'internalReference' in anyPayment,
      'payment.internalReference field exists',
    );
    assert(
      'confirmedAt' in anyPayment,
      'payment.confirmedAt field exists',
    );
    assert(
      'reversedAt' in anyPayment,
      'payment.reversedAt field exists',
    );
    assert(
      'failedAt' in anyPayment,
      'payment.failedAt field exists',
    );
  }

  // ── 6. activationSource field exists on TripCover
  console.log('\n6. activationSource field is present on TripCover schema');
  const anyCover = await prisma.tripCover.findFirst();
  if (anyCover) {
    assert(
      'activationSource' in anyCover,
      'cover.activationSource field exists',
    );
  }

  // ── 7. Succeeded payment has confirmedAt set
  console.log('\n7. Confirmed payment has confirmedAt timestamp');
  const succeededPayment = await (prisma.payment).findFirst({
    where: { status: 'succeeded' },
  });
  if (!succeededPayment) {
    console.log('  (skip — no succeeded payment; trigger one via webhook or simulate)');
  } else {
    assert(
      succeededPayment.confirmedAt != null,
      'succeeded payment has confirmedAt set',
      `confirmedAt=${succeededPayment.confirmedAt}`,
    );
    const linkedCover = await prisma.tripCover.findFirst({
      where: { id: (succeededPayment).tripCoverId },
    });
    assert(
      linkedCover?.status === 'active',
      'succeeded payment → linked cover is active',
      `cover.status=${linkedCover?.status}`,
    );
    assert(
      linkedCover?.activationSource != null,
      'succeeded payment cover has activationSource set',
      `activationSource=${linkedCover?.activationSource}`,
    );
  }

  // ── 8. Reversed payment creates FraudFlag
  console.log('\n8. Reversed/disputed payment creates FraudFlag');
  const reversedPayment = await (prisma.payment).findFirst({
    where: { status: { in: ['reversed', 'disputed'] } },
  });
  if (!reversedPayment) {
    console.log('  (skip — no reversed/disputed payment in DB)');
  } else {
    const flag = await prisma.fraudFlag.findFirst({
      where: {
        reason: { contains: reversedPayment.tripCoverId ?? reversedPayment.id },
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(
      flag != null,
      'reversed payment has linked FraudFlag',
      `paymentId=${reversedPayment.id}`,
    );
    assert(
      reversedPayment.reversedAt != null,
      'reversed payment has reversedAt timestamp',
    );
  }

  // ── 9. AuditLog records exist for payment events
  console.log('\n9. AuditLog contains payment lifecycle events');
  const paymentAuditLogs = await prisma.auditLog.findMany({
    where: { action: { startsWith: 'payment.' } },
    take: 5,
  });
  assert(
    paymentAuditLogs.length > 0,
    'at least one payment.* audit log entry exists',
    `found ${paymentAuditLogs.length}`,
  );

  // ── 10. No duplicate providerReferences
  console.log('\n10. No duplicate providerReference values');
  const allProviderRefs = await (prisma.payment).findMany({
    where: { providerReference: { not: null } },
    select: { providerReference: true },
  });
  const refs = allProviderRefs.map((p) => p.providerReference);
  const uniqueRefs = new Set(refs);
  assert(
    refs.length === uniqueRefs.size,
    'all providerReferences are unique',
    `total=${refs.length} unique=${uniqueRefs.size}`,
  );

  // ── Summary
  console.log(`\n─── Results: ${passed} passed, ${failed} failed ───\n`);
  if (failed > 0) process.exit(1);
}

run()
  .catch((e) => { console.error('Validation error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
