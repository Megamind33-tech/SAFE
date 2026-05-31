import { prisma } from './prisma.js';

export function generateInternalReference(createdAt: Date = new Date()): string {
  const ymd = createdAt.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SAFE-PAY-${ymd}-${random}`;
}

export async function ensureUniquePaymentReference(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = generateInternalReference();
    const existing = await prisma.payment.findUnique({ where: { internalReference: ref } });
    if (!existing) return ref;
  }
  throw new Error('Failed to generate a unique payment reference.');
}
