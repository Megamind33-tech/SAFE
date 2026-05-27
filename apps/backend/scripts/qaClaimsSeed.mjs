/**
 * Seed claims QA data for capture-claims.mjs
 * Usage: node scripts/qaClaimsSeed.mjs [empty|list|submitted|needs_action|duplicate]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const mode = process.argv[2] || 'list';

const QA_PHONE = '+260977123457';
const QA_PASSWORD_HASH = '$2a$10$XQn8Y5zqJ5zqJ5zqJ5zqJ.uK8zqJ5zqJ5zqJ5zqJ5zqJ5zqJ5zq'; // unused if user exists

async function ensureQaUser() {
  let user = await prisma.user.findFirst({ where: { phone: QA_PHONE } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: QA_PHONE,
        passwordHash: QA_PASSWORD_HASH,
        role: 'passenger',
        passengerProfile: { create: { fullName: 'Claims QA User' } },
      },
    });
  }
  return user;
}

async function ensureSucceededCover(userId) {
  const now = new Date();
  const startedAt = new Date(now);
  startedAt.setHours(startedAt.getHours() - 3);
  const endsAt = new Date(now);
  endsAt.setHours(endsAt.getHours() + 4);

  let cover = await prisma.tripCover.findFirst({
    where: { passengerUserId: userId },
    orderBy: { createdAt: 'desc' },
    include: { payment: true },
  });
  if (!cover || cover.payment?.status !== 'succeeded') {
    cover = await prisma.tripCover.create({
      data: {
        passengerUserId: userId,
        plan: 'Plus Cover',
        status: 'active',
        amount: 500,
        startedAt,
        endsAt,
        payment: {
          create: {
            method: 'airtel',
            status: 'succeeded',
            amount: 500,
          },
        },
      },
      include: { payment: true },
    });
  } else if (cover.startedAt > startedAt) {
    cover = await prisma.tripCover.update({
      where: { id: cover.id },
      data: { startedAt, endsAt },
      include: { payment: true },
    });
  }
  return cover;
}

function refStamp() {
  return `SAFE-CLM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function createClaim(userId, coverId, data) {
  return prisma.claim.create({
    data: {
      reference: refStamp(),
      tripCoverId: coverId,
      passengerUserId: userId,
      status: data.status,
      description: data.description,
      location: data.location,
      incidentAt: data.incidentAt,
      injured: data.injured ?? false,
      vehicleInvolved: data.vehicleInvolved ?? true,
      policeReference: data.policeReference ?? null,
      medicalReference: data.medicalReference ?? null,
      timeline: data.timeline?.length
        ? { create: data.timeline }
        : undefined,
    },
  });
}

async function clearClaims(userId) {
  await prisma.claim.deleteMany({ where: { passengerUserId: userId } });
}

async function main() {
  const user = await ensureQaUser();
  const cover = await ensureSucceededCover(user.id);

  if (mode === 'empty') {
    await clearClaims(user.id);
    console.log(JSON.stringify({ userId: user.id, phone: QA_PHONE, claims: 0 }));
    return;
  }

  if (mode === 'clear') {
    await clearClaims(user.id);
    console.log('cleared');
    return;
  }

  await clearClaims(user.id);

  const incidentAt = new Date();
  incidentAt.setHours(incidentAt.getHours() - 2);

  if (mode === 'submitted' || mode === 'list') {
    await createClaim(user.id, cover.id, {
      status: 'submitted',
      description: 'Minibus braked suddenly and I was injured during the trip.',
      location: 'Great East Road, Lusaka',
      incidentAt,
      timeline: [
        { status: 'submitted', title: 'Claim submitted', detail: 'SAFE has received your claim.' },
      ],
    });
  }

  if (mode === 'needs_action' || mode === 'list') {
    await createClaim(user.id, cover.id, {
      status: 'needs_action',
      description: 'Rear collision during evening commute with document follow-up required.',
      location: 'Cairo Road, Lusaka',
      incidentAt,
      timeline: [
        { status: 'submitted', title: 'Claim submitted' },
        { status: 'needs_action', title: 'Needs action', detail: 'Please upload additional documents.' },
      ],
    });
  }

  if (mode === 'duplicate') {
    const dupRef = 'POL-TEST-99001';
    await createClaim(user.id, cover.id, {
      status: 'rejected',
      description: 'First claim for duplicate detection testing scenario.',
      location: 'Kafue Road',
      incidentAt,
      policeReference: dupRef,
    });
    await createClaim(user.id, cover.id, {
      status: 'draft',
      description: 'Draft claim pending duplicate check with same police ref.',
      location: 'Kafue Road',
      incidentAt,
      policeReference: dupRef,
    });
  }

  const count = await prisma.claim.count({ where: { passengerUserId: user.id } });
  console.log(JSON.stringify({ userId: user.id, phone: QA_PHONE, coverId: cover.id, claims: count }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
