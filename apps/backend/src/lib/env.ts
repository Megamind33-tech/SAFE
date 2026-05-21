import dotenv from 'dotenv';

dotenv.config();

function splitCsv(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  port: Number.parseInt(process.env.PORT ?? '8080', 10),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  corsOrigins: splitCsv(process.env.CORS_ORIGINS).length
    ? splitCsv(process.env.CORS_ORIGINS)
    : ['http://127.0.0.1:5173', 'http://127.0.0.1:5174'],
};

