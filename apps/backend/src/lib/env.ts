import dotenv from 'dotenv';

dotenv.config();

function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function appEnvFromNode() {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const explicit = process.env.SAFE_APP_ENV?.trim().toLowerCase();
  if (explicit === 'production' || explicit === 'staging' || explicit === 'local') {
    return explicit;
  }
  if (nodeEnv === 'production') return 'production';
  return 'local';
}

const appEnv = appEnvFromNode();
const isProduction = appEnv === 'production';

if (isProduction && process.env.SAFE_PAYMENT_SIMULATE_SUCCESS === 'true') {
  console.error(
    '[safe-backend] SAFE_PAYMENT_SIMULATE_SUCCESS=true is forbidden in production. Forcing false.',
  );
}

if (isProduction && (process.env.JWT_SECRET ?? 'dev-secret-change-me') === 'dev-secret-change-me') {
  throw new Error('[safe-backend] JWT_SECRET must be set to a strong secret in production. Refusing to start.');
}

export const env = {
  port: Number.parseInt(process.env.PORT ?? '8080', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  webhookSecret: process.env.SAFE_WEBHOOK_SECRET ?? '',
  corsOrigins: splitCsv(process.env.CORS_ORIGINS).length
    ? splitCsv(process.env.CORS_ORIGINS)
    : ['http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  termsUrl: process.env.SAFE_TERMS_URL,
  privacyUrl: process.env.SAFE_PRIVACY_URL,
  claimsPolicyUrl: process.env.SAFE_CLAIMS_POLICY_URL,
  supportPhone: process.env.SAFE_SUPPORT_PHONE?.trim() || null,
  supportEmail: process.env.SAFE_SUPPORT_EMAIL?.trim() || null,
  emergencyPhone: process.env.SAFE_EMERGENCY_PHONE?.trim() || null,
  supportHours: process.env.SAFE_SUPPORT_HOURS?.trim() || null,
  claimsGuideVersion: process.env.SAFE_CLAIMS_GUIDE_VERSION?.trim() || '1',
  appEnv,
  isProduction,
  appVersion: process.env.SAFE_APP_VERSION ?? '1.0.0',
  dataExportEnabled: process.env.SAFE_DATA_EXPORT_ENABLED === 'true',
  accountDeletionEnabled: process.env.SAFE_ACCOUNT_DELETION_ENABLED === 'true',
  paymentGatewayEnabled: process.env.SAFE_PAYMENT_GATEWAY_ENABLED === 'true',
  paymentSimulateSuccess: isProduction
    ? false
    : process.env.SAFE_PAYMENT_SIMULATE_SUCCESS === 'true',
  allowDevVehicleAutoCreate:
    !isProduction && process.env.SAFE_ALLOW_DEV_VEHICLE_AUTO_CREATE === 'true',
  cardPaymentsEnabled: process.env.SAFE_CARD_PAYMENTS_ENABLED === 'true',
  allowCoverStacking: process.env.SAFE_ALLOW_COVER_STACKING === 'true',
  allowCoverExtension: process.env.SAFE_ALLOW_COVER_EXTENSION === 'true',
  claimsUploadEnabled: process.env.SAFE_CLAIMS_UPLOAD_ENABLED === 'true',
  claimWindowHours: Number.parseInt(process.env.SAFE_CLAIM_WINDOW_HOURS ?? '168', 10),
  notificationSmsEnabled: process.env.SAFE_NOTIFICATION_SMS_ENABLED === 'true',
  notificationEmailEnabled: process.env.SAFE_NOTIFICATION_EMAIL_ENABLED === 'true',
  qrPublicBaseUrl: process.env.SAFE_QR_PUBLIC_BASE_URL?.trim() || 'https://safe.co.zm',
};
