import type { NotificationPreference } from '@prisma/client';
import { env } from './env.js';

export const PREFERENCE_KEYS = [
  'coverExpiryReminders',
  'claimStatusUpdates',
  'paymentUpdates',
  'safetyEmergencyAlerts',
  'coverPurchaseConfirmations',
  'tripTimerAlerts',
  'savedPolicyUpdates',
  'trustedContactChanges',
  'emergencyContactAlerts',
  'productUpdates',
  'offersPromotions',
  'pushEnabled',
  'smsEnabled',
  'emailEnabled',
  'quietHoursEnabled',
] as const;

export type PreferenceKey = (typeof PREFERENCE_KEYS)[number];

export function defaultNotificationPreferences() {
  return {
    coverExpiryReminders: true,
    claimStatusUpdates: true,
    paymentUpdates: true,
    safetyEmergencyAlerts: true,
    coverPurchaseConfirmations: true,
    tripTimerAlerts: true,
    savedPolicyUpdates: true,
    trustedContactChanges: true,
    emergencyContactAlerts: false,
    productUpdates: false,
    offersPromotions: false,
    pushEnabled: false,
    smsEnabled: false,
    emailEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: null as string | null,
    quietHoursEnd: null as string | null,
  };
}

export function getChannelsSupported() {
  return {
    push: true,
    sms: env.notificationSmsEnabled,
    email: env.notificationEmailEnabled,
  };
}

export function serializeNotificationPreferences(pref: NotificationPreference) {
  return {
    id: pref.id,
    userId: pref.userId,
    coverExpiryReminders: pref.coverExpiryReminders,
    claimStatusUpdates: pref.claimStatusUpdates,
    paymentUpdates: pref.paymentUpdates,
    safetyEmergencyAlerts: pref.safetyEmergencyAlerts,
    coverPurchaseConfirmations: pref.coverPurchaseConfirmations,
    tripTimerAlerts: pref.tripTimerAlerts,
    savedPolicyUpdates: pref.savedPolicyUpdates,
    trustedContactChanges: pref.trustedContactChanges,
    emergencyContactAlerts: pref.emergencyContactAlerts,
    productUpdates: pref.productUpdates,
    offersPromotions: pref.offersPromotions,
    pushEnabled: pref.pushEnabled,
    smsEnabled: pref.smsEnabled,
    emailEnabled: pref.emailEnabled,
    quietHoursEnabled: pref.quietHoursEnabled,
    quietHoursStart: pref.quietHoursStart,
    quietHoursEnd: pref.quietHoursEnd,
    createdAt: pref.createdAt.toISOString(),
    updatedAt: pref.updatedAt.toISOString(),
    channelsSupported: getChannelsSupported(),
  };
}

export function pickPreferenceUpdates(body: Record<string, unknown>) {
  const updates: Partial<Record<PreferenceKey, boolean>> = {};
  for (const key of PREFERENCE_KEYS) {
    if (typeof body[key] === 'boolean') {
      updates[key] = body[key];
    }
  }
  return updates;
}
