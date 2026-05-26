import { env } from './env.js';

export const SUPPORT_PROBLEM_TYPES = [
  'claim_issue',
  'payment_issue',
  'cover_issue',
  'app_bug',
  'safety_concern',
  'other',
] as const;

export type SupportProblemType = (typeof SUPPORT_PROBLEM_TYPES)[number];

export function getHelpSafetyConfig() {
  return {
    supportPhone: env.supportPhone,
    supportEmail: env.supportEmail,
    emergencyPhone: env.emergencyPhone,
    supportHours: env.supportHours,
    claimsGuideVersion: env.claimsGuideVersion,
    supportReportingEnabled: true,
  };
}

export function problemTypeLabel(type: string) {
  const labels: Record<string, string> = {
    claim_issue: 'Claim issue',
    payment_issue: 'Payment issue',
    cover_issue: 'Cover issue',
    app_bug: 'App bug',
    safety_concern: 'Safety concern',
    other: 'Other',
  };
  return labels[type] ?? type;
}
