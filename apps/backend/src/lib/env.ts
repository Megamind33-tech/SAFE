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

export const env = {
  port: Number.parseInt(process.env.PORT ?? '8080', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigins: splitCsv(process.env.CORS_ORIGINS).length
    ? splitCsv(process.env.CORS_ORIGINS)
    : ['http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
  termsUrl: process.env.SAFE_TERMS_URL,
  privacyUrl: process.env.SAFE_PRIVACY_URL,
  claimsPolicyUrl: process.env.SAFE_CLAIMS_POLICY_URL,
  supportEmail: process.env.SAFE_SUPPORT_EMAIL,
  appEnv: appEnvFromNode(),
  appVersion: process.env.SAFE_APP_VERSION ?? '1.0.0',
  dataExportEnabled: process.env.SAFE_DATA_EXPORT_ENABLED === 'true',
  accountDeletionEnabled: process.env.SAFE_ACCOUNT_DELETION_ENABLED === 'true',
  paymentGatewayEnabled: process.env.SAFE_PAYMENT_GATEWAY_ENABLED === 'true',
  paymentSimulateSuccess: process.env.SAFE_PAYMENT_SIMULATE_SUCCESS === 'true',
  cardPaymentsEnabled: process.env.SAFE_CARD_PAYMENTS_ENABLED === 'true',
  allowCoverStacking: process.env.SAFE_ALLOW_COVER_STACKING === 'true',
  allowCoverExtension: process.env.SAFE_ALLOW_COVER_EXTENSION === 'true',
};

