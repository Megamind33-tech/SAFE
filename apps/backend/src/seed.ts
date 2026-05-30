import { prisma } from './lib/prisma.js';
import { hashPassword } from './lib/auth.js';

const MATERO_TOWN_POLYLINE = JSON.stringify([
  { lat: -15.3745, lng: 28.278 },
  { lat: -15.382, lng: 28.2795 },
  { lat: -15.395, lng: 28.281 },
  { lat: -15.408, lng: 28.2818 },
  { lat: -15.4164, lng: 28.2822 },
]);

function claimRef(d: Date) {
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `SAFE-CLM-${ymd}-SEED`;
}

async function main() {
  // ── Admin user ──────────────────────────────────────────────────────────
  const adminEmail = 'admin@safe.local';
  const existingAdmin = await prisma.user.findFirst({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        phone: '+260000000000',
        passwordHash: await hashPassword('admin1234'),
        role: 'super_admin',
      },
    });
  }

  // ── Transport partner ────────────────────────────────────────────────────
  const partner = await prisma.transportPartner.upsert({
    where: { id: 'partner-lusaka-coop' },
    create: { id: 'partner-lusaka-coop', name: 'Lusaka Minibus Co-op' },
    update: { name: 'Lusaka Minibus Co-op' },
  });

  // ── Route ────────────────────────────────────────────────────────────────
  const route = await prisma.route.upsert({
    where: { id: 'route-matero-town' },
    create: {
      id: 'route-matero-town',
      origin: 'Matero',
      destination: 'Town',
      originLat: -15.3745,
      originLng: 28.278,
      destinationLat: -15.4164,
      destinationLng: 28.2822,
      polyline: MATERO_TOWN_POLYLINE,
    },
    update: {
      originLat: -15.3745,
      originLng: 28.278,
      destinationLat: -15.4164,
      destinationLng: 28.2822,
      polyline: MATERO_TOWN_POLYLINE,
    },
  });

  // ── Vehicle (active) ──────────────────────────────────────────────────────
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: 'LSK 2481' },
    create: {
      plateNumber: 'LSK 2481',
      busId: 'LSK-2481',
      routeId: route.id,
      transportPartnerId: partner.id,
      lastLat: -15.395,
      lastLng: 28.281,
      lastHeading: 185,
      locationAt: new Date(),
    },
    update: {
      busId: 'LSK-2481',
      routeId: route.id,
      transportPartnerId: partner.id,
      lastLat: -15.395,
      lastLng: 28.281,
      lastHeading: 185,
      locationAt: new Date(),
    },
  });

  // ── Vehicle (suspended — for suspended-state demo) ────────────────────────
  await prisma.vehicle.upsert({
    where: { plateNumber: 'LSK 9999' },
    create: {
      plateNumber: 'LSK 9999',
      busId: 'LSK-9999',
      routeId: route.id,
      transportPartnerId: partner.id,
      isSuspended: true,
    },
    update: { isSuspended: true },
  });

  // ── QR codes for main vehicle ─────────────────────────────────────────────
  await prisma.qRCode.upsert({
    where: { code: 'SAFE-LSK-8KJ29X' },
    create: {
      code: 'SAFE-LSK-8KJ29X',
      type: 'vehicle',
      targetId: vehicle.id,
      vehicleId: vehicle.id,
      partnerId: partner.id,
      status: 'active',
      isActive: true,
    },
    update: {
      vehicleId: vehicle.id,
      partnerId: partner.id,
      targetId: vehicle.id,
      status: 'active',
      isActive: true,
    },
  });

  await prisma.qRCode.upsert({
    where: { code: 'SAFE-LSK-2481' },
    create: {
      code: 'SAFE-LSK-2481',
      type: 'vehicle',
      targetId: vehicle.id,
      vehicleId: vehicle.id,
      partnerId: partner.id,
      status: 'active',
      isActive: true,
    },
    update: {
      vehicleId: vehicle.id,
      partnerId: partner.id,
      targetId: vehicle.id,
      status: 'active',
      isActive: true,
    },
  });

  if (process.env.SAFE_SEED_DASHBOARD_STAFF === 'true') {
    const { execSync } = await import('node:child_process');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');
    const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    execSync('npx tsx scripts/seedDashboardStaff.mjs', { cwd: backendRoot, stdio: 'inherit' });
  }

  // ── Passenger 1 — active cover + live trip ────────────────────────────────
  const pass1Email = 'grace@safe.local';
  let pass1 = await prisma.user.findFirst({ where: { email: pass1Email } });
  if (!pass1) {
    pass1 = await prisma.user.create({
      data: {
        email: pass1Email,
        phone: '+260971000001',
        passwordHash: await hashPassword('pass1234'),
        role: 'passenger',
        passengerProfile: { create: { fullName: 'Grace Mwanza' } },
      },
    });
  }

  // Active cover for passenger 1
  const now = new Date();
  const coverEnd = new Date(now.getTime() + 8 * 60 * 60 * 1000); // expires in 8 h
  let activeCover = await prisma.tripCover.findFirst({
    where: { passengerUserId: pass1.id, status: 'active' },
  });
  if (!activeCover) {
    activeCover = await prisma.tripCover.create({
      data: {
        passengerUserId: pass1.id,
        vehicleId: vehicle.id,
        routeId: route.id,
        plan: 'plus',
        status: 'active',
        amount: 15,
        currency: 'ZMW',
        startedAt: now,
        endsAt: coverEnd,
        payment: {
          create: {
            method: 'mobile_money',
            status: 'succeeded',
            amount: 15,
            currency: 'ZMW',
            reference: `PAY-SEED-GRACE-${Date.now()}`,
          },
        },
      },
    });
  }

  // Active trip tracking for passenger 1
  const existingTracking = await prisma.tripTracking.findFirst({
    where: { tripCoverId: activeCover.id },
  });
  if (!existingTracking) {
    await prisma.tripTracking.create({
      data: {
        tripCoverId: activeCover.id,
        status: 'active',
        startLat: -15.3745,
        startLng: 28.278,
        startLabel: 'Matero',
        currentLat: -15.395,
        currentLng: 28.281,
        currentRecordedAt: new Date(now.getTime() - 60 * 1000), // 1 min ago → live on first load
        endLat: -15.4164,
        endLng: 28.2822,
        endLabel: 'Town',
      },
    });
  }

  // ── Passenger 2 — completed cover + submitted claim ───────────────────────
  const pass2Email = 'bwalya@safe.local';
  let pass2 = await prisma.user.findFirst({ where: { email: pass2Email } });
  if (!pass2) {
    pass2 = await prisma.user.create({
      data: {
        email: pass2Email,
        phone: '+260971000002',
        passwordHash: await hashPassword('pass1234'),
        role: 'passenger',
        passengerProfile: { create: { fullName: 'Bwalya Tembo' } },
      },
    });
  }

  // Expired cover for passenger 2 (cover ended 2 days ago)
  const pastStart = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  let expiredCover = await prisma.tripCover.findFirst({
    where: { passengerUserId: pass2.id },
  });
  if (!expiredCover) {
    expiredCover = await prisma.tripCover.create({
      data: {
        passengerUserId: pass2.id,
        vehicleId: vehicle.id,
        routeId: route.id,
        plan: 'basic',
        status: 'expired',
        amount: 8,
        currency: 'ZMW',
        startedAt: pastStart,
        endsAt: pastEnd,
        payment: {
          create: {
            method: 'mobile_money',
            status: 'succeeded',
            amount: 8,
            currency: 'ZMW',
            reference: `PAY-SEED-BWALYA-${Date.now()}`,
          },
        },
      },
    });
  }

  // Submitted claim for passenger 2 (under review)
  const claimDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const ref1 = claimRef(claimDate) + '1';
  const existingClaim1 = await prisma.claim.findFirst({
    where: { passengerUserId: pass2.id, status: 'under_review' },
  });
  if (!existingClaim1) {
    await prisma.claim.create({
      data: {
        reference: ref1,
        passengerUserId: pass2.id,
        tripCoverId: expiredCover.id,
        status: 'under_review',
        description: 'Minibus rear-ended at Kamwala. I was seated in the middle row and sustained whiplash.',
        incidentAt: new Date(pastEnd.getTime() - 2 * 60 * 60 * 1000),
        location: 'Kamwala, Lusaka',
        injured: true,
        vehicleInvolved: true,
        policeReference: 'ZPS/LUS/2026/001',
        timeline: {
          create: [
            { status: 'submitted', title: 'Claim submitted', createdAt: claimDate },
            { status: 'under_review', title: 'Under review', detail: 'Claims officer reviewing documents.', createdAt: new Date(claimDate.getTime() + 60 * 60 * 1000) },
          ],
        },
      },
    });
  }

  // ── Passenger 3 — needs_action claim ─────────────────────────────────────
  const pass3Email = 'mulenga@safe.local';
  let pass3 = await prisma.user.findFirst({ where: { email: pass3Email } });
  if (!pass3) {
    pass3 = await prisma.user.create({
      data: {
        email: pass3Email,
        phone: '+260971000003',
        passwordHash: await hashPassword('pass1234'),
        role: 'passenger',
        passengerProfile: { create: { fullName: 'Mulenga Chitalu' } },
      },
    });
  }

  const pastStart3 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastEnd3 = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  let expiredCover3 = await prisma.tripCover.findFirst({
    where: { passengerUserId: pass3.id },
  });
  if (!expiredCover3) {
    expiredCover3 = await prisma.tripCover.create({
      data: {
        passengerUserId: pass3.id,
        vehicleId: vehicle.id,
        routeId: route.id,
        plan: 'premium',
        status: 'expired',
        amount: 25,
        currency: 'ZMW',
        startedAt: pastStart3,
        endsAt: pastEnd3,
        payment: {
          create: {
            method: 'mobile_money',
            status: 'succeeded',
            amount: 25,
            currency: 'ZMW',
            reference: `PAY-SEED-MULENGA-${Date.now()}`,
          },
        },
      },
    });
  }

  const claimDate3 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const ref3 = claimRef(claimDate3) + '3';
  const existingClaim3 = await prisma.claim.findFirst({
    where: { passengerUserId: pass3.id, status: 'needs_action' },
  });
  if (!existingClaim3) {
    await prisma.claim.create({
      data: {
        reference: ref3,
        passengerUserId: pass3.id,
        tripCoverId: expiredCover3.id,
        status: 'needs_action',
        description: 'Slipped while boarding, injured my knee.',
        incidentAt: new Date(pastEnd3.getTime() - 1 * 60 * 60 * 1000),
        location: 'Matero Terminus',
        injured: true,
        vehicleInvolved: false,
        timeline: {
          create: [
            { status: 'submitted', title: 'Claim submitted', createdAt: claimDate3 },
            { status: 'under_review', title: 'Under review', createdAt: new Date(claimDate3.getTime() + 30 * 60 * 1000) },
            { status: 'needs_action', title: 'Action required', detail: 'Please upload medical certificate or GP note.', createdAt: new Date(claimDate3.getTime() + 2 * 60 * 60 * 1000) },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed complete');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
