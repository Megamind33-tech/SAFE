import { prisma } from '../src/lib/prisma.js';

const [command, phone] = process.argv.slice(2);

async function main() {
  if (!phone) {
    throw new Error('Usage: qaHomeStates.mjs <succeed-payment|expire-latest> <phone>');
  }

  const user = await prisma.user.findFirst({ where: { phone } });
  if (!user) throw new Error(`User not found: ${phone}`);

  const cover = await prisma.tripCover.findFirst({
    where: { passengerUserId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { payment: true },
  });

  if (!cover) throw new Error('No cover for user');

  if (command === 'succeed-payment') {
    if (!cover.payment) throw new Error('No payment on cover');
    await prisma.payment.update({
      where: { id: cover.payment.id },
      data: { status: 'succeeded' },
    });
    await prisma.tripCover.update({
      where: { id: cover.id },
      data: { status: 'active' },
    });
    console.log('payment_succeeded', cover.id);
    return;
  }

  if (command === 'expire-latest') {
    await prisma.tripCover.update({
      where: { id: cover.id },
      data: { status: 'expired', endsAt: new Date(Date.now() - 60_000) },
    });
    console.log('cover_expired', cover.id);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
