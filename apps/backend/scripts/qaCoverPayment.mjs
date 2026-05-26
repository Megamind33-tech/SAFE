import { prisma } from '../src/lib/prisma.js';

const [command, paymentId] = process.argv.slice(2);

async function main() {
  if (!paymentId) {
    throw new Error('Usage: qaCoverPayment.mjs <succeed|fail> <paymentId>');
  }
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
