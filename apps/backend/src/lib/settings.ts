import type { User } from '@prisma/client';
import { prisma } from './prisma.js';
import { maskPhoneNumber } from './paymentMethods.js';
import { env } from './env.js';

export function getSettingsConfigPayload() {
  const termsUrl = env.termsUrl?.trim() || null;
  const privacyUrl = env.privacyUrl?.trim() || null;
  const claimsPolicyUrl = env.claimsPolicyUrl?.trim() || null;

  return {
    legalLinks: {
      terms: termsUrl,
      privacy: privacyUrl,
      claimsPolicy: claimsPolicyUrl,
    },
    supportEmail: env.supportEmail?.trim() || null,
    appEnv: env.appEnv,
    appVersion: env.appVersion,
    languages: [{ code: 'en', label: 'English' }],
    currency: { code: 'ZMW', label: 'Zambian Kwacha (ZMW)' },
    capabilities: {
      accountEdit: true,
      passwordChange: false,
      dataExport: env.dataExportEnabled,
      accountDeletion: env.accountDeletionEnabled,
      multipleLanguages: false,
      multiCurrency: false,
    },
  };
}

export async function serializeAccountDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { passengerProfile: true },
  });

  if (!user) {
    return null;
  }

  return serializeAccountFromUser(user);
}

export function serializeAccountFromUser(
  user: User & { passengerProfile: { fullName: string | null } | null }
) {
  const phone = user.phone ?? null;
  return {
    id: user.id,
    fullName: user.passengerProfile?.fullName ?? null,
    email: user.email ?? null,
    phone,
    maskedPhone: phone ? maskPhoneNumber(phone) : null,
    createdAt: user.createdAt.toISOString(),
    accountEditable: true,
  };
}
