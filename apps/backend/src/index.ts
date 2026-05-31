import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './lib/env.js';
import { sharedAuthRouter } from './routes/sharedAuth.js';
import { mobileRouter } from './routes/mobile.js';
import { tripTrackingRouter } from './routes/tripTrackingMobile.js';
import { dashboardRouter } from './routes/dashboard.js';
import { webhooksRouter } from './routes/webhooks.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (env.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const qrLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false });
const webhookLimiter = rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false });

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post('/api/shared/auth/login', loginLimiter);
app.post('/api/shared/auth/register', registerLimiter);
app.get('/api/mobile/qr/verify/:code', qrLimiter);
app.post('/api/shared/webhooks/payment', webhookLimiter);
app.use('/api/shared/auth', sharedAuthRouter);
app.use('/api/shared/webhooks', webhooksRouter);
app.use('/api/mobile', tripTrackingRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(env.port, () => {
  console.log(`[safe-backend] listening on http://127.0.0.1:${env.port}`);
});
