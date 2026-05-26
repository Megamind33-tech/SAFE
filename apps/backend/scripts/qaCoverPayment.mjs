import { prisma } from '../src/lib/prisma.js';
import { normalizeZambianPhone } from '../src/lib/paymentMethods.js';

const [command, arg] = process.argv.slice(2);

async function findUserByPhone(phone) {
  const normalized = normalizeZambianPhone(phone);
  if (!normalized) throw new Error(`Invalid phone: ${phone}`);
  const user = await prisma.user.findFirst({ where: { phone: normalized } });
  if (!user) throw new Error(`User not found for ${phone}`);
  return user;
}

async function seedExpiredCover(phone) {
  const user = await findUserByPhone(phone);
  const endedAt = new Date(Date.now() - 60 * 60 * 1000);
  const startedAt = new Date(endedAt.getTime() - 30 * 60 * 1000);

  await prisma.tripCover.deleteMany({
    where: { passengerUserId: user.id },
  });

  await prisma.tripCover.create({
    data: {
      passengerUserId: user.id,
      plan: 'plus',
      status: 'expired',
      amount: 5,
      currency: 'ZMW',
      startedAt,
      endsAt: endedAt,
      payment: {
        create: {
          amount: 5,
          currency: 'ZMW',
          method: 'airtel_money',
          status: 'succeeded',
        },
      },
    },
  });
  console.log('ok');
}

async function main() {
  if (!arg) {
    throw new Error(
      'Usage: qaCoverPayment.mjs <succeed|fail|seed-expired|clear-covers> <paymentId|phone>',
    );
  }

  if (command === 'clear-covers') {
    const user = await findUserByPhone(arg);
    await prisma.tripCover.deleteMany({ where: { passengerUserId: user.id } });
    console.log('ok');
    return;
  }

  if (command === 'seed-expired') {
    await seedExpiredCover(arg);
    return;
  }

  const paymentId = arg;
  if (command === 'succeed') {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'succeeded' } });
    console.log('ok');
    return;
  }
  if (command === 'fail') {
    await prisma.payment.update({ where: { id: paymentId }, data: { status: 'failed' } });
    console.log('ok');
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
